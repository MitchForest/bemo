import SwiftUI
import AVFoundation

// MARK: - Recording Complete View

/// Panel shown after recording completes with quick actions
struct RecordingCompleteView: View {
    let fileURL: URL
    let duration: TimeInterval
    let thumbnailData: Data?
    let onCopy: () -> Void
    let onReveal: () -> Void
    let onPreview: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            // Thumbnail with play button
            thumbnailView

            // File info
            VStack(spacing: 4) {
                Text("Recording saved")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.primary)

                Text(fileURL.lastPathComponent)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .truncationMode(.middle)

                Text(formattedDuration)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(.secondary)
            }

            // Action buttons
            HStack(spacing: 12) {
                QuickActionButton(icon: "doc.on.clipboard", label: "Copy", action: onCopy)
                QuickActionButton(icon: "folder", label: "Reveal", action: onReveal)
                QuickActionButton(icon: "play.fill", label: "Preview", action: onPreview)
            }

            // Dismiss button
            Button("Done") {
                onDismiss()
            }
            .buttonStyle(.plain)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
            .background(Color.primary.opacity(0.08))
            .clipShape(Capsule())
        }
        .padding(20)
        .frame(width: 260)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.2), radius: 20, y: 10)
    }

    // MARK: - Thumbnail

    @ViewBuilder
    private var thumbnailView: some View {
        ZStack {
            // Thumbnail image or placeholder
            if let data = thumbnailData, let nsImage = NSImage(data: data) {
                Image(nsImage: nsImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 180, height: 100)
            } else {
                Rectangle()
                    .fill(Color.secondary.opacity(0.2))
                    .frame(width: 180, height: 100)
            }

            // Play button overlay
            Circle()
                .fill(.black.opacity(0.5))
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: "play.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(.white)
                        .offset(x: 2)  // Optical centering
                )
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
        .onTapGesture {
            onPreview()
        }
    }

    // MARK: - Helpers

    private var formattedDuration: String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

// MARK: - Quick Action Button

private struct QuickActionButton: View {
    let icon: String
    let label: String
    let action: () -> Void

    @State private var isHovering = false

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .frame(width: 36, height: 36)
                    .background(
                        Circle()
                            .fill(isHovering ? Color.accentColor.opacity(0.2) : Color.primary.opacity(0.08))
                    )

                Text(label)
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
            }
        }
        .buttonStyle(.plain)
        .onHover { isHovering = $0 }
    }
}

// MARK: - Recording Complete Controller

/// Manages the post-recording panel
@MainActor
final class RecordingCompleteController {
    private var panel: NSPanel?
    private var autoDismissTask: Task<Void, Never>?

    init() {}

    /// Show the recording complete panel
    func show(
        fileURL: URL,
        duration: TimeInterval,
        thumbnailData: Data?,
        autoDismissAfter: TimeInterval = 8.0
    ) {
        guard let screen = NSScreen.main else { return }

        let panelWidth: CGFloat = 260
        let panelHeight: CGFloat = 280

        // Position: center of screen
        let frame = CGRect(
            x: screen.frame.midX - panelWidth / 2,
            y: screen.frame.midY - panelHeight / 2,
            width: panelWidth,
            height: panelHeight
        )

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
        newPanel.hasShadow = false
        newPanel.hidesOnDeactivate = false
        newPanel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]

        let view = RecordingCompleteView(
            fileURL: fileURL,
            duration: duration,
            thumbnailData: thumbnailData,
            onCopy: { [weak self] in
                self?.copyToClipboard(fileURL)
            },
            onReveal: { [weak self] in
                self?.revealInFinder(fileURL)
                self?.dismiss()
            },
            onPreview: { [weak self] in
                self?.preview(fileURL)
                self?.dismiss()
            },
            onDismiss: { [weak self] in
                self?.dismiss()
            }
        )

        let hostingView = NSHostingView(rootView: view)
        hostingView.frame = CGRect(origin: .zero, size: frame.size)

        newPanel.contentView = hostingView

        // Animate in
        newPanel.alphaValue = 0
        newPanel.setFrame(frame.offsetBy(dx: 0, dy: -20), display: false)
        newPanel.orderFrontRegardless()

        panel = newPanel

        NSAnimationContext.beginGrouping()
        NSAnimationContext.current.duration = 0.3
        NSAnimationContext.current.timingFunction = CAMediaTimingFunction(name: .easeOut)
        newPanel.animator().alphaValue = 1
        newPanel.animator().setFrame(frame, display: true)
        NSAnimationContext.endGrouping()

        // Auto-dismiss after delay
        autoDismissTask?.cancel()
        autoDismissTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: UInt64(autoDismissAfter * 1_000_000_000))
            if !Task.isCancelled {
                dismiss()
            }
        }
    }

    /// Dismiss the panel
    func dismiss() {
        autoDismissTask?.cancel()
        autoDismissTask = nil

        guard let currentPanel = panel else { return }
        panel = nil

        let endFrame = currentPanel.frame.offsetBy(dx: 0, dy: -20)

        NSAnimationContext.beginGrouping()
        NSAnimationContext.current.duration = 0.2
        NSAnimationContext.current.timingFunction = CAMediaTimingFunction(name: .easeIn)
        currentPanel.animator().alphaValue = 0
        currentPanel.animator().setFrame(endFrame, display: true)
        NSAnimationContext.endGrouping()

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 250_000_000)
            currentPanel.orderOut(nil)
        }
    }

    // MARK: - Actions

    private func copyToClipboard(_ url: URL) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.writeObjects([url as NSURL])

        // Show brief feedback
        FeedbackService.showCopied(preview: url.lastPathComponent, type: .recording)
    }

    private func revealInFinder(_ url: URL) {
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    private func preview(_ url: URL) {
        NSWorkspace.shared.open(url)
    }

}
