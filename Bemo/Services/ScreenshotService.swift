import AppKit
import CoreGraphics

// MARK: - Screenshot Service

/// Service for saving screenshots to clipboard and file system
@MainActor
final class ScreenshotService {
    static let shared = ScreenshotService()

    private let fileManager = FileManager.default

    private init() {}

    // MARK: - Clipboard Operations

    /// Save image to system clipboard
    /// - Parameter image: The CGImage to save
    /// - Returns: True if successful
    @discardableResult
    func saveToClipboard(image: CGImage) -> Bool {
        let nsImage = NSImage(cgImage: image, size: NSSize(width: image.width, height: image.height))

        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()

        // Write as PNG for best compatibility
        guard let tiffData = nsImage.tiffRepresentation,
              let bitmapRep = NSBitmapImageRep(data: tiffData),
              let pngData = bitmapRep.representation(using: .png, properties: [:]) else {
            return false
        }

        return pasteboard.setData(pngData, forType: .png)
    }

    // MARK: - File Operations

    /// Generate a filename for a screenshot
    /// - Returns: Formatted filename with timestamp
    func generateFilename() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd 'at' HH.mm.ss"
        let timestamp = formatter.string(from: Date())
        return "Screenshot \(timestamp).png"
    }

    /// Get the default save directory for screenshots
    /// - Returns: URL to the save directory (Desktop by default)
    func getSaveDirectory() -> URL {
        // Check UserDefaults for custom directory
        if let customPath = UserDefaults.standard.string(forKey: "bemo.screenshot.saveDirectory"),
           let customURL = URL(string: customPath),
           fileManager.fileExists(atPath: customURL.path) {
            return customURL
        }

        // Default to Desktop
        return fileManager.urls(for: .desktopDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
    }

    /// Save image to file
    /// - Parameters:
    ///   - image: The CGImage to save
    ///   - filename: Optional filename (auto-generated if nil)
    /// - Returns: URL to the saved file
    func saveToFile(image: CGImage, filename: String? = nil) async throws -> URL {
        let actualFilename = filename ?? generateFilename()
        let saveDirectory = getSaveDirectory()
        let fileURL = saveDirectory.appendingPathComponent(actualFilename)

        // Convert to PNG data
        let nsImage = NSImage(cgImage: image, size: NSSize(width: image.width, height: image.height))

        guard let tiffData = nsImage.tiffRepresentation,
              let bitmapRep = NSBitmapImageRep(data: tiffData),
              let pngData = bitmapRep.representation(using: .png, properties: [:]) else {
            throw ScreenshotError.conversionFailed
        }

        // Write to file
        do {
            try pngData.write(to: fileURL)
            return fileURL
        } catch {
            throw ScreenshotError.saveFailed(error)
        }
    }

    /// Save image to both clipboard and file
    /// - Parameters:
    ///   - image: The CGImage to save
    ///   - toClipboard: Whether to save to clipboard
    ///   - toFile: Whether to save to file
    /// - Returns: URL to saved file (if saved to file)
    func save(image: CGImage, toClipboard: Bool = true, toFile: Bool = true) async throws -> URL? {
        if toClipboard {
            saveToClipboard(image: image)
        }

        if toFile {
            return try await saveToFile(image: image)
        }

        return nil
    }

    // MARK: - Thumbnail Generation

    /// Generate a thumbnail from an image for clipboard history storage
    /// - Parameters:
    ///   - image: The source CGImage
    ///   - maxSize: Maximum dimension (width or height)
    /// - Returns: JPEG data for the thumbnail
    func generateThumbnail(from image: CGImage, maxSize: CGFloat = 120) -> Data? {
        let originalWidth = CGFloat(image.width)
        let originalHeight = CGFloat(image.height)

        // Calculate scale to fit within maxSize
        let scale = min(maxSize / originalWidth, maxSize / originalHeight, 1.0)
        let newWidth = originalWidth * scale
        let newHeight = originalHeight * scale

        // Create scaled image
        let nsImage = NSImage(cgImage: image, size: NSSize(width: newWidth, height: newHeight))

        guard let tiffData = nsImage.tiffRepresentation,
              let bitmapRep = NSBitmapImageRep(data: tiffData) else {
            return nil
        }

        // Convert to JPEG with 0.8 quality for smaller size
        return bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])
    }
}

// MARK: - Errors

enum ScreenshotError: Error, LocalizedError {
    case conversionFailed
    case saveFailed(Error)

    var errorDescription: String? {
        switch self {
        case .conversionFailed:
            return "Failed to convert image to PNG format"
        case .saveFailed(let error):
            return "Failed to save screenshot: \(error.localizedDescription)"
        }
    }
}
