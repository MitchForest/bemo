import SwiftUI

struct MenubarView: View {
    let onCaptureScreen: () -> Void

    init(onCaptureScreen: @escaping () -> Void) {
        self.onCaptureScreen = onCaptureScreen
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image(systemName: "square.stack.fill")
                    .foregroundStyle(.secondary)
                Text("Bemo")
                    .font(.system(size: 14, weight: .semibold))
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)

            Divider()
                .opacity(0.5)

            // Actions
            VStack(spacing: 4) {
                ActionButton(
                    title: "OCR Capture",
                    icon: "viewfinder",
                    shortcut: "⌘⇧2",
                    action: onCaptureScreen
                )

                ActionButton(
                    title: "Clipboard History",
                    icon: "square.stack",
                    shortcut: "⌘⇧V",
                    action: {
                        ClipboardHistoryManager.shared.showDock()
                    }
                )
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 8)

            Divider()
                .opacity(0.5)

            // Footer
            HStack {
                Button("Quit") {
                    NSApp.terminate(nil)
                }
                .buttonStyle(.plain)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)

                Spacer()

                Text("v1.0")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .frame(width: 240)
    }
}

struct ActionButton: View {
    let title: String
    let icon: String
    let shortcut: String
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .frame(width: 18)
                    .foregroundStyle(isHovered ? .primary : .secondary)

                Text(title)
                    .font(.system(size: 13))

                Spacer()

                Text(shortcut)
                    .font(.system(size: 10, design: .rounded))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(isHovered ? Color.accentColor.opacity(0.1) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
    }
}
