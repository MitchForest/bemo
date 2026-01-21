import ScreenCaptureKit
import AppKit
import CoreGraphics

// MARK: - Screen Capture Service

/// Modern screen capture using ScreenCaptureKit (macOS 14+)
/// This properly handles permissions and doesn't interfere with window visibility
actor ScreenCaptureService {
    static let shared = ScreenCaptureService()

    private init() {}

    /// Capture all displays
    /// - Parameter excludingAppBundleID: Bundle ID to exclude from capture
    /// - Returns: Dictionary mapping display ID to captured CGImage
    func captureAllDisplays(
        excludingAppBundleID: String? = nil
    ) async throws -> [CGDirectDisplayID: CGImage] {
        let content = try await fetchShareableContent()

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
            config.width = scDisplay.width
            config.height = scDisplay.height
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
                if isScreenRecordingDenied() {
                    throw ScreenCaptureError.permissionDenied
                }
                // Continue with other displays if one fails
                print("Failed to capture display \(scDisplay.displayID): \(error)")
            }
        }

        guard !results.isEmpty else {
            throw ScreenCaptureError.capturesFailed
        }

        return results
    }

    /// Load shareable content for displays and windows
    nonisolated func fetchShareableContent() async throws -> SCShareableContent {
        do {
            return try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        } catch {
            if isScreenRecordingDenied() {
                throw ScreenCaptureError.permissionDenied
            }
            throw error
        }
    }

    nonisolated private func isScreenRecordingDenied() -> Bool {
        CGPreflightScreenCaptureAccess() == false
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
            return "Screen Recording permission required. " +
                "Please enable in System Settings > Privacy & Security > Screen Recording"
        case .capturesFailed:
            return "Failed to capture any displays"
        }
    }
}
