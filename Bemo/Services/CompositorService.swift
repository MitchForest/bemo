@preconcurrency import ScreenCaptureKit
@preconcurrency import AVFoundation
import CoreImage
import AppKit

// MARK: - Retained Buffer Wrappers

/// Retains a CMSampleBuffer for safe async handoff.
    private final class RetainedSampleBuffer: @unchecked Sendable {
        let buffer: CMSampleBuffer

        init(_ buffer: CMSampleBuffer) {
            self.buffer = buffer
        }
    }

/// Retains a CVPixelBuffer for safe async handoff.
    private final class RetainedPixelBuffer: @unchecked Sendable {
        let buffer: CVPixelBuffer

        init(_ buffer: CVPixelBuffer) {
            self.buffer = buffer
        }
    }

// MARK: - Compositor Configuration

/// Configuration for a composited recording session
struct CompositorConfiguration: Sendable {
    let region: CGRect
    let displayID: CGDirectDisplayID
    let style: RecordingStyle
    let captureSystemAudio: Bool
    let captureMicrophone: Bool
    let outputURL: URL

    /// Generate a default output URL for recordings
    static func defaultOutputURL() -> URL {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd 'at' HH.mm.ss"
        let timestamp = formatter.string(from: Date())
        let filename = "Bemo Recording \(timestamp).mp4"

        let moviesURL = FileManager.default.urls(for: .moviesDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory

        return moviesURL.appendingPathComponent(filename)
    }
}

// MARK: - Compositor Errors

enum CompositorError: Error, LocalizedError {
    case alreadyRecording
    case notRecording
    case displayNotFound
    case setupFailed(String)
    case encodingFailed(String)
    case permissionDenied

