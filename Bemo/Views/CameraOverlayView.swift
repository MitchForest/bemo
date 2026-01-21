import SwiftUI
import AVFoundation

// MARK: - Camera Position

enum CameraPosition: String, CaseIterable, Codable, Sendable {
    case topLeft
    case topRight
    case bottomLeft
    case bottomRight

    /// Calculate frame for camera circle within given bounds
    func frame(in bounds: CGRect, size: CGFloat, margin: CGFloat = 20) -> CGRect {
        switch self {
        case .topLeft:
            return CGRect(
                x: bounds.minX + margin,
                y: bounds.maxY - size - margin,
                width: size,
                height: size
            )
        case .topRight:
            return CGRect(
                x: bounds.maxX - size - margin,
                y: bounds.maxY - size - margin,
                width: size,
                height: size
            )
        case .bottomLeft:
            return CGRect(
                x: bounds.minX + margin,
                y: bounds.minY + margin,
                width: size,
                height: size
            )
        case .bottomRight:
            return CGRect(
                x: bounds.maxX - size - margin,
                y: bounds.minY + margin,
                width: size,
                height: size
            )
        }
    }

    var icon: String {
        switch self {
        case .topLeft: return "arrow.up.left"
        case .topRight: return "arrow.up.right"
        case .bottomLeft: return "arrow.down.left"
        case .bottomRight: return "arrow.down.right"
        }
    }
}

// MARK: - Camera Size

enum CameraSize: String, CaseIterable, Codable, Sendable {
    case small
    case medium
    case large

    var dimension: CGFloat {
        switch self {
        case .small: return 80
        case .medium: return 120
        case .large: return 160
        }
    }

    var label: String {
        switch self {
        case .small: return "S"
        case .medium: return "M"
        case .large: return "L"
        }
    }
}

// MARK: - Camera Preview Representable

/// NSViewRepresentable wrapper for AVCaptureVideoPreviewLayer
struct CameraPreviewRepresentable: NSViewRepresentable {
    let previewLayer: AVCaptureVideoPreviewLayer

    func makeNSView(context: Context) -> CameraPreviewNSView {
        let view = CameraPreviewNSView()
        view.previewLayer = previewLayer
        return view
    }

    func updateNSView(_ nsView: CameraPreviewNSView, context: Context) {
        nsView.previewLayer = previewLayer
    }
}

/// NSView that hosts an AVCaptureVideoPreviewLayer
final class CameraPreviewNSView: NSView {
    var previewLayer: AVCaptureVideoPreviewLayer? {
        didSet {
            oldValue?.removeFromSuperlayer()
            if let layer = previewLayer {
                self.wantsLayer = true
                self.layer?.addSublayer(layer)
                updateLayerFrame()
            }
        }
    }

    override func layout() {
        super.layout()
        updateLayerFrame()
    }

    private func updateLayerFrame() {
        previewLayer?.frame = bounds
    }
}

// MARK: - Camera Overlay View

/// SwiftUI view displaying a circular camera preview
struct CameraOverlayView: View {
    let previewLayer: AVCaptureVideoPreviewLayer
    let size: CGFloat

    var body: some View {
        CameraPreviewRepresentable(previewLayer: previewLayer)
            .frame(width: size, height: size)
            .clipShape(Circle())
            .overlay(
                Circle()
                    .strokeBorder(
                        LinearGradient(
                            colors: [.white.opacity(0.9), .white.opacity(0.6)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 3
                    )
            )
            .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
    }
}
