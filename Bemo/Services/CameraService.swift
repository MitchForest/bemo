@preconcurrency import AVFoundation
import AppKit

// MARK: - Camera Frame Delegate

/// Protocol for receiving camera frames for compositing
protocol CameraFrameDelegate: AnyObject, Sendable {
    func cameraService(didOutputPixelBuffer buffer: CVPixelBuffer)
}

// MARK: - Camera Service

/// Service for managing webcam capture and preview
@MainActor
final class CameraService: NSObject {
    static let shared = CameraService()

    // MARK: - State

    private var captureSession: AVCaptureSession?
    private(set) var previewLayer: AVCaptureVideoPreviewLayer?
    private let sessionQueue = DispatchQueue(label: "bemo.camera.session")
    private let outputQueue = DispatchQueue(label: "bemo.camera.output", qos: .userInteractive)

    /// Wrapper to make session access Sendable-safe
    private final class SessionWrapper: @unchecked Sendable {
        let session: AVCaptureSession
        init(_ session: AVCaptureSession) { self.session = session }
    }

    /// Retains a CVPixelBuffer for safe async handoff.
    private final class RetainedPixelBuffer: @unchecked Sendable {
        let buffer: CVPixelBuffer

        init(_ buffer: CVPixelBuffer) {
            self.buffer = buffer
        }
    }

    private(set) var isRunning: Bool = false

    /// Delegate for receiving camera frames (for compositing)
    weak var frameDelegate: CameraFrameDelegate?

    private override init() {
        super.init()
    }

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

    // MARK: - Capture Control

    /// Start camera capture and create preview layer
    /// - Returns: The preview layer for display
    func startCapture() async throws -> AVCaptureVideoPreviewLayer {
        // If already running, just return existing layer
        if isRunning, let layer = previewLayer {
            return layer
        }

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

        // Create session and wrap immediately for Sendable safety
        let session = AVCaptureSession()
        let wrapper = SessionWrapper(session)
        session.sessionPreset = .medium

        // Add input
        guard session.canAddInput(input) else {
            throw CameraError.configurationFailed
        }
        session.addInput(input)

        // Add video data output for frame callbacks (used by compositor)
        let dataOutput = AVCaptureVideoDataOutput()
        dataOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        dataOutput.alwaysDiscardsLateVideoFrames = true
        dataOutput.setSampleBufferDelegate(self, queue: outputQueue)

        if session.canAddOutput(dataOutput) {
            session.addOutput(dataOutput)
        }

        // Create preview layer
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill

        // Start session on background queue using Sendable wrapper
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            sessionQueue.async { [wrapper] in
                wrapper.session.startRunning()
                continuation.resume()
            }
        }

        // Store references
        captureSession = session
        previewLayer = layer
        isRunning = true

        return layer
    }

    /// Stop camera capture
    func stopCapture() {
        guard let session = captureSession else { return }

        // Use Sendable wrapper for async dispatch
        let wrapper = SessionWrapper(session)
        sessionQueue.async { [wrapper] in
            wrapper.session.stopRunning()
        }

        captureSession = nil
        previewLayer = nil
        frameDelegate = nil
        isRunning = false
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    nonisolated func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let retained = RetainedPixelBuffer(pixelBuffer)
        Task { @MainActor in
            self.frameDelegate?.cameraService(didOutputPixelBuffer: retained.buffer)
        }
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
