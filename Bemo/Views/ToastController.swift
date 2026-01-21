import AppKit
import SwiftUI

// MARK: - Toast Type

enum ToastType: Sendable {
    case success
    case error
    case ocr
    case filePath
    case fileContents
    case screenshot
    case recording

    var icon: String {
        switch self {
        case .success, .ocr, .filePath, .fileContents, .screenshot, .recording:
            return "checkmark.circle.fill"
        case .error:
            return "xmark.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .success: return .green
        case .error: return .red
        case .ocr: return .blue
        case .filePath: return .orange
        case .fileContents: return .purple
        case .screenshot: return .green
        case .recording: return .red
        }
    }

    var label: String {
        switch self {
        case .success: return "Copied"
        case .error: return "Error"
        case .ocr: return "OCR Text"
        case .filePath: return "File Path"
        case .fileContents: return "File Contents"
        case .screenshot: return "Screenshot"
        case .recording: return "Recording"
        }
    }
}

// MARK: - Toast Controller

@MainActor
final class ToastController {
    static let shared = ToastController()

    private var toastWindow: NSWindow?
    private var dismissTask: Task<Void, Never>?

    private init() {}

    /// Show a toast notification
    func show(
        message: String,
        preview: String,
        type: ToastType = .success,
        duration: TimeInterval = 2.0
    ) {
        dismissTask?.cancel()
        toastWindow?.orderOut(nil)

        let window = createToastWindow(message: message, preview: preview, type: type)
        toastWindow = window

        // Position off-screen for slide-in
        guard let screen = NSScreen.main else { return }
        let toastWidth: CGFloat = 300
        let toastHeight: CGFloat = 80
        let startFrame = CGRect(
            x: screen.visibleFrame.maxX - toastWidth - 20,
            y: screen.visibleFrame.maxY - 10,
            width: toastWidth,
            height: toastHeight
        )
        let endFrame = CGRect(
            x: screen.visibleFrame.maxX - toastWidth - 20,
            y: screen.visibleFrame.maxY - toastHeight - 20,
            width: toastWidth,
            height: toastHeight
        )

        window.setFrame(startFrame, display: false)
        window.alphaValue = 0
        window.orderFrontRegardless()

        // Animate in with slide
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.3
            context.timingFunction = CAMediaTimingFunction(name: .easeOut)
            window.animator().setFrame(endFrame, display: true)
            window.animator().alphaValue = 1
        }

        // Schedule dismiss
        dismissTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(duration * 1_000_000_000))
            guard !Task.isCancelled else { return }
            self?.dismiss()
        }
    }

    /// Convenience for clipboard item copies
    func showCopied(item: ClipboardItem) {
        let type: ToastType = switch item.type {
        case .ocr: .ocr
        case .filePath: .filePath
        case .fileContents: .fileContents
        case .screenshot: .screenshot
        case .recording: .recording
        }
        show(message: "Copied!", preview: item.preview, type: type)
    }

    /// Convenience for screenshot saved
    func showScreenshotSaved(filename: String) {
        show(message: "Saved!", preview: filename, type: .screenshot)
    }

    /// Convenience for recording saved
    func showRecordingSaved(filename: String, duration: String) {
        show(message: "Saved!", preview: "\(filename) (\(duration))", type: .recording)
    }

    private func dismiss() {
        guard let window = toastWindow else { return }

        // Slide out
        guard let screen = NSScreen.main else { return }
        let toastWidth: CGFloat = 300
        let toastHeight: CGFloat = 80
        let endFrame = CGRect(
            x: screen.visibleFrame.maxX - toastWidth - 20,
            y: screen.visibleFrame.maxY - 10,
            width: toastWidth,
            height: toastHeight
        )

        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.25
            context.timingFunction = CAMediaTimingFunction(name: .easeIn)
            window.animator().setFrame(endFrame, display: true)
            window.animator().alphaValue = 0
        }, completionHandler: {
            Task { @MainActor [weak self] in
                window.orderOut(nil)
                self?.toastWindow = nil
            }
        })
    }

    private func createToastWindow(message: String, preview: String, type: ToastType) -> NSWindow {
        let toastWidth: CGFloat = 300
        let toastHeight: CGFloat = 80

        let toastView = ToastView(message: message, preview: preview, type: type)
        let hostingView = NSHostingView(rootView: toastView)
        hostingView.frame = CGRect(x: 0, y: 0, width: toastWidth, height: toastHeight)

        let window = NSWindow(
            contentRect: CGRect(x: 0, y: 0, width: toastWidth, height: toastHeight),
            styleMask: .borderless,
            backing: .buffered,
            defer: false
        )

        window.contentView = hostingView
        window.isOpaque = false
        window.backgroundColor = .clear
        window.level = .floating
        window.hasShadow = true
        window.ignoresMouseEvents = true
        window.collectionBehavior = [.canJoinAllSpaces, .transient]

        return window
    }
}

// MARK: - Toast View

struct ToastView: View {
    let message: String
    let preview: String
    let type: ToastType
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        HStack(spacing: 12) {
            // Icon in circle
            Image(systemName: type.icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Circle().fill(type.color))

            VStack(alignment: .leading, spacing: 4) {
                // Header with type label
                HStack(spacing: 6) {
                    Text(message)
                        .font(.system(size: 13, weight: .semibold))

                    Text(type.label)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(.tertiary)
                }

                // Preview
                Text(previewText)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(width: 300, height: 80)
        .background(
            RoundedRectangle(cornerRadius: BemoTheme.panelRadius)
                .fill(.ultraThinMaterial.opacity(0.85))
        )
        .overlay(
            RoundedRectangle(cornerRadius: BemoTheme.panelRadius)
                .strokeBorder(Color.primary.opacity(colorScheme == .dark ? 0.12 : 0.08), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.12), radius: 16, y: 8)
    }

    private var previewText: String {
        let trimmed = preview.trimmingCharacters(in: .whitespacesAndNewlines)
        let singleLine = trimmed.replacingOccurrences(of: "\n", with: " ")
        if singleLine.count > 70 {
            return String(singleLine.prefix(67)) + "..."
        }
        return singleLine
    }
}
