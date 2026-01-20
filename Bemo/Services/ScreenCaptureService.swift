import ScreenCaptureKit
import AppKit

// MARK: - Screen Capture Service

/// Modern screen capture using ScreenCaptureKit (macOS 14+)
/// This properly handles permissions and doesn't interfere with window visibility
actor ScreenCaptureService {
    static let shared = ScreenCaptureService()

    private init() {}

    // MARK: - Permission Checking

    /// Check if we have screen recording permission
    func hasPermission() async -> Bool {
        do {
            // Attempting to get shareable content will fail if no permission
            _ = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            return true
        } catch {
            return false
        }
    }

    /// Request screen recording permission by triggering the system prompt
    func requestPermission() async -> Bool {
        // The only way to request permission is to try to use the API
        // This will trigger the system permission dialog
        do {
            _ = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            return true
        } catch {
            return false
        }
    }

    // MARK: - Screen Capture

    /// Capture a screenshot of a specific display
    /// - Parameters:
    ///   - display: The display to capture (nil = main display)
    ///   - excludingAppBundleID: Bundle ID to exclude from capture (e.g., our own app)
    /// - Returns: The captured CGImage
    func captureDisplay(
        _ display: SCDisplay? = nil,
        excludingAppBundleID: String? = nil
    ) async throws -> CGImage {
        // Get available content
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

        // Find the target display
        guard let targetDisplay = display ?? content.displays.first else {
            throw ScreenCaptureError.noDisplayFound
        }

        // Build list of apps to exclude (our own app)
        var excludedApps: [SCRunningApplication] = []
        if let bundleID = excludingAppBundleID {
            excludedApps = content.applications.filter { $0.bundleIdentifier == bundleID }
        }

        // Create content filter for the display, excluding our app
        let filter = SCContentFilter(
            display: targetDisplay,
            excludingApplications: excludedApps,
            exceptingWindows: []
        )

        // Configure capture settings
        let config = SCStreamConfiguration()
        config.width = targetDisplay.width * 2  // Retina
        config.height = targetDisplay.height * 2
        config.showsCursor = false
        config.captureResolution = .best
        config.colorSpaceName = CGColorSpace.sRGB

        // Capture the screenshot
        let image = try await SCScreenshotManager.captureImage(
            contentFilter: filter,
            configuration: config
        )

        return image
    }

    /// Capture all displays
    /// - Parameter excludingAppBundleID: Bundle ID to exclude from capture
    /// - Returns: Dictionary mapping display ID to captured CGImage
    func captureAllDisplays(
        excludingAppBundleID: String? = nil
    ) async throws -> [CGDirectDisplayID: CGImage] {
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

        var results: [CGDirectDisplayID: CGImage] = [:]

        // Build list of apps to exclude
        var excludedApps: [SCRunningApplication] = []
        if let bundleID = excludingAppBundleID {
            excludedApps = content.applications.filter { $0.bundleIdentifier == bundleID }
        }

        // Capture each display
        for scDisplay in content.displays {
            // Create filter for this display
            let filter = SCContentFilter(
                display: scDisplay,
                excludingApplications: excludedApps,
                exceptingWindows: []
            )

            // Configure capture
            let config = SCStreamConfiguration()
            config.width = scDisplay.width * 2
            config.height = scDisplay.height * 2
            config.showsCursor = false
            config.captureResolution = .best

            // Capture
            do {
                let image = try await SCScreenshotManager.captureImage(
                    contentFilter: filter,
                    configuration: config
                )
                results[scDisplay.displayID] = image
            } catch {
                // Continue with other displays if one fails
                print("Failed to capture display \(scDisplay.displayID): \(error)")
            }
        }

        guard !results.isEmpty else {
            throw ScreenCaptureError.capturesFailed
        }

        return results
    }
}

// MARK: - Errors

enum ScreenCaptureError: Error, LocalizedError {
    case noDisplayFound
    case permissionDenied
    case capturesFailed

    var errorDescription: String? {
        switch self {
        case .noDisplayFound:
            return "No display found to capture"
        case .permissionDenied:
            return "Screen Recording permission required. Please enable in System Settings > Privacy & Security > Screen Recording"
        case .capturesFailed:
            return "Failed to capture any displays"
        }
    }
}
