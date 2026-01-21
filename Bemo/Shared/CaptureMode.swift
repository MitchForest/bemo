import SwiftUI

/// Defines the different capture modes available in the selection overlay
enum CaptureMode: Sendable {
    case ocr
    case screenshot
    case quickRecording
    case studioRecording

    /// Instructions displayed in the selection overlay
    var instructions: String {
        switch self {
        case .ocr:
            return "Drag to select text"
        case .screenshot:
            return "Drag to capture screenshot"
        case .quickRecording:
            return "Drag to select recording area"
        case .studioRecording:
            return "Drag to select recording area"
        }
    }

    /// SF Symbol icon for the mode
    var icon: String {
        switch self {
        case .ocr:
            return "text.viewfinder"
        case .screenshot:
            return "camera.viewfinder"
        case .quickRecording:
            return "record.circle"
        case .studioRecording:
            return "sparkles.rectangle.stack"
        }
    }

    /// Accent color for the mode
    var accentColor: Color {
        switch self {
        case .ocr:
            return .blue
        case .screenshot:
            return .green
        case .quickRecording:
            return .red
        case .studioRecording:
            return .purple
        }
    }

    /// Short label for the mode
    var label: String {
        switch self {
        case .ocr:
            return "OCR"
        case .screenshot:
            return "Screenshot"
        case .quickRecording:
            return "Recording"
        case .studioRecording:
            return "Studio"
        }
    }
}
