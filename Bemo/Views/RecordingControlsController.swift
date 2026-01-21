import AppKit
import SwiftUI

// MARK: - Recording Controls Controller

/// Manages the pre-recording toolbar panel (positioned above Dock, centered)
@MainActor
final class RecordingControlsController {
    private var panel: NSPanel?
    private var onStart: ((RecordingOptions) -> Void)?
    private var onCancel: (() -> Void)?
    private var onCameraToggled: ((Bool) -> Void)?

    init() {}

    // MARK: - Public API

    /// Show recording controls toolbar
    /// - Parameters:
    ///   - region: The selected recording region
    ///   - displayID: The display ID for the region
    ///   - screenFrame: The screen frame to position relative to
    ///   - onStart: Callback when user clicks Start Recording
    ///   - onCancel: Callback when user cancels
    ///   - onCameraToggled: Callback when camera is toggled (for live preview)
    func show(
        for region: CGRect,
        displayID: CGDirectDisplayID,
        screenFrame: CGRect,
        onStart: @escaping (RecordingOptions) -> Void,
        onCancel: @escaping () -> Void,
        onCameraToggled: @escaping (Bool) -> Void
    ) {
        self.onStart = onStart
        self.onCancel = onCancel
        self.onCameraToggled = onCameraToggled

        // Toolbar dimensions (horizontal, thin)
        let toolbarWidth: CGFloat = 400
        let toolbarHeight: CGFloat = 52

        // Get the visible frame (excludes Dock and menu bar)
        guard let screen = NSScreen.screens.first(where: {
            let id = $0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
            return id == displayID
        }) ?? NSScreen.main else { return }

        let visibleFrame = screen.visibleFrame

        // Position: centered horizontally, above the Dock (bottom of visible frame + margin)
        let toolbarX = visibleFrame.midX - toolbarWidth / 2
        let toolbarY = visibleFrame.minY + 20  // 20pt above Dock

        let toolbarFrame = CGRect(
            x: toolbarX,
            y: toolbarY,
            width: toolbarWidth,
            height: toolbarHeight
        )

        // Create panel
        let newPanel = NSPanel(
            contentRect: toolbarFrame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        newPanel.isFloatingPanel = true
        newPanel.level = .floating
        newPanel.isOpaque = false
        newPanel.backgroundColor = .clear
        newPanel.hasShadow = false  // View has its own shadow
        newPanel.hidesOnDeactivate = false
        newPanel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]

        // Create SwiftUI view
        let controlsView = RecordingControlsView(
            regionSize: region.size,
            onStart: { [weak self] options in
                self?.handleStart(options)
            },
            onCancel: { [weak self] in
                self?.handleCancel()
            },
            onCameraToggled: { [weak self] enabled in
                self?.onCameraToggled?(enabled)
            }
        )

        let hostingView = NSHostingView(rootView: controlsView)
        hostingView.frame = CGRect(origin: .zero, size: toolbarFrame.size)

        newPanel.contentView = hostingView

        // Animate in from bottom
        let startFrame = toolbarFrame.offsetBy(dx: 0, dy: -20)
        newPanel.alphaValue = 0
        newPanel.setFrame(startFrame, display: false)
        newPanel.orderFrontRegardless()

        panel = newPanel

        NSAnimationContext.beginGrouping()
        NSAnimationContext.current.duration = 0.25
        NSAnimationContext.current.timingFunction = CAMediaTimingFunction(name: .easeOut)
        newPanel.animator().alphaValue = 1
        newPanel.animator().setFrame(toolbarFrame, display: true)
        NSAnimationContext.endGrouping()
    }

    /// Dismiss the controls panel
    func dismiss() {
        guard let currentPanel = panel else { return }

        panel = nil
        onStart = nil
        onCancel = nil
        onCameraToggled = nil

        let endFrame = currentPanel.frame.offsetBy(dx: 0, dy: -20)

        NSAnimationContext.beginGrouping()
        NSAnimationContext.current.duration = 0.2
        NSAnimationContext.current.timingFunction = CAMediaTimingFunction(name: .easeIn)
        currentPanel.animator().alphaValue = 0
        currentPanel.animator().setFrame(endFrame, display: true)
        NSAnimationContext.endGrouping()

        // Cleanup after animation
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 250_000_000)
            currentPanel.orderOut(nil)
        }
    }

    // MARK: - Private

    private func handleStart(_ options: RecordingOptions) {
        let callback = onStart
        dismiss()
        callback?(options)
    }

    private func handleCancel() {
        let callback = onCancel
        dismiss()
        callback?()
    }

    /// Whether panel is currently visible
    var isVisible: Bool {
        panel != nil
    }
}
