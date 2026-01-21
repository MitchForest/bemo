import AppKit
import SwiftUI

// MARK: - Recording Indicator Controller

/// Manages the floating recording indicator positioned above the Dock
@MainActor
final class RecordingIndicatorController {
    private var panel: NSPanel?
    private var onStop: (() -> Void)?
    nonisolated(unsafe) private var keyEventMonitor: Any?

    init() {}

    deinit {
        if let monitor = keyEventMonitor {
            NSEvent.removeMonitor(monitor)
        }
    }

    // MARK: - Public API

    /// Show recording indicator above Dock
    /// - Parameters:
    ///   - isMicEnabled: Whether microphone recording is enabled
    ///   - onStop: Callback when user clicks stop
    func show(isMicEnabled: Bool, onStop: @escaping () -> Void) {
        self.onStop = onStop

        // Get visible frame (excludes Dock and menu bar)
        guard let screen = NSScreen.main else { return }
        let visibleFrame = screen.visibleFrame

        // Indicator dimensions (consistent with pre-recording dock)
        let indicatorWidth: CGFloat = isMicEnabled ? 200 : 140
        let indicatorHeight: CGFloat = 48

        // Position: centered horizontally, above the Dock
        let indicatorX = visibleFrame.midX - indicatorWidth / 2
        let indicatorY = visibleFrame.minY + 20  // 20pt above Dock

        let indicatorFrame = CGRect(
            x: indicatorX,
            y: indicatorY,
            width: indicatorWidth,
            height: indicatorHeight
        )

        // Create panel
        let newPanel = NSPanel(
            contentRect: indicatorFrame,
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
        newPanel.isMovableByWindowBackground = true
        newPanel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]

        // Create SwiftUI view
        let indicatorView = RecordingIndicatorView(
            isMicEnabled: isMicEnabled,
            onStop: { [weak self] in
                self?.handleStop()
            },
            onMicToggle: {
                Task {
                    try? await CompositorService.shared.toggleMicrophone()
                }
            }
        )

        // Setup ESC key monitor to stop recording
        setupKeyMonitor()

        let hostingView = NSHostingView(rootView: indicatorView)
        hostingView.frame = CGRect(origin: .zero, size: indicatorFrame.size)

        newPanel.contentView = hostingView

        // Animate in from bottom
        let startFrame = indicatorFrame.offsetBy(dx: 0, dy: -20)
        newPanel.alphaValue = 0
        newPanel.setFrame(startFrame, display: false)
        newPanel.orderFrontRegardless()

        panel = newPanel

        NSAnimationContext.beginGrouping()
        NSAnimationContext.current.duration = 0.3
        NSAnimationContext.current.timingFunction = CAMediaTimingFunction(name: .easeOut)
        newPanel.animator().alphaValue = 1
        newPanel.animator().setFrame(indicatorFrame, display: true)
        NSAnimationContext.endGrouping()
    }

    /// Hide recording indicator
    func hide() {
        guard let currentPanel = panel else { return }

        // Remove key monitor
        if let monitor = keyEventMonitor {
            NSEvent.removeMonitor(monitor)
            keyEventMonitor = nil
        }

        panel = nil
        onStop = nil

        // Animate out to bottom
        let endFrame = currentPanel.frame.offsetBy(dx: 0, dy: -20)

        NSAnimationContext.beginGrouping()
        NSAnimationContext.current.duration = 0.25
        NSAnimationContext.current.timingFunction = CAMediaTimingFunction(name: .easeIn)
        currentPanel.animator().alphaValue = 0
        currentPanel.animator().setFrame(endFrame, display: true)
        NSAnimationContext.endGrouping()

        // Cleanup after animation
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 300_000_000)
            currentPanel.orderOut(nil)
        }
    }

    // MARK: - Private

    private func handleStop() {
        let callback = onStop
        hide()
        callback?()
    }

    // MARK: - Key Monitor

    private func setupKeyMonitor() {
        keyEventMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.keyCode == 53 {  // ESC key
                Task { @MainActor in
                    self?.handleStop()
                }
                return nil  // Consume the event
            }
            return event
        }
    }
}
