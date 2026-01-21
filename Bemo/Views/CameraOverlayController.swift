import AppKit
import SwiftUI
import AVFoundation

// MARK: - Camera Overlay Controller

/// Manages a floating camera preview circle overlay
@MainActor
final class CameraOverlayController {
    private var panel: NSPanel?
    private let cameraService = CameraService.shared

    init() {}

    // MARK: - Public API

    /// Show camera overlay at specified position
    /// - Parameters:
    ///   - position: Corner position for the camera
    ///   - size: Size of the camera circle
    ///   - screenFrame: The screen bounds to position within
    func show(
        position: CameraPosition = .bottomRight,
        size: CameraSize = .medium,
        in screenFrame: CGRect
    ) async throws {
        // Start camera capture
        let previewLayer = try await cameraService.startCapture()

        // Calculate frame
        let frame = position.frame(in: screenFrame, size: size.dimension, margin: 20)

        // Create panel
        let newPanel = NSPanel(
            contentRect: frame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        newPanel.isFloatingPanel = true
        newPanel.level = .floating
        newPanel.isOpaque = false
        newPanel.backgroundColor = .clear
        newPanel.hasShadow = true
        newPanel.isMovableByWindowBackground = true
        newPanel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]
        newPanel.hidesOnDeactivate = false

        // Create SwiftUI view
        let overlayView = CameraOverlayView(previewLayer: previewLayer, size: size.dimension)
        let hostingView = NSHostingView(rootView: overlayView)
        hostingView.frame = CGRect(origin: .zero, size: frame.size)

        newPanel.contentView = hostingView

        // Animate in
        newPanel.alphaValue = 0
        newPanel.setFrame(frame.offsetBy(dx: 0, dy: -20), display: false)
        newPanel.orderFrontRegardless()

        panel = newPanel

        // Run animation synchronously (already on MainActor)
        NSAnimationContext.beginGrouping()
        NSAnimationContext.current.duration = 0.25
        NSAnimationContext.current.timingFunction = CAMediaTimingFunction(name: .easeOut)
        newPanel.animator().alphaValue = 1
        newPanel.animator().setFrame(frame, display: true)
        NSAnimationContext.endGrouping()
    }

    /// Hide camera overlay
    func hide() {
        guard let currentPanel = panel else { return }

        // Stop camera
        cameraService.stopCapture()

        panel = nil

        // Animate out and cleanup after delay
        NSAnimationContext.beginGrouping()
        NSAnimationContext.current.duration = 0.2
        NSAnimationContext.current.timingFunction = CAMediaTimingFunction(name: .easeIn)
        currentPanel.animator().alphaValue = 0
        currentPanel.animator().setFrame(
            currentPanel.frame.offsetBy(dx: 0, dy: -20),
            display: true
        )
        NSAnimationContext.endGrouping()

        // Cleanup after animation
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 250_000_000)
            currentPanel.orderOut(nil)
        }
    }

}
