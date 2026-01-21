import AppKit
import SwiftUI

// MARK: - Clipboard Dock Controller

@MainActor
final class ClipboardDockController {
    static let shared = ClipboardDockController()

    private var panel: NSPanel?
    private var deactivateObserver: NSObjectProtocol?
    private var isAnimating = false

    private let panelWidth: CGFloat = 320
    private let panelHeight: CGFloat = 420

    private init() {
        setupCallbacks()
    }

    // MARK: - Setup

    private func setupCallbacks() {
        ClipboardHistoryManager.shared.onShouldShowDock = { [weak self] in
            self?.show()
        }

        ClipboardHistoryManager.shared.onShouldHideDock = { [weak self] in
            self?.hide()
        }
    }

    // MARK: - Show/Hide

    func show() {
        guard panel == nil, !isAnimating else { return }

        isAnimating = true

        // Create panel
        let panel = createPanel()
        self.panel = panel

        // Position off-screen to the right
        guard let screen = NSScreen.main else { return }
        let startFrame = CGRect(
            x: screen.visibleFrame.maxX,
            y: screen.visibleFrame.midY - panelHeight / 2,
            width: panelWidth,
            height: panelHeight
        )
        panel.setFrame(startFrame, display: false)

        // Show panel
        NSApp.activate(ignoringOtherApps: true)
        panel.makeKeyAndOrderFront(nil)

        // Animate in
        let endFrame = CGRect(
            x: screen.visibleFrame.maxX - panelWidth - 16,
            y: startFrame.minY,
            width: panelWidth,
            height: panelHeight
        )

        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.25
            context.timingFunction = CAMediaTimingFunction(name: .easeOut)
            panel.animator().setFrame(endFrame, display: true)
        }, completionHandler: {
            Task { @MainActor [weak self] in
                self?.isAnimating = false
                self?.setupDeactivateMonitor()
            }
        })
    }

    func hide() {
        guard let panel = panel, !isAnimating else { return }

        isAnimating = true
        removeDeactivateMonitor()

        // Animate out
        guard let screen = NSScreen.main else { return }
        let endFrame = CGRect(
            x: screen.visibleFrame.maxX,
            y: panel.frame.minY,
            width: panelWidth,
            height: panelHeight
        )

        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.2
            context.timingFunction = CAMediaTimingFunction(name: .easeIn)
            panel.animator().setFrame(endFrame, display: true)
        }, completionHandler: {
            Task { @MainActor [weak self] in
                panel.orderOut(nil)
                self?.panel = nil
                self?.isAnimating = false
            }
        })
    }

    func toggle() {
        if panel != nil {
            ClipboardHistoryManager.shared.hideDock()
        } else {
            ClipboardHistoryManager.shared.showDock()
        }
    }

    // MARK: - Panel Creation

    private func createPanel() -> NSPanel {
        let panel = NSPanel(
            contentRect: CGRect(x: 0, y: 0, width: panelWidth, height: panelHeight),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        panel.isFloatingPanel = true
        panel.level = .floating
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.hidesOnDeactivate = true
        panel.collectionBehavior = [.canJoinAllSpaces, .transient]

        let contentView = ClipboardDockView(onClose: {
            ClipboardHistoryManager.shared.hideDock()
        })

        panel.contentView = NSHostingView(rootView: contentView)

        return panel
    }

    // MARK: - Deactivate Detection

    private func setupDeactivateMonitor() {
        deactivateObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didResignActiveNotification,
            object: NSApp,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                guard self?.panel != nil else { return }
                ClipboardHistoryManager.shared.hideDock()
            }
        }
    }

    private func removeDeactivateMonitor() {
        if let observer = deactivateObserver {
            NotificationCenter.default.removeObserver(observer)
            deactivateObserver = nil
        }
    }
}

// MARK: - Clipboard Dock View

struct ClipboardDockView: View {
    let onClose: () -> Void

    @State private var manager = ClipboardHistoryManager.shared

    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView

            Divider()
                .opacity(0.5)

            // Items list
            if manager.items.isEmpty {
                emptyStateView
            } else {
                itemsListView
            }

            Divider()
                .opacity(0.5)

