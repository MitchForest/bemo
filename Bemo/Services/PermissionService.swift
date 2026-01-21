import AppKit
import ScreenCaptureKit

/// Handles permission checking and requesting using standard macOS APIs
@MainActor
@Observable
final class PermissionService {
    static let shared = PermissionService()

    private(set) var screenRecordingGranted = false
    private(set) var accessibilityGranted = false

    private init() {
        refresh()
    }

    // MARK: - Refresh Status

    func refresh() {
        accessibilityGranted = AXIsProcessTrusted()

        // Screen recording is checked async
        Task {
            screenRecordingGranted = await checkScreenRecording()
        }
    }

    // MARK: - Screen Recording

    /// Check screen recording permission by attempting to use ScreenCaptureKit
    private func checkScreenRecording() async -> Bool {
        do {
            _ = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            return true
        } catch {
            return false
        }
    }

    /// Request screen recording permission - opens System Settings
    func requestScreenRecording() {
        // The modern way: just open System Settings to the correct pane
        // The system will prompt when SCShareableContent is first used
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
            NSWorkspace.shared.open(url)
        }
    }

    // MARK: - Accessibility

    /// Request accessibility permission - shows system prompt and opens Settings
    nonisolated func requestAccessibility() {
        // This triggers the system prompt dialog
        // Using the string directly to avoid concurrency warning with kAXTrustedCheckOptionPrompt
        let options = ["AXTrustedCheckOptionPrompt": true] as CFDictionary
        _ = AXIsProcessTrustedWithOptions(options)
    }

}
