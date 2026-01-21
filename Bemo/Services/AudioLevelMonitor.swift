import AVFoundation
import Combine

// MARK: - Audio Level Monitor

/// Monitors microphone input levels in real-time using AVAudioEngine
@MainActor
final class AudioLevelMonitor: ObservableObject {
    static let shared = AudioLevelMonitor()

    // MARK: - Published State

    @Published private(set) var level: Float = 0  // 0.0 to 1.0
    @Published private(set) var isMonitoring: Bool = false
    @Published private(set) var isMuted: Bool = false

    // MARK: - Private

    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var levelProcessor: AudioLevelProcessor?

    private init() {}

    // MARK: - Public API

    /// Start monitoring microphone input levels
    func startMonitoring() {
        guard !isMonitoring else { return }

        // Check permission first
        let status = AVCaptureDevice.authorizationStatus(for: .audio)
        guard status == .authorized else {
            if status == .notDetermined {
                Task {
                    let granted = await AVCaptureDevice.requestAccess(for: .audio)
                    if granted {
                        startMonitoring()
                    }
                }
            }
            return
        }

        let engine = AVAudioEngine()
        let input = engine.inputNode

        // Get the native format
        let format = input.outputFormat(forBus: 0)

        // Create processor that will handle audio on background thread
        let processor = AudioLevelProcessor { [weak self] normalizedLevel in
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                // Apply smoothing (decay slower than rise)
                if normalizedLevel > self.level {
                    self.level = normalizedLevel
                } else {
                    self.level = self.level * 0.85 + normalizedLevel * 0.15
                }
            }
        }
        levelProcessor = processor

        // Install tap on input node - callback runs on audio thread
        input.installTap(onBus: 0, bufferSize: 1024, format: format, block: processor.processBuffer)

        do {
            try engine.start()
            audioEngine = engine
            inputNode = input
            isMonitoring = true
        } catch {
            print("[AudioLevelMonitor] Failed to start: \(error)")
        }
    }

    /// Stop monitoring
    func stopMonitoring() {
        guard isMonitoring else { return }

        inputNode?.removeTap(onBus: 0)
        audioEngine?.stop()

        audioEngine = nil
        inputNode = nil
        levelProcessor = nil
        isMonitoring = false
        level = 0
    }

    /// Toggle mute state (affects visual feedback only, not actual recording)
    func toggleMute() {
        isMuted.toggle()
    }

    /// Set mute state
    func setMuted(_ muted: Bool) {
        isMuted = muted
    }
}

// MARK: - Audio Level Processor (Non-isolated)

/// Handles audio buffer processing on the audio thread
private final class AudioLevelProcessor: @unchecked Sendable {
    private let onLevelUpdate: @Sendable (Float) -> Void

    init(onLevelUpdate: @escaping @Sendable (Float) -> Void) {
        self.onLevelUpdate = onLevelUpdate
    }

    /// Process buffer - called on audio thread
    func processBuffer(_ buffer: AVAudioPCMBuffer, _ time: AVAudioTime) {
        guard let channelData = buffer.floatChannelData else { return }

        let channelDataValue = channelData.pointee
        let frameLength = Int(buffer.frameLength)
        let bufferStride = buffer.stride

        // Calculate RMS (root mean square) for a more accurate level
        var sumOfSquares: Float = 0
        for i in Swift.stride(from: 0, to: frameLength, by: bufferStride) {
            let sample = channelDataValue[i]
            sumOfSquares += sample * sample
        }
        let count = frameLength / bufferStride
        guard count > 0 else { return }

        let rms = sqrt(sumOfSquares / Float(count))

        // Convert to decibels and normalize to 0-1 range
        // -60 dB to 0 dB range
        let minDb: Float = -60
        let db = 20 * log10(max(rms, 0.0001))
        let normalizedLevel = max(0, min(1, (db - minDb) / (-minDb)))

        onLevelUpdate(normalizedLevel)
    }
}
