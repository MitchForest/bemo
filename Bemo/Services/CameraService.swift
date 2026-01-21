import AVFoundation
import AppKit

// MARK: - Camera Service

/// Service for managing webcam capture and preview
@MainActor
final class CameraService {
    static let shared = CameraService()

    // MARK: - State

    private var captureSession: AVCaptureSession?
    private var videoInput: AVCaptureDeviceInput?
    private(set) var previewLayer: AVCaptureVideoPreviewLayer?
    private let sessionQueue = DispatchQueue(label: "bemo.camera.session")

    private(set) var isRunning: Bool = false

    private init() {}

    // MARK: - Permission

    /// Check camera authorization status
    var authorizationStatus: AVAuthorizationStatus {
        AVCaptureDevice.authorizationStatus(for: .video)
    }

    /// Request camera permission
    /// - Returns: True if permission granted
    func requestPermission() async -> Bool {
        await AVCaptureDevice.requestAccess(for: .video)
    }

    /// Check if permission is granted
    var hasPermission: Bool {
        authorizationStatus == .authorized
    }

    // MARK: - Capture Control

    /// Start camera capture and create preview layer
    /// - Returns: The preview layer for display
    func startCapture() async throws -> AVCaptureVideoPreviewLayer {
        // Check/request permission
        if authorizationStatus == .notDetermined {
            let granted = await requestPermission()
            if !granted {
                throw CameraError.permissionDenied
            }
        } else if authorizationStatus != .authorized {
            throw CameraError.permissionDenied
        }

        // Get default camera device
        guard let device = AVCaptureDevice.default(for: .video) else {
            throw CameraError.noDeviceFound
        }

        // Create input
        let input = try AVCaptureDeviceInput(device: device)

        // Create session
        let session = AVCaptureSession()
        session.sessionPreset = .medium

        // Add input
        guard session.canAddInput(input) else {
            throw CameraError.configurationFailed
        }
        session.addInput(input)

        // Create preview layer
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill

        // Start session on background queue
        await withCheckedContinuation { continuation in
            sessionQueue.async {
                session.startRunning()
                continuation.resume()
            }
        }

        // Store references
        captureSession = session
        videoInput = input
        previewLayer = layer
        isRunning = true

        return layer
    }

    /// Stop camera capture
    func stopCapture() {
        guard let session = captureSession else { return }

        sessionQueue.async {
            session.stopRunning()
        }

        captureSession = nil
        videoInput = nil
        previewLayer = nil
        isRunning = false
    }

    /// List available cameras
    func availableCameras() -> [AVCaptureDevice] {
        AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .external],
            mediaType: .video,
            position: .unspecified
        ).devices
    }
}

// MARK: - Camera Errors

enum CameraError: Error, LocalizedError {
    case permissionDenied
    case noDeviceFound
    case configurationFailed

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Camera permission required. Please enable in System Settings > Privacy & Security > Camera"
        case .noDeviceFound:
            return "No camera device found"
        case .configurationFailed:
            return "Failed to configure camera session"
        }
    }
}
