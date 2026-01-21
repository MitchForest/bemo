import SwiftUI

/// Defines the different capture modes available in the selection overlay
enum CaptureMode: Sendable {
    case ocr
    case screenshot
    case recording  // Unified recording mode (no quick/studio split)
    case recordingWindow

    /// Instructions displayed in the selection overlay
    var instructions: String {
        switch self {
        case .ocr:
            return "Drag to select text"
        case .screenshot:
            return "Drag to capture screenshot"
        case .recording:
            return "Drag to select recording area"
        case .recordingWindow:
            return "Click a window to record"
        }
    }

    /// SF Symbol icon for the mode
    var icon: String {
        switch self {
        case .ocr:
            return "text.viewfinder"
        case .screenshot:
            return "camera.viewfinder"
        case .recording:
            return "record.circle"
        case .recordingWindow:
            return "macwindow"
        }
    }

    /// Accent color for the mode
    var accentColor: Color {
        switch self {
        case .ocr:
            return .blue
        case .screenshot:
            return .green
        case .recording:
            return .red
        case .recordingWindow:
            return .red
        }
    }

}
