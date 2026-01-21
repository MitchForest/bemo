import SwiftUI

// MARK: - Background Style

/// Defines the background style for composited recordings
enum BackgroundStyle: Codable, Sendable, Equatable {
    case wallpaper                              // User's desktop wallpaper
    case blur                                   // Blurred version of wallpaper
    case solid(red: CGFloat, green: CGFloat, blue: CGFloat)  // Solid color
    case gradient(startR: CGFloat, startG: CGFloat, startB: CGFloat,
                  endR: CGFloat, endG: CGFloat, endB: CGFloat)  // Two-color gradient

    // MARK: - Presets

    static let darkGray = BackgroundStyle.solid(red: 0.1, green: 0.1, blue: 0.12)
    static let charcoal = BackgroundStyle.solid(red: 0.15, green: 0.15, blue: 0.18)
    static let navy = BackgroundStyle.solid(red: 0.1, green: 0.12, blue: 0.2)

    static let purpleGradient = BackgroundStyle.gradient(
        startR: 0.3, startG: 0.1, startB: 0.5,
        endR: 0.1, endG: 0.1, endB: 0.3
    )
    static let blueGradient = BackgroundStyle.gradient(
        startR: 0.1, startG: 0.2, startB: 0.4,
        endR: 0.05, endG: 0.1, endB: 0.2
    )

    /// All preset backgrounds for picker
    static let presets: [BackgroundStyle] = [
        .wallpaper,
        .blur,
        .darkGray,
        .charcoal,
        .navy,
        .purpleGradient,
        .blueGradient
    ]

    /// Display name for UI
    var displayName: String {
        switch self {
        case .wallpaper:
            return "Wallpaper"
        case .blur:
            return "Blur"
        case .solid:
            return "Solid"
        case .gradient:
            return "Gradient"
        }
    }

}

// MARK: - Output Resolution

/// Output video resolution presets
enum OutputResolution: String, Codable, Sendable, CaseIterable {
    case auto = "auto"          // Match source aspect ratio, scale to fit
    case hd1080p = "1080p"      // 1920×1080
    case hd720p = "720p"        // 1280×720

    var displayName: String {
        switch self {
        case .auto:
            return "Auto"
        case .hd1080p:
            return "1080p"
        case .hd720p:
            return "720p"
        }
    }

    var dimensions: CGSize? {
        switch self {
        case .auto:
            return nil
        case .hd1080p:
            return CGSize(width: 1920, height: 1080)
        case .hd720p:
            return CGSize(width: 1280, height: 720)
        }
    }
}

// MARK: - Frame Style

/// Styling options for the screen frame within the composition
struct FrameStyle: Codable, Sendable, Equatable {
    /// Scale of the captured screen within the output (0.7 to 1.0)
    var scale: CGFloat = 0.85

    /// Corner radius of the frame (0 to 24)
    var cornerRadius: CGFloat = 12

    /// Shadow radius behind the frame (0 to 32)
    var shadowRadius: CGFloat = 20

    /// Shadow opacity (0 to 1)
    var shadowOpacity: CGFloat = 0.4

    // MARK: - Presets

    static let `default` = FrameStyle()

}

// MARK: - Camera Style

/// Style options for the camera bubble
struct CameraStyle: Codable, Sendable, Equatable {
    /// Border width around camera circle
    var borderWidth: CGFloat = 4

    /// Border color (white by default)
    var borderColorR: CGFloat = 1.0
    var borderColorG: CGFloat = 1.0
    var borderColorB: CGFloat = 1.0

    static let `default` = CameraStyle()
}

// MARK: - Recording Style

/// Complete configuration for a composited recording
struct RecordingStyle: Codable, Sendable, Equatable {
    // Background
    var background: BackgroundStyle = .wallpaper

    // Frame styling
    var frameStyle: FrameStyle = .default

    // Camera
    var cameraEnabled: Bool = false
    var cameraPosition: CameraPosition = .bottomRight
    var cameraSize: CameraSize = .medium
    var cameraStyle: CameraStyle = .default

    // Output
    var outputResolution: OutputResolution = .auto

    // MARK: - Presets

    static let `default` = RecordingStyle()

}
