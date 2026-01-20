import AppKit

enum CopyMode: Sendable {
    case path
    case contents
}

@MainActor
final class ClipboardService {
    static let shared = ClipboardService()

    private init() {}

    func copy(text: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }

    func copyFile(url: URL, mode: CopyMode) {
        switch mode {
        case .path:
            copy(text: url.path)
        case .contents:
            copyContents(of: url)
        }
    }

    func copyContents(of url: URL) {
        do {
            let contents = try String(contentsOf: url, encoding: .utf8)
            copy(text: contents)
        } catch {
            // Try other encodings
            if let contents = try? String(contentsOf: url, encoding: .ascii) {
                copy(text: contents)
            }
        }
    }
}
