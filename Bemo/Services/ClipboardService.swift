import AppKit

@MainActor
final class ClipboardService {
    static let shared = ClipboardService()

    private init() {}

    func copy(text: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }

}
