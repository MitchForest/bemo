import ScreenCaptureKit
import AVFoundation

// MARK: - Recording State

enum RecordingState: Sendable {
    case idle
    case preparing
    case recording
    case stopping
}

// MARK: - Recording Configuration

struct RecordingConfiguration: Sendable {
    let region: CGRect
    let displayID: CGDirectDisplayID
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

// MARK: - Recording Errors

enum RecordingError: Error, LocalizedError {
    case alreadyRecording
    case notRecording
    case displayNotFound
    case streamCreationFailed
    case permissionDenied
    case recordingFailed(String)

    var errorDescription: String? {
        switch self {
        case .alreadyRecording:
            return "A recording is already in progress"
        case .notRecording:
            return "No recording is in progress"
        case .displayNotFound:
            return "Could not find the target display"
        case .streamCreationFailed:
            return "Failed to create screen capture stream"
        case .permissionDenied:
            return "Screen Recording permission required"
        case .recordingFailed(let message):
            return "Recording failed: \(message)"
        }
    }
}

// MARK: - Screen Recording Service

/// Service for recording screen regions using SCRecordingOutput (macOS 15+)
actor ScreenRecordingService {
    static let shared = ScreenRecordingService()

    // MARK: - State

    private(set) var state: RecordingState = .idle
    private var stream: SCStream?
    private var recordingOutput: SCRecordingOutput?
    private var currentConfig: RecordingConfiguration?
    private var currentStreamConfig: SCStreamConfiguration?
    private var recordingDelegate: RecordingOutputDelegate?
    private(set) var isMicrophoneMuted: Bool = false

    // Completion handler for when recording finishes
    private var finishContinuation: CheckedContinuation<Void, Error>?

    private init() {}

    // MARK: - Permission

    /// Check if we have screen recording permission
    func hasPermission() async -> Bool {
        do {
            _ = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            return true
        } catch {
            return false
        }
    }

    /// Request permission (triggers system dialog)
    func requestPermission() async -> Bool {
        await hasPermission()
    }

    // MARK: - Recording Control

    /// Start recording with the given configuration
    /// - Parameter config: Recording configuration
    func startRecording(config: RecordingConfiguration) async throws {
        guard state == .idle else {
            throw RecordingError.alreadyRecording
        }

        state = .preparing

        do {
            // Get shareable content
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

            // Find the target display
            guard let targetDisplay = content.displays.first(where: { $0.displayID == config.displayID }) else {
                state = .idle
                throw RecordingError.displayNotFound
            }

            // Get Bemo's bundle ID to exclude our windows
            let bundleID = Bundle.main.bundleIdentifier
            let excludedApps = content.applications.filter { $0.bundleIdentifier == bundleID }

            // Create content filter for the display
            let filter = SCContentFilter(
                display: targetDisplay,
                excludingApplications: excludedApps,
                exceptingWindows: []
            )

            // Calculate source rect in POINTS (not normalized!)
            // sourceRect is in the display's logical coordinate system (Quartz: top-left origin)
            // config.region is in Cocoa screen coordinates (bottom-left origin)

            let displayWidth = CGFloat(targetDisplay.width)
            let displayHeight = CGFloat(targetDisplay.height)

            // Quartz display frame (top-left origin coordinate system)
            let displayOriginX = CGFloat(targetDisplay.frame.origin.x)
            let displayOriginY = CGFloat(targetDisplay.frame.origin.y)

            // Get total screen height for Cocoa->Quartz Y conversion
            // The primary screen's height is the reference for Cocoa coordinates
            let primaryScreenHeight = NSScreen.screens.first?.frame.height ?? displayHeight

            // Convert Cocoa Y (bottom-left origin) to Quartz Y (top-left origin)
            // In Cocoa: region.minY is distance from bottom
            // In Quartz: we need distance from top
            let quartzRegionY = primaryScreenHeight - config.region.maxY

            // Calculate sourceRect relative to the display's origin (in points, NOT normalized)
            let sourceRect = CGRect(
                x: config.region.minX - displayOriginX,
                y: quartzRegionY - displayOriginY,
                width: config.region.width,
                height: config.region.height
            )

            print("[ScreenRecording] Cocoa Region: \(config.region)")
            print("[ScreenRecording] Display: \(displayWidth)x\(displayHeight) at (\(displayOriginX), \(displayOriginY))")
            print("[ScreenRecording] Primary screen height: \(primaryScreenHeight)")
            print("[ScreenRecording] SourceRect (points): \(sourceRect)")

            // Configure stream
            let streamConfig = SCStreamConfiguration()
            let scale = NSScreen.main?.backingScaleFactor ?? 2.0
            streamConfig.width = Int(config.region.width * scale)
            streamConfig.height = Int(config.region.height * scale)
            streamConfig.sourceRect = sourceRect
            streamConfig.destinationRect = CGRect(
                origin: .zero,
                size: CGSize(width: streamConfig.width, height: streamConfig.height)
            )
            streamConfig.showsCursor = true
            streamConfig.capturesAudio = config.captureSystemAudio
            streamConfig.captureMicrophone = config.captureMicrophone
            streamConfig.pixelFormat = kCVPixelFormatType_32BGRA
            streamConfig.minimumFrameInterval = CMTime(value: 1, timescale: 60)  // 60 fps max

            // Configure recording output
            let recordingConfig = SCRecordingOutputConfiguration()
            recordingConfig.outputURL = config.outputURL
            recordingConfig.outputFileType = .mp4
            recordingConfig.videoCodecType = .h264

            // Create delegate with completion callback
            let delegate = RecordingOutputDelegate { [weak self] error in
                Task { [weak self] in
                    await self?.handleRecordingFinished(error: error)
                }
            }
            recordingDelegate = delegate

            // Create recording output
            let output = SCRecordingOutput(configuration: recordingConfig, delegate: delegate)

            // Create stream
            let newStream = SCStream(filter: filter, configuration: streamConfig, delegate: nil)

            // Add recording output to stream
            try newStream.addRecordingOutput(output)

            // Start capture
            try await newStream.startCapture()

            // Store references
            stream = newStream
            recordingOutput = output
            currentConfig = config
            currentStreamConfig = streamConfig
            isMicrophoneMuted = false
            state = .recording

            print("[ScreenRecording] Started recording to \(config.outputURL.lastPathComponent)")

        } catch {
            state = .idle
            throw error
        }
    }

    /// Stop recording and return the output URL
    /// - Returns: URL to the recorded video file
    func stopRecording() async throws -> URL {
        guard state == .recording else {
            throw RecordingError.notRecording
        }

        guard let config = currentConfig else {
            throw RecordingError.notRecording
        }

        state = .stopping
        let outputURL = config.outputURL

        print("[ScreenRecording] Stopping capture...")

        // Stop capture - this triggers the delegate callbacks
        if let stream = stream {
            try await stream.stopCapture()
        }

        // Wait for the recording to be finalized
        // The delegate's recordingOutputDidFinishRecording will be called
        print("[ScreenRecording] Waiting for file finalization...")

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            self.finishContinuation = continuation

            // Set a timeout in case the delegate never fires
            Task {
                try? await Task.sleep(nanoseconds: 5_000_000_000)  // 5 second timeout
                if let cont = self.finishContinuation {
                    self.finishContinuation = nil
                    print("[ScreenRecording] Timeout waiting for finalization, proceeding anyway")
                    cont.resume()
                }
            }
        }

        // Cleanup
        stream = nil
        recordingOutput = nil
        currentConfig = nil
        currentStreamConfig = nil
        recordingDelegate = nil
        isMicrophoneMuted = false
        state = .idle

        // Verify file exists and has content
        let fileManager = FileManager.default
        if fileManager.fileExists(atPath: outputURL.path) {
            let attributes = try? fileManager.attributesOfItem(atPath: outputURL.path)
            let fileSize = attributes?[.size] as? Int64 ?? 0
            print("[ScreenRecording] File saved: \(outputURL.lastPathComponent) (\(fileSize) bytes)")
        } else {
            print("[ScreenRecording] Warning: Output file not found!")
        }

        return outputURL
    }

