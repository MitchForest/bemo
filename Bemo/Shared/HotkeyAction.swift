import Foundation

enum HotkeyAction: String, CaseIterable {
    case ocrCapture
    case screenshotCapture
    case recordingCapture
    case recordingWindowCapture
    case clipboardHistory

    var title: String {
        switch self {
        case .ocrCapture:
            return "OCR Capture"
        case .screenshotCapture:
            return "Screenshot"
        case .recordingCapture:
            return "Screen Recording"
        case .recordingWindowCapture:
            return "Window Recording"
        case .clipboardHistory:
            return "Clipboard History"
        }
    }

    var keyCode: UInt32 {
        switch self {
        case .ocrCapture:
            return 0x12
        case .screenshotCapture:
            return 0x13
        case .recordingCapture:
            return 0x14
        case .recordingWindowCapture:
            return 0x15
        case .clipboardHistory:
            return 0x09
        }
    }

    var modifiers: KeyModifiers {
        [.command, .shift]
    }

    var shortcutLabel: String {
        let command = "\u{2318}"
        let shift = "\u{21E7}"
        switch self {
        case .ocrCapture:
            return "\(command)\(shift)1"
        case .screenshotCapture:
            return "\(command)\(shift)2"
        case .recordingCapture:
            return "\(command)\(shift)3"
        case .recordingWindowCapture:
            return "\(command)\(shift)4"
        case .clipboardHistory:
            return "\(command)\(shift)V"
        }
    }
}
