import SwiftUI

// MARK: - Recording Indicator View

/// Horizontal toolbar showing recording status, timer, mic toggle, and stop button
struct RecordingIndicatorView: View {
    let isMicEnabled: Bool
    let onStop: () -> Void
    let onMicToggle: () -> Void

    @StateObject private var audioMonitor = AudioLevelMonitor.shared
    @State private var elapsedSeconds: Int = 0
    @State private var isPulsing: Bool = false
    @State private var isMuted: Bool = false

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 12) {
            // Stop button
            Button(action: onStop) {
                Image(systemName: "stop.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 24, height: 24)
                    .background(Circle().fill(.red))
            }
            .buttonStyle(.plain)
            .help("Stop Recording")

            // Recording indicator + time
            HStack(spacing: 6) {
                // Pulsing dot
                Circle()
                    .fill(.red)
                    .frame(width: 8, height: 8)
                    .scaleEffect(isPulsing ? 1.0 : 0.7)
                    .opacity(isPulsing ? 1.0 : 0.6)

                // Timer
                Text(formattedTime)
                    .font(.system(size: 13, weight: .medium, design: .monospaced))
                    .foregroundStyle(.primary)
            }

            // Mic toggle with level meter (only show if mic was enabled at start)
            if isMicEnabled {
                // Divider
                Divider()
                    .frame(height: 20)
                    .opacity(0.3)

                HStack(spacing: 4) {
                    // Mic toggle button
                    Button {
                        isMuted.toggle()
                        onMicToggle()
                    } label: {
                        Image(systemName: isMuted ? "mic.slash.fill" : "mic.fill")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(isMuted ? .red : .primary)
                            .frame(width: 36, height: 36)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.primary.opacity(0.08))
                            )
                    }
                    .buttonStyle(.plain)
                    .help(isMuted ? "Unmute Microphone" : "Mute Microphone")

                    // Audio level meter - fixed width to prevent layout shifts
                    ZStack {
                        if audioMonitor.isMonitoring && !isMuted {
                            CompactAudioLevelMeterView(
                                level: audioMonitor.level,
                                isMuted: isMuted
                            )
                            .transition(.opacity)
                        }
                    }
                    .frame(width: 32)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.15), radius: 12, y: 6)
        .onAppear {
            isPulsing = true
            // Animate pulsing
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                isPulsing = true
            }
        }
        .onReceive(timer) { _ in
            elapsedSeconds += 1
        }
    }

    // MARK: - Formatted Time

    private var formattedTime: String {
        let minutes = elapsedSeconds / 60
        let seconds = elapsedSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 20) {
        RecordingIndicatorView(
            isMicEnabled: true,
            onStop: {},
            onMicToggle: {}
        )

        RecordingIndicatorView(
            isMicEnabled: false,
            onStop: {},
            onMicToggle: {}
        )
    }
    .padding()
    .background(Color.gray.opacity(0.3))
}
