import SwiftUI

@MainActor
enum FeedbackService {
    static func showCopied(item: ClipboardItem) {
        ToastController.shared.showCopied(item: item)
    }

    static func showCopied(preview: String, type: ToastType) {
        ToastController.shared.show(message: "Copied!", preview: preview, type: type)
    }

    static func showScreenshotSaved(filename: String) {
        ToastController.shared.showScreenshotSaved(filename: filename)
    }

    static func showError(_ error: Error) {
        showError(preview: error.localizedDescription)
    }

    static func showError(preview: String) {
        ToastController.shared.show(message: "Error", preview: preview, type: .error)
    }
}