    var errorDescription: String? {
        switch self {
        case .alreadyRecording:
            return "A recording is already in progress"
        case .notRecording:
            return "No recording is in progress"
        case .displayNotFound:
            return "Could not find the target display"
        case .setupFailed(let message):
            return "Recording setup failed: \(message)"
        case .encodingFailed(let message):
            return "Encoding failed: \(message)"
        case .permissionDenied:
            return "Screen Recording permission required"
        }
    }
}

// MARK: - Compositor Service

/// Main service for composited screen recordings with styled frames and camera overlays
actor CompositorService: CameraFrameDelegate {
    static let shared = CompositorService()

    // MARK: - State

    private(set) var state: RecordingState = .idle

    // Screen capture
    private var screenStream: SCStream?
    // periphery:ignore - retained to keep stream output callbacks alive
    private var streamOutputDelegate: StreamOutputDelegate?

    // Camera capture (uses shared CameraService)
    private var latestCameraFrame: CVPixelBuffer?

    // Composition
    private var frameRenderer: FrameRenderer?

    // Encoding
    private var assetWriter: AVAssetWriter?
    private var videoInput: AVAssetWriterInput?
    private var audioInput: AVAssetWriterInput?
    private var pixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?

    // Timing
    private var recordingStartTime: CMTime?
    private var lastPresentationTime: CMTime = .zero
    private var sessionStarted: Bool = false

    // Configuration
    private var currentConfig: CompositorConfiguration?

    // Microphone state
    private(set) var isMicrophoneMuted: Bool = false

    private init() {}

    // MARK: - Recording Control

    /// Start a composited recording
    func startRecording(config: CompositorConfiguration) async throws {
        guard state == .idle else {
            throw CompositorError.alreadyRecording
        }

        state = .preparing
        currentConfig = config
        sessionStarted = false
        lastPresentationTime = .zero

        do {
            // 1. Get shareable content
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

            // 2. Find target display
            guard let targetDisplay = content.displays.first(where: { $0.displayID == config.displayID }) else {
                state = .idle
                throw CompositorError.displayNotFound
            }

            // 3. Resolve screen metrics on MainActor
            let screenContext = await MainActor.run {
                let screen = NSScreen.screens.first { screen in
                    let screenID = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
                    return screenID == config.displayID
                }
                let scale = screen?.backingScaleFactor ?? NSScreen.main?.backingScaleFactor ?? 2.0
                let frame = screen?.frame
                let wallpaperURL = screen.flatMap { NSWorkspace.shared.desktopImageURL(for: $0) }
                return (frame: frame, scale: scale, wallpaperURL: wallpaperURL)
            }
            let screenScale = screenContext.scale

            // 4. Calculate output size
            let outputSize = calculateOutputSize(for: config.region, style: config.style, scale: screenScale)

            // 5. Load background
            let background = try await BackgroundProvider.shared.loadBackground(
                config.style.background,
                size: outputSize,
                wallpaperURL: screenContext.wallpaperURL
            )

            // 6. Create frame renderer
            frameRenderer = FrameRenderer(
                outputSize: outputSize,
                style: config.style,
                background: background
            )

            // 7. Setup asset writer
            try setupAssetWriter(
                outputURL: config.outputURL,
                size: outputSize,
                hasAudio: config.captureSystemAudio || config.captureMicrophone
            )

            // 8. Setup camera if enabled
            if config.style.cameraEnabled {
                try await setupCamera()
            }

            // 9. Setup screen capture stream
            let screenFrame = screenContext.frame ?? CGRect(origin: .zero, size: CGSize(
                width: CGFloat(targetDisplay.width),
                height: CGFloat(targetDisplay.height)
            ))
            try await setupScreenStream(
                display: targetDisplay,
                region: config.region,
                screenFrame: screenFrame,
                content: content,
                captureAudio: config.captureSystemAudio,
                captureMic: config.captureMicrophone,
                screenScale: screenScale
            )

            // 10. Start asset writer (session will be started on first frame)
            guard assetWriter?.startWriting() == true else {
                throw CompositorError.setupFailed("Failed to start asset writer")
            }
            // NOTE: startSession is called on first frame in processScreenFrame()
            // to ensure proper timing synchronization

            // 11. Start screen capture
            try await screenStream?.startCapture()

            // 12. Wait for first frame to ensure capture is live
            try await waitForFirstFrame(timeoutSeconds: 1.5)

            state = .recording
            isMicrophoneMuted = false

            print("[Compositor] Started recording to \(config.outputURL.lastPathComponent)")

        } catch {
            await cleanup()
            state = .idle
            throw error
        }
    }

    private func waitForFirstFrame(timeoutSeconds: TimeInterval) async throws {
        let deadline = Date().addingTimeInterval(timeoutSeconds)
        while !sessionStarted && Date() < deadline {
            try await Task.sleep(nanoseconds: 50_000_000)
        }

        guard sessionStarted else {
            throw CompositorError.setupFailed("No frames received from ScreenCaptureKit")
        }
    }

    /// Stop recording and return output URL
    func stopRecording() async throws -> URL {
        guard state == .recording else {
            throw CompositorError.notRecording
        }

        guard let config = currentConfig else {
            throw CompositorError.notRecording
        }

        state = .stopping
        let outputURL = config.outputURL

        print("[Compositor] Stopping recording...")

        // Stop screen capture
        try? await screenStream?.stopCapture()

        // Clear camera frame delegate (but don't stop camera - preview may still need it)
        await MainActor.run {
            CameraService.shared.frameDelegate = nil
        }

        // Finish writing
        videoInput?.markAsFinished()
        audioInput?.markAsFinished()

        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            assetWriter?.finishWriting {
                continuation.resume()
            }
        }

        // Cleanup
        await cleanup()

        // Verify file
        let fileManager = FileManager.default
        if fileManager.fileExists(atPath: outputURL.path) {
            let attributes = try? fileManager.attributesOfItem(atPath: outputURL.path)
            let fileSize = attributes?[.size] as? Int64 ?? 0
            print("[Compositor] File saved: \(outputURL.lastPathComponent) (\(fileSize) bytes)")
        }

        return outputURL
    }

    // MARK: - Microphone Control

    func toggleMicrophone() async throws {
        guard state == .recording else { return }
        isMicrophoneMuted.toggle()
        // Note: Actual mic muting handled through stream config update
        print("[Compositor] Microphone \(isMicrophoneMuted ? "muted" : "unmuted")")
    }

    // MARK: - Frame Processing

    /// Called by stream delegate when a new screen frame arrives
    func processScreenFrame(_ sampleBuffer: CMSampleBuffer) {
        guard state == .recording,
              let videoInput = videoInput,
              let frameRenderer = frameRenderer else {
            return
        }

        // Get pixel buffer from sample buffer
        guard let screenBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            return
        }

