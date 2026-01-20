import Foundation

// MARK: - Clipboard Item

struct ClipboardItem: Identifiable, Codable, Equatable {
    let id: UUID
    let type: ItemType
    let content: String
    let timestamp: Date
    let sourceInfo: String?
    let originalPath: String?

    init(
        id: UUID = UUID(),
        type: ItemType,
        content: String,
        timestamp: Date = Date(),
        sourceInfo: String? = nil,
        originalPath: String? = nil
    ) {
        self.id = id
        self.type = type
        self.content = content
        self.timestamp = timestamp
        self.sourceInfo = sourceInfo
        self.originalPath = originalPath
    }

    /// Whether this item can be opened in an external app
    var canOpen: Bool {
        switch type {
        case .filePath:
            return FileManager.default.fileExists(atPath: content)
        case .fileContents:
            if let path = originalPath {
                return FileManager.default.fileExists(atPath: path)
            }
            return true // Can create temp file
        case .ocr:
            return true // Can create temp file
        }
    }

    // MARK: - Item Type

    enum ItemType: String, Codable, CaseIterable {
        case ocr
        case filePath
        case fileContents

        var icon: String {
            switch self {
            case .ocr: return "text.viewfinder"
            case .filePath: return "folder"
            case .fileContents: return "doc.text"
            }
        }

        var label: String {
            switch self {
            case .ocr: return "OCR"
            case .filePath: return "Path"
            case .fileContents: return "Contents"
            }
        }
    }

    // MARK: - Computed Properties

    /// Preview text (first 80 characters)
    var preview: String {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        let singleLine = trimmed.replacingOccurrences(of: "\n", with: " ")
        if singleLine.count > 80 {
            return String(singleLine.prefix(77)) + "..."
        }
        return singleLine
    }

    /// Relative time string (e.g., "just now", "2m ago")
    var relativeTime: String {
        let now = Date()
        let interval = now.timeIntervalSince(timestamp)

        if interval < 60 {
            return "just now"
        } else if interval < 3600 {
            let minutes = Int(interval / 60)
            return "\(minutes)m ago"
        } else if interval < 86400 {
            let hours = Int(interval / 3600)
            return "\(hours)h ago"
        } else {
            let days = Int(interval / 86400)
            return "\(days)d ago"
        }
    }

    /// File name if this is a file-related item
    var fileName: String? {
        guard type == .filePath || type == .fileContents else { return nil }
        return sourceInfo ?? URL(fileURLWithPath: content).lastPathComponent
    }
}
