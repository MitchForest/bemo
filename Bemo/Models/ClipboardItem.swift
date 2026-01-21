import Foundation

// MARK: - Clipboard Item

struct ClipboardItem: Identifiable, Codable, Equatable {
    let id: UUID
    let type: ItemType
    let content: String
    let timestamp: Date
    let sourceInfo: String?
    let originalPath: String?

    // Media-specific properties
    let thumbnailData: Data?
    let fileURL: URL?
    let duration: TimeInterval?

    init(
        id: UUID = UUID(),
        type: ItemType,
        content: String,
        timestamp: Date = Date(),
        sourceInfo: String? = nil,
        originalPath: String? = nil,
        thumbnailData: Data? = nil,
        fileURL: URL? = nil,
        duration: TimeInterval? = nil
    ) {
        self.id = id
        self.type = type
        self.content = content
        self.timestamp = timestamp
        self.sourceInfo = sourceInfo
        self.originalPath = originalPath
        self.thumbnailData = thumbnailData
        self.fileURL = fileURL
        self.duration = duration
    }

    /// Convenience initializer for screenshots
    init(screenshot thumbnailData: Data, fileURL: URL) {
        self.id = UUID()
        self.type = .screenshot
        self.content = fileURL.lastPathComponent
        self.timestamp = Date()
        self.sourceInfo = nil
        self.originalPath = nil
        self.thumbnailData = thumbnailData
        self.fileURL = fileURL
        self.duration = nil
    }

    /// Convenience initializer for recordings
    init(recording thumbnailData: Data, fileURL: URL, duration: TimeInterval) {
        self.id = UUID()
        self.type = .recording
        self.content = fileURL.lastPathComponent
        self.timestamp = Date()
        self.sourceInfo = nil
        self.originalPath = nil
        self.thumbnailData = thumbnailData
        self.fileURL = fileURL
        self.duration = duration
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
        case .screenshot, .recording:
            if let url = fileURL {
                return FileManager.default.fileExists(atPath: url.path)
            }
            return false
        }
    }

    // MARK: - Item Type

    enum ItemType: String, Codable, CaseIterable {
        case ocr
        case filePath
        case fileContents
        case screenshot
        case recording

        var icon: String {
            switch self {
            case .ocr: return "text.viewfinder"
            case .filePath: return "folder"
            case .fileContents: return "doc.text"
            case .screenshot: return "photo"
            case .recording: return "video.fill"
            }
        }

        var label: String {
            switch self {
            case .ocr: return "OCR"
            case .filePath: return "Path"
            case .fileContents: return "Contents"
            case .screenshot: return "Screenshot"
            case .recording: return "Recording"
            }
        }
    }

    // MARK: - Computed Properties

    /// Preview text (first 80 characters)
    var preview: String {
        // For media items, return the filename
        if type == .screenshot || type == .recording {
            return fileURL?.lastPathComponent ?? content
        }

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
        switch type {
        case .filePath, .fileContents:
            return sourceInfo ?? URL(fileURLWithPath: content).lastPathComponent
        case .screenshot, .recording:
            return fileURL?.lastPathComponent
        case .ocr:
            return nil
        }
    }

    /// Formatted duration string for recordings (e.g., "1:23")
    var formattedDuration: String? {
        guard let duration = duration else { return nil }
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
