import AppKit
import SwiftUI

@MainActor
final class FilePreviewWindow {
    private let url: URL
    private var window: NSWindow?

    init(url: URL) {
        self.url = url
    }

    func show() {
        let previewView = FilePreviewView(url: url) { [weak self] in
            self?.close()
        }

        let windowWidth: CGFloat = 320
        let windowHeight: CGFloat = 160

        let hostingView = NSHostingView(rootView: previewView)
        hostingView.frame = CGRect(x: 0, y: 0, width: windowWidth, height: windowHeight)

        // Position at center of main screen
        let screenFrame = NSScreen.main?.visibleFrame ?? .zero
        let windowFrame = CGRect(
            x: screenFrame.midX - windowWidth / 2,
            y: screenFrame.midY - windowHeight / 2,
            width: windowWidth,
            height: windowHeight
        )

        let window = NSWindow(
            contentRect: windowFrame,
            styleMask: [.titled, .closable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        window.contentView = hostingView
        window.isOpaque = false
        window.backgroundColor = .clear
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.level = .floating
        window.isMovableByWindowBackground = true

        self.window = window
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func close() {
        window?.orderOut(nil)
        window = nil
    }
}

struct FilePreviewView: View {
    let url: URL
    let onClose: () -> Void

    @State private var fileSize: String = ""
    @State private var fileType: String = ""

    var body: some View {
        VStack(spacing: 0) {
            // Header with close button
            HStack {
                // File type badge
                Text(url.pathExtension.uppercased())
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Capsule().fill(.orange))

                Spacer()

                Button(action: onClose) {
                    Image(systemName: "xmark")
                }
                .buttonStyle(CircleIconButtonStyle(size: 24, tint: .secondary))
            }
            .padding(.horizontal, 14)
            .padding(.top, 12)

            // File info
            HStack(spacing: 14) {
                // File icon
                FileIconView(url: url)
                    .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 3) {
                    Text(url.lastPathComponent)
                        .font(.system(size: 13, weight: .semibold))
                        .lineLimit(1)

                    Text(url.deletingLastPathComponent().path)
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)

                    if !fileSize.isEmpty {
                        Text(fileSize)
                            .font(.system(size: 9))
                            .foregroundStyle(.tertiary)
                    }
                }

                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)

            Divider()
                .opacity(0.5)

            // Action buttons
            HStack(spacing: 10) {
                Button {
                    ClipboardHistoryManager.shared.addFilePath(url.path, fileName: url.lastPathComponent)
                    ToastController.shared.show(message: "Copied!", preview: url.path, type: .filePath)
                    onClose()
                } label: {
                    Image(systemName: "link")
                }
                .buttonStyle(FilledCircleIconButtonStyle(size: 32, tint: .orange))

                Text("Path")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)

                Spacer()

                Text("Contents")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)

                Button {
                    if let contents = try? String(contentsOf: url, encoding: .utf8) {
                        ClipboardHistoryManager.shared.addFileContents(
                            contents,
                            fileName: url.lastPathComponent,
                            originalPath: url.path
                        )
                        ToastController.shared.show(message: "Copied!", preview: contents, type: .fileContents)
                    }
                    onClose()
                } label: {
                    Image(systemName: "doc.text")
                }
                .buttonStyle(FilledCircleIconButtonStyle(size: 32, tint: .purple))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
        }
        .frame(width: 320, height: 160)
        .glassPanelStyle(cornerRadius: BemoTheme.panelRadius)
        .onAppear {
            loadFileInfo()
        }
    }

    private func loadFileInfo() {
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            if let size = attributes[.size] as? Int64 {
                fileSize = ByteCountFormatter.string(fromByteCount: size, countStyle: .file)
            }
        } catch {}

        fileType = url.pathExtension.uppercased()
    }
}

struct FileIconView: View {
    let url: URL

    var body: some View {
        Image(nsImage: NSWorkspace.shared.icon(forFile: url.path))
            .resizable()
            .aspectRatio(contentMode: .fit)
    }
}