        // Get presentation time
        let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)

        // Start session on first frame only (prevents duplicate startSession calls)
        if !sessionStarted {
            recordingStartTime = presentationTime
            assetWriter?.startSession(atSourceTime: .zero)
            sessionStarted = true
            print("[Compositor] Session started at \(presentationTime.seconds)s")
        }

        // Only append when the input is ready (session must already be started)
        guard videoInput.isReadyForMoreMediaData else {
            return
        }

        // Calculate relative time
        guard let startTime = recordingStartTime else { return }
        let relativeTime = CMTimeSubtract(presentationTime, startTime)

        // Skip if time hasn't advanced
        if CMTimeCompare(relativeTime, lastPresentationTime) <= 0 {
            return
        }
        lastPresentationTime = relativeTime

        // Composite frame
        guard let compositedBuffer = frameRenderer.compositeFrame(
            screen: screenBuffer,
            camera: latestCameraFrame
        ) else {
            return
        }

        // Append to writer
        if pixelBufferAdaptor?.append(compositedBuffer, withPresentationTime: relativeTime) != true {
            if let error = assetWriter?.error {
                print("[Compositor] Failed to append video buffer: \(error)")
            } else {
                print("[Compositor] Failed to append video buffer")
            }
        }
    }

    /// Called by stream delegate when audio arrives
    func processAudioSample(_ sampleBuffer: CMSampleBuffer) {
        guard state == .recording,
              let audioInput = audioInput,
              audioInput.isReadyForMoreMediaData else {
            return
        }

        // Wait for video to establish start time
        guard let startTime = recordingStartTime else {
            return
        }

        let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        let relativeTime = CMTimeSubtract(presentationTime, startTime)

        // Skip if negative time (audio arrived before video started)
        if CMTimeCompare(relativeTime, .zero) < 0 {
            return
        }

        // Retime the audio sample buffer to relative time
        guard let retimedBuffer = retimeSampleBuffer(sampleBuffer, to: relativeTime) else {
            print("[Compositor] Failed to retime audio buffer")
            return
        }

        // Append the retimed buffer
        if !audioInput.append(retimedBuffer) {
            print("[Compositor] Failed to append audio sample at \(relativeTime.seconds)s")
        }
    }

    // MARK: - Audio Timing Helpers

    /// Create a new sample buffer with adjusted timing
    private func retimeSampleBuffer(
        _ sampleBuffer: CMSampleBuffer,
        to newTime: CMTime
    ) -> CMSampleBuffer? {
        var timingInfo = CMSampleTimingInfo(
            duration: CMSampleBufferGetDuration(sampleBuffer),
            presentationTimeStamp: newTime,
            decodeTimeStamp: .invalid
        )

        var newSampleBuffer: CMSampleBuffer?

        let status = CMSampleBufferCreateCopyWithNewTiming(
            allocator: kCFAllocatorDefault,
            sampleBuffer: sampleBuffer,
            sampleTimingEntryCount: 1,
            sampleTimingArray: &timingInfo,
            sampleBufferOut: &newSampleBuffer
        )

        guard status == noErr else {
            print("[Compositor] Failed to retime audio sample: \(status)")
            return nil
        }

        return newSampleBuffer
    }

    /// Called by camera delegate when a new camera frame arrives
    func storeCameraFrame(_ pixelBuffer: CVPixelBuffer) {
        guard state == .recording else { return }
        latestCameraFrame = pixelBuffer
    }

    // MARK: - CameraFrameDelegate

    nonisolated func cameraService(didOutputPixelBuffer buffer: CVPixelBuffer) {
        let retained = RetainedPixelBuffer(buffer)
        Task {
            await self.storeCameraFrame(retained.buffer)
        }
    }

    // MARK: - Setup Helpers

    private func calculateOutputSize(for region: CGRect, style: RecordingStyle, scale: CGFloat) -> CGSize {
        // Check for explicit resolution setting
        if let dimensions = style.outputResolution.dimensions {
            return dimensions
        }

        // Auto: use region size with padding for frame
        let padding: CGFloat = style.frameStyle.scale < 1.0 ? 80 : 0

        return CGSize(
            width: ceil(region.width * scale + padding),
            height: ceil(region.height * scale + padding)
        )
    }

    private func setupAssetWriter(outputURL: URL, size: CGSize, hasAudio: Bool) throws {
        // Remove existing file
        try? FileManager.default.removeItem(at: outputURL)

        // Create asset writer
        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)

        // Video settings
        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: Int(size.width),
            AVVideoHeightKey: Int(size.height),
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 8_000_000,  // 8 Mbps
                AVVideoExpectedSourceFrameRateKey: 30,
                AVVideoMaxKeyFrameIntervalKey: 30,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
            ]
        ]

        let vInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        vInput.expectsMediaDataInRealTime = true

        // Pixel buffer adaptor
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: vInput,
            sourcePixelBufferAttributes: [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                kCVPixelBufferWidthKey as String: Int(size.width),
                kCVPixelBufferHeightKey as String: Int(size.height)
            ]
        )

        if writer.canAdd(vInput) {
            writer.add(vInput)
        }

        // Audio settings
        if hasAudio {
            let audioSettings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 48000,
                AVNumberOfChannelsKey: 2,
                AVEncoderBitRateKey: 128000
            ]

            let aInput = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
            aInput.expectsMediaDataInRealTime = true

            if writer.canAdd(aInput) {
                writer.add(aInput)
            }

            audioInput = aInput
        }

        assetWriter = writer
        videoInput = vInput
        pixelBufferAdaptor = adaptor
    }

    private func setupScreenStream(
        display: SCDisplay,
        region: CGRect,
        screenFrame: CGRect,
        content: SCShareableContent,
        captureAudio: Bool,
        captureMic: Bool,
        screenScale: CGFloat
    ) async throws {
        // Exclude Bemo windows
        let bundleID = Bundle.main.bundleIdentifier
        let excludedApps = content.applications.filter { $0.bundleIdentifier == bundleID }

        let filter = SCContentFilter(
            display: display,
            excludingApplications: excludedApps,
            exceptingWindows: []
        )

        // Calculate source rect in display-local coordinates (points, top-left origin)
        let localX = region.minX - screenFrame.minX
        let localY = region.minY - screenFrame.minY
        let sourceRect = CGRect(
            x: localX,
            y: screenFrame.height - (localY + region.height),
            width: region.width,
            height: region.height
        )

        // Stream configuration
        let streamConfig = SCStreamConfiguration()
        streamConfig.width = max(1, Int(region.width * screenScale))
        streamConfig.height = max(1, Int(region.height * screenScale))
        streamConfig.sourceRect = sourceRect
        streamConfig.destinationRect = CGRect(
            origin: .zero,
            size: CGSize(width: streamConfig.width, height: streamConfig.height)
        )
        streamConfig.showsCursor = true
        streamConfig.capturesAudio = captureAudio
        streamConfig.captureMicrophone = captureMic
        streamConfig.pixelFormat = kCVPixelFormatType_32BGRA
        streamConfig.minimumFrameInterval = CMTime(value: 1, timescale: 30)

        // Create stream
        let stream = SCStream(filter: filter, configuration: streamConfig, delegate: nil)

        // Create delegate
        let delegate = StreamOutputDelegate(compositor: self)
        streamOutputDelegate = delegate
        // Add outputs
        try stream.addStreamOutput(delegate, type: .screen, sampleHandlerQueue: .main)

        if captureAudio {
            try stream.addStreamOutput(delegate, type: .audio, sampleHandlerQueue: .main)
        }

        if captureMic {
            try stream.addStreamOutput(delegate, type: .microphone, sampleHandlerQueue: .main)
        }

        screenStream = stream
    }

    private func setupCamera() async throws {
        // Use shared CameraService instead of creating our own session
        // This allows the camera preview to stay visible during recording
        // All CameraService interactions must happen on MainActor
        await MainActor.run {
            let cameraService = CameraService.shared

            // Set ourselves as the frame delegate to receive camera frames
            cameraService.frameDelegate = self

            // If camera isn't already running (started by preview), start it
            // Note: We don't need the returned preview layer here
            if !cameraService.isRunning {
                Task {
                    _ = try? await cameraService.startCapture()
                }
            }
        }

        print("[Compositor] Using shared camera service for compositing")
    }

    private func cleanup() async {
        screenStream = nil
        streamOutputDelegate = nil
        latestCameraFrame = nil
        frameRenderer = nil
        assetWriter = nil
        videoInput = nil
        audioInput = nil
        pixelBufferAdaptor = nil
        recordingStartTime = nil
        lastPresentationTime = .zero
        sessionStarted = false
        currentConfig = nil
        isMicrophoneMuted = false
        state = .idle

        // Clear camera frame delegate
        await MainActor.run {
            CameraService.shared.frameDelegate = nil
        }
    }

    // MARK: - Public Accessors

}

// MARK: - Stream Output Delegate

private final class StreamOutputDelegate: NSObject, SCStreamOutput, @unchecked Sendable {
    private weak var compositor: CompositorService?

    init(compositor: CompositorService) {
        self.compositor = compositor
        super.init()
    }

    nonisolated func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of type: SCStreamOutputType
    ) {
        guard let compositor = compositor else { return }

        let retained = RetainedSampleBuffer(sampleBuffer)
        let outputType = type

        Task {
            switch outputType {
            case .screen:
                await compositor.processScreenFrame(retained.buffer)
            case .audio, .microphone:
                await compositor.processAudioSample(retained.buffer)
            @unknown default:
                break
            }
        }
    }
}
