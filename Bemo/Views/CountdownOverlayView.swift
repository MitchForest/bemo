import SwiftUI

// MARK: - Countdown Overlay View

/// Full-screen countdown overlay for delayed recording start
struct CountdownOverlayView: View {
    let seconds: Int
    let onComplete: () -> Void
    let onCancel: () -> Void

    @State private var currentCount: Int
    @State private var scale: CGFloat = 1.0
    @State private var opacity: Double = 1.0

    init(seconds: Int, onComplete: @escaping () -> Void, onCancel: @escaping () -> Void) {
        self.seconds = seconds
        self.onComplete = onComplete
        self.onCancel = onCancel
        self._currentCount = State(initialValue: seconds)
    }

    var body: some View {
        ZStack {
            // Semi-transparent background
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                // Countdown number
                Text("\(currentCount)")
                    .font(.system(size: 120, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .scaleEffect(scale)
                    .opacity(opacity)

                // Cancel button
                Button("Cancel") {
                    onCancel()
                }
                .buttonStyle(.plain)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white.opacity(0.8))
                .padding(.horizontal, 20)
                .padding(.vertical, 8)
                .background(Capsule().fill(.white.opacity(0.2)))
            }
        }
        .onAppear {
            startCountdown()
        }
    }

    // MARK: - Countdown Logic

    private func startCountdown() {
        animateNumber()
        scheduleNextTick()
    }

    private func scheduleNextTick() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            if currentCount > 1 {
                currentCount -= 1
                animateNumber()
                scheduleNextTick()
            } else {
                onComplete()
            }
        }
    }

    private func animateNumber() {
        // Reset
        scale = 1.5
        opacity = 0

        // Animate in
        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            scale = 1.0
            opacity = 1.0
        }

        // Fade out near end of second
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            withAnimation(.easeOut(duration: 0.2)) {
                opacity = 0.5
            }
        }
    }
}

// MARK: - Countdown Overlay Controller

/// Manages the countdown overlay panel
@MainActor
final class CountdownOverlayController {
    private var panel: NSPanel?
    private var onComplete: (() -> Void)?
    private var onCancel: (() -> Void)?

    init() {}

    /// Show countdown overlay
    /// - Parameters:
    ///   - seconds: Number of seconds to count down
    ///   - onComplete: Called when countdown finishes
    ///   - onCancel: Called if user cancels
    func show(
        seconds: Int,
        onComplete: @escaping () -> Void,
        onCancel: @escaping () -> Void
    ) {
        self.onComplete = onComplete
        self.onCancel = onCancel

        guard let screen = NSScreen.main else { return }

        let frame = screen.frame

        let newPanel = NSPanel(
            contentRect: frame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        newPanel.isFloatingPanel = true
        newPanel.level = .screenSaver
        newPanel.isOpaque = false
        newPanel.backgroundColor = .clear
        newPanel.hasShadow = false
        newPanel.hidesOnDeactivate = false
        newPanel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]
        newPanel.ignoresMouseEvents = false

        let overlayView = CountdownOverlayView(
            seconds: seconds,
            onComplete: { [weak self] in
                self?.handleComplete()
            },
            onCancel: { [weak self] in
                self?.handleCancel()
            }
        )

        let hostingView = NSHostingView(rootView: overlayView)
        hostingView.frame = CGRect(origin: .zero, size: frame.size)

        newPanel.contentView = hostingView
        newPanel.orderFrontRegardless()

        panel = newPanel
    }

    /// Dismiss the overlay
    func dismiss() {
        panel?.orderOut(nil)
        panel = nil
        onComplete = nil
        onCancel = nil
    }

    private func handleComplete() {
        let callback = onComplete
        dismiss()
        callback?()
    }

    private func handleCancel() {
        let callback = onCancel
        dismiss()
        callback?()
    }
}