    /// Handle recording finished callback from delegate
    private func handleRecordingFinished(error: Error?) {
        if let error = error {
            print("[ScreenRecording] Recording finished with error: \(error.localizedDescription)")
            finishContinuation?.resume(throwing: RecordingError.recordingFailed(error.localizedDescription))
        } else {
            print("[ScreenRecording] Recording finished successfully")
            finishContinuation?.resume()
        }
        finishContinuation = nil
    }

    /// Cancel recording and delete partial file
    func cancelRecording() async {
        // Stop stream if running (ignore errors)
        if let stream = stream {
            try? await stream.stopCapture()
        }

        // Delete partial file if exists
        if let config = currentConfig {
            try? FileManager.default.removeItem(at: config.outputURL)
        }

        // Cancel any waiting continuation
        finishContinuation?.resume()
        finishContinuation = nil

        // Cleanup
        stream = nil
        recordingOutput = nil
        currentConfig = nil
        currentStreamConfig = nil
        recordingDelegate = nil
        isMicrophoneMuted = false
        state = .idle
    }

    // MARK: - Microphone Control

    /// Toggle microphone mute during recording
    func toggleMicrophone() async throws {
        guard state == .recording,
              let stream = stream,
              let config = currentStreamConfig else {
            return
        }

        // Toggle mute state
        isMicrophoneMuted.toggle()

        // Update stream configuration
        config.captureMicrophone = !isMicrophoneMuted

        do {
            try await stream.updateConfiguration(config)
            print("[ScreenRecording] Microphone \(isMicrophoneMuted ? "muted" : "unmuted")")
        } catch {
            // Revert state on failure
            isMicrophoneMuted.toggle()
            print("[ScreenRecording] Failed to toggle microphone: \(error)")
            throw error
        }
    }

