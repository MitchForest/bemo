import Foundation
import AppKit

// MARK: - Clipboard History Manager

@MainActor
@Observable
final class ClipboardHistoryManager {
    static let shared = ClipboardHistoryManager()

    // MARK: - State

    private(set) var items: [ClipboardItem] = []
    var isPaused: Bool = false
    private(set) var isVisible: Bool = false

    // MARK: - Configuration

    let maxItems = 10
    private let storageKey = "bemo.clipboard.history"

    // MARK: - Callbacks

    var onItemsChanged: (() -> Void)?
    var onShouldShowDock: (() -> Void)?
    var onShouldHideDock: (() -> Void)?

    // MARK: - Pasteboard Monitoring

    private var pasteboardMonitor: Timer?
    private var lastChangeCount: Int = 0

    // MARK: - Initialization

    private init() {
        loadFromStorage()
        startMonitoringPasteboard()
    }

    // MARK: - Public API

    /// Add an item to clipboard history and copy to system clipboard
    func add(_ item: ClipboardItem) {
        guard !isPaused else { return }

        // Remove duplicate if exists (same content)
        items.removeAll { $0.content == item.content }

        // Add to front
        items.insert(item, at: 0)

        // Trim to max size
        if items.count > maxItems {
            items = Array(items.prefix(maxItems))
        }

        // Copy to system clipboard
        ClipboardService.shared.copy(text: item.content)

        // Persist
        saveToStorage()

        // Notify
        onItemsChanged?()

        // Show dock
        showDock()
    }

    /// Add OCR result
    func addOCR(_ text: String) {
        let item = ClipboardItem(type: .ocr, content: text)
        add(item)
    }

    /// Add screenshot
    func addScreenshot(thumbnailData: Data, fileURL: URL) {
        let item = ClipboardItem(screenshot: thumbnailData, fileURL: fileURL)
        addMedia(item)
    }

    /// Add recording
    func addRecording(thumbnailData: Data, fileURL: URL, duration: TimeInterval) {
        let item = ClipboardItem(recording: thumbnailData, fileURL: fileURL, duration: duration)
        addMedia(item)
    }

    /// Add media item (screenshot/recording) - doesn't copy text to clipboard
    private func addMedia(_ item: ClipboardItem) {
        guard !isPaused else { return }

        // Remove duplicate if exists (same file URL)
        if let fileURL = item.fileURL {
            items.removeAll { $0.fileURL == fileURL }
        }

        // Add to front
        items.insert(item, at: 0)

        // Trim to max size
        if items.count > maxItems {
            items = Array(items.prefix(maxItems))
        }

        // Persist
        saveToStorage()

        // Notify
        onItemsChanged?()

        // Show dock
        showDock()
    }

    /// Copy an existing item again (moves to top)
    func copyAgain(_ item: ClipboardItem) {
        // Remove from current position
        items.removeAll { $0.id == item.id }

        // Create new item with updated timestamp, preserving all properties
        let newItem = ClipboardItem(
            type: item.type,
            content: item.content,
            sourceInfo: item.sourceInfo,
            originalPath: item.originalPath,
            thumbnailData: item.thumbnailData,
            fileURL: item.fileURL,
            duration: item.duration
        )

        // Add to front
        items.insert(newItem, at: 0)

        // Copy to clipboard based on type
        switch item.type {
        case .screenshot:
            // Copy image to clipboard if file exists
            if let fileURL = item.fileURL,
               let image = NSImage(contentsOf: fileURL) {
                let pasteboard = NSPasteboard.general
                pasteboard.clearContents()
                pasteboard.writeObjects([image])
            }
        case .recording:
            // Copy file reference to clipboard
            if let fileURL = item.fileURL {
                let pasteboard = NSPasteboard.general
                pasteboard.clearContents()
                pasteboard.writeObjects([fileURL as NSURL])
            }
        default:
            // Copy text content
            ClipboardService.shared.copy(text: item.content)
        }

        // Persist
        saveToStorage()

        // Notify
        onItemsChanged?()
    }

    /// Delete an item
    func delete(_ item: ClipboardItem) {
        items.removeAll { $0.id == item.id }
        saveToStorage()
        onItemsChanged?()
    }

    /// Clear all history
    func clearAll() {
        items.removeAll()
        saveToStorage()
        onItemsChanged?()
    }

    // MARK: - Dock Visibility

    func showDock() {
        guard !isVisible else { return }
        isVisible = true
        onShouldShowDock?()
    }

    func hideDock() {
        guard isVisible else { return }
        isVisible = false
        onShouldHideDock?()
    }

    // MARK: - Pasteboard Monitoring

    private func startMonitoringPasteboard() {
        lastChangeCount = NSPasteboard.general.changeCount

        // Poll pasteboard for external changes (e.g., user pastes somewhere)
        pasteboardMonitor = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.checkPasteboardChanges()
            }
        }
    }

    private func checkPasteboardChanges() {
        let currentCount = NSPasteboard.general.changeCount

        if currentCount != lastChangeCount {
            // Pasteboard changed - user might have pasted
            // We could detect paste events here, but for now we just track the change
            lastChangeCount = currentCount
        }
    }

    // MARK: - Persistence

    private func saveToStorage() {
        do {
            let data = try JSONEncoder().encode(items)
            UserDefaults.standard.set(data, forKey: storageKey)
        } catch {
            print("Failed to save clipboard history: \(error)")
        }
    }

    private func loadFromStorage() {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return }

        do {
            items = try JSONDecoder().decode([ClipboardItem].self, from: data)
        } catch {
            print("Failed to load clipboard history: \(error)")
            items = []
        }
    }
}