            // Footer
            footerView
        }
        .frame(width: 320, height: 420)
        .glassPanelStyle(cornerRadius: BemoTheme.panelRadius)
    }

    // MARK: - Header

    private var headerView: some View {
        HStack(spacing: 10) {
            // App icon
            Image(systemName: "square.stack.fill")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.secondary)

            Text("Clipboard")
                .font(.system(size: 14, weight: .semibold))

            // Item count badge
            if !manager.items.isEmpty {
                Text("\(manager.items.count)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.tertiary)
            }

            Spacer()

            Button(action: onClose) {
                Image(systemName: "xmark")
            }
            .buttonStyle(CircleIconButtonStyle(size: 24, tint: .secondary))
        }
        .padding(.horizontal, BemoTheme.panelPadding + 4)
        .padding(.vertical, 12)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 14) {
            Image(systemName: "doc.on.clipboard")
                .font(.system(size: 40, weight: .ultraLight))
                .foregroundStyle(.tertiary)

            VStack(spacing: 4) {
                Text("No items yet")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)

                Text("⌘⇧2 to capture screen text")
                    .font(.system(size: 10, design: .rounded))
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Items List

    private var itemsListView: some View {
        ScrollView {
            LazyVStack(spacing: BemoTheme.itemSpacing) {
                ForEach(manager.items) { item in
                    ClipboardItemView(item: item)
                }
            }
            .padding(BemoTheme.panelPadding)
        }
    }

    // MARK: - Footer

    private var footerView: some View {
        HStack {
            // Clear all button
            Button {
                manager.clearAll()
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(CircleIconButtonStyle(size: 26, tint: .red, isDestructive: true))
            .disabled(manager.items.isEmpty)
            .opacity(manager.items.isEmpty ? 0.4 : 1)

            Spacer()

            Text(manager.isPaused ? "Paused" : "")
                .font(.system(size: 10))
                .foregroundStyle(.orange)

            // Pause/Resume button
            Button {
                manager.isPaused.toggle()
            } label: {
                Image(systemName: manager.isPaused ? "play.fill" : "pause.fill")
            }
            .buttonStyle(CircleIconButtonStyle(size: 26, tint: manager.isPaused ? .orange : .secondary))
        }
        .padding(.horizontal, BemoTheme.panelPadding + 4)
        .padding(.vertical, 10)
    }
}

// MARK: - Clipboard Item View

struct ClipboardItemView: View {
    let item: ClipboardItem

    @State private var isExpanded = false
    @State private var isHovered = false

    private let manager = ClipboardHistoryManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Main row
            mainRow

            // Expanded content
            if isExpanded {
                expandedContent
            }
        }
        .glassCardStyle(isHovered: isHovered, accentColor: typeColor, cornerRadius: BemoTheme.cardRadius)
        .onHover { isHovered = $0 }
        .animation(.easeOut(duration: 0.15), value: isHovered)
    }

    // MARK: - Content Preview Text

    private var contentPreview: String {
        // For media items, show filename
        if item.type == .screenshot || item.type == .recording {
            return item.fileURL?.lastPathComponent ?? item.content
        }

        let trimmed = item.content.trimmingCharacters(in: .whitespacesAndNewlines)
        let singleLine = trimmed.replacingOccurrences(of: "\n", with: " ")
        if singleLine.count > 50 {
            return String(singleLine.prefix(47)) + "..."
        }
        return singleLine
    }

    /// Whether this item is a media item (screenshot/recording)
    private var isMediaItem: Bool {
        item.type == .screenshot || item.type == .recording
    }

    // MARK: - Main Row

    private var mainRow: some View {
        HStack(spacing: 10) {
            // Clickable area (everything except copy button)
            HStack(spacing: 10) {
                // Type badge or thumbnail
                if isMediaItem, let thumbnailData = item.thumbnailData,
                   let nsImage = NSImage(data: thumbnailData) {
                    // Show thumbnail for media items
                    mediaThumbnail(nsImage: nsImage)
                } else {
                    // Show type badge for text items
                    typeBadge
                }

                // Content preview
                VStack(alignment: .leading, spacing: 3) {
                    Text(contentPreview)
                        .font(.system(size: 12, weight: .medium))
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        Text(item.type.label)
                            .foregroundStyle(typeColor)
                        Text("•")
                        Text(item.relativeTime)

                        // Show duration for recordings
                        if let duration = item.formattedDuration {
                            Text("•")
                            Text(duration)
                        }
                        // Show filename for file items
                        else if let fileName = item.fileName, !isMediaItem {
                            Text("•")
                            Text(fileName)
                                .lineLimit(1)
                        }
                    }
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                }

                Spacer(minLength: 8)

                // Expand indicator
                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(isExpanded ? typeColor : Color.secondary.opacity(0.5))
            }
            .contentShape(Rectangle())
            .onTapGesture {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    isExpanded.toggle()
                }
            }

            // Copy button - separate, not part of the tap area
            Button(action: copyItem) {
                Image(systemName: "doc.on.doc")
            }
            .buttonStyle(FilledCircleIconButtonStyle(size: 26, tint: typeColor))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
    }

    // MARK: - Media Thumbnail

    @ViewBuilder
    private func mediaThumbnail(nsImage: NSImage) -> some View {
        ZStack {
            Image(nsImage: nsImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 6))

            // Play icon overlay for recordings
            if item.type == .recording {
                Image(systemName: "play.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(.white)
                    .padding(6)
                    .background(Circle().fill(.black.opacity(0.5)))
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .strokeBorder(typeColor.opacity(0.3), lineWidth: 1)
        )
    }

    // MARK: - Type Badge

    private var typeBadge: some View {
        Image(systemName: item.type.icon)
            .typeBadgeStyle(color: typeColor, size: 26)
    }

    private var typeColor: Color {
        BemoTheme.color(for: item.type)
    }

    // MARK: - Copy Action

    private func copyItem() {
        manager.copyAgain(item)
        FeedbackService.showCopied(item: item)
    }

    // MARK: - Open Action

    private func openItem() {
        switch item.type {
        case .filePath:
            // Open the file directly
            let url = URL(fileURLWithPath: item.content)
            NSWorkspace.shared.open(url)

        case .fileContents:
            // Open original file if available, otherwise create temp file
            if let originalPath = item.originalPath {
                let url = URL(fileURLWithPath: originalPath)
                NSWorkspace.shared.open(url)
            } else {
                openAsTemporaryFile()
            }

        case .ocr:
            // Create temp file and open in text editor
            openAsTemporaryFile()

        case .screenshot, .recording:
            // Open the media file if it exists
            if let fileURL = item.fileURL {
                if FileManager.default.fileExists(atPath: fileURL.path) {
                    NSWorkspace.shared.open(fileURL)
                } else {
                    // File was deleted - show in Finder or error
                    FeedbackService.showError(preview: "File not found")
                }
            }
        }
    }

    private func openAsTemporaryFile() {
        let tempDir = FileManager.default.temporaryDirectory
        let fileName: String

        switch item.type {
        case .ocr:
            fileName = "bemo-ocr-\(item.id.uuidString.prefix(8)).txt"
        case .fileContents:
            fileName = item.sourceInfo ?? "bemo-content-\(item.id.uuidString.prefix(8)).txt"
        case .filePath:
            fileName = "bemo-path-\(item.id.uuidString.prefix(8)).txt"
        case .screenshot, .recording:
            // Media items should use openItem() instead
            return
        }

        let fileURL = tempDir.appendingPathComponent(fileName)

        do {
            try item.content.write(to: fileURL, atomically: true, encoding: .utf8)
            NSWorkspace.shared.open(fileURL)
        } catch {
            FeedbackService.showError(preview: "Could not create temp file")
        }
    }

    // MARK: - Expanded Content

    private var expandedContent: some View {
        VStack(alignment: .leading, spacing: 10) {
            Divider()
                .opacity(0.5)
                .padding(.horizontal, BemoTheme.cardPadding)

            // Content area - different for media vs text
            if isMediaItem {
                mediaExpandedContent
            } else {
                textExpandedContent
            }

            // Action bar
            HStack(spacing: 6) {
                Button {
                    copyItem()
                } label: {
                    Image(systemName: "doc.on.doc")
                }
                .buttonStyle(FilledCircleIconButtonStyle(size: 28, tint: typeColor))

                Button {
                    openItem()
                } label: {
                    Image(systemName: "arrow.up.forward.app")
                }
                .buttonStyle(CircleIconButtonStyle(size: 28, tint: .secondary))

                // Show in Finder button for media items
                if isMediaItem, let fileURL = item.fileURL {
                    Button {
                        NSWorkspace.shared.activateFileViewerSelecting([fileURL])
                    } label: {
                        Image(systemName: "folder")
                    }
                    .buttonStyle(CircleIconButtonStyle(size: 28, tint: .secondary))
                }

                Button {
                    manager.delete(item)
                } label: {
                    Image(systemName: "trash")
                }
                .buttonStyle(CircleIconButtonStyle(size: 28, tint: .red, isDestructive: true))

                Spacer()

                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        isExpanded = false
                    }
                } label: {
                    Image(systemName: "chevron.up")
                }
                .buttonStyle(CircleIconButtonStyle(size: 28, tint: typeColor))
            }
            .padding(.horizontal, BemoTheme.cardPadding)
            .padding(.bottom, BemoTheme.cardPadding)
        }
    }

    // MARK: - Text Expanded Content

    private var textExpandedContent: some View {
        ScrollView {
            Text(item.content)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)
        }
        .frame(maxHeight: 150)
        .padding(.horizontal, BemoTheme.cardPadding)
        .background(Color.secondary.opacity(0.03))
    }

    // MARK: - Media Expanded Content

    private var mediaExpandedContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Large preview image
            if let thumbnailData = item.thumbnailData,
               let nsImage = NSImage(data: thumbnailData) {
                ZStack {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity)
                        .frame(maxHeight: 120)
                        .clipShape(RoundedRectangle(cornerRadius: 8))

                    // Play icon for recordings
                    if item.type == .recording {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 36))
                            .foregroundStyle(.white.opacity(0.9))
                            .shadow(radius: 4)
                    }
                }
                .padding(.horizontal, BemoTheme.cardPadding)
            }

            // File info
            VStack(alignment: .leading, spacing: 4) {
                if let fileURL = item.fileURL {
                    Text(fileURL.lastPathComponent)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.primary)

                    Text(fileURL.deletingLastPathComponent().path)
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }

                if let duration = item.formattedDuration {
                    Text("Duration: \(duration)")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, BemoTheme.cardPadding)
        }
        .padding(.vertical, 4)
    }
}