    /// Set microphone mute state
    func setMicrophoneMuted(_ muted: Bool) async throws {
        guard state == .recording,
              let stream = stream,
              let config = currentStreamConfig,
              muted != isMicrophoneMuted else {
            return
        }

        isMicrophoneMuted = muted
        config.captureMicrophone = !muted

        do {
            try await stream.updateConfiguration(config)
            print("[ScreenRecording] Microphone \(muted ? "muted" : "unmuted")")
        } catch {
            isMicrophoneMuted = !muted
            print("[ScreenRecording] Failed to set microphone: \(error)")
            throw error
        }
    }

    /// Get elapsed recording time (approximate)
    var isRecording: Bool {
        state == .recording
    }
}

// MARK: - Recording Output Delegate

private final class RecordingOutputDelegate: NSObject, SCRecordingOutputDelegate, @unchecked Sendable {
    private let onFinished: (Error?) -> Void
    private var recordingError: Error?

    init(onFinished: @escaping (Error?) -> Void) {
        self.onFinished = onFinished
        super.init()
    }

    func recordingOutput(_ recordingOutput: SCRecordingOutput, didStartRecordingAt time: CMTime) {
        print("[ScreenRecording] Delegate: Started at \(time.seconds)s")
    }

    func recordingOutput(_ recordingOutput: SCRecordingOutput, didStopRecordingAt time: CMTime, error: (any Error)?) {
        print("[ScreenRecording] Delegate: Stopped at \(time.seconds)s")
        if let error = error {
            print("[ScreenRecording] Delegate: Stop error: \(error.localizedDescription)")
            recordingError = error
        }
    }

    func recordingOutputDidFinishRecording(_ recordingOutput: SCRecordingOutput) {
        print("[ScreenRecording] Delegate: Finished recording")
        onFinished(recordingError)
    }
}
