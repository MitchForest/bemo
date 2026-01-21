import SwiftUI

// MARK: - Recording Indicator Design Constants

private enum IndicatorMetrics {
    static let buttonSize: CGFloat = 32
    static let iconSize: CGFloat = 14
    static let buttonRadius: CGFloat = 8
    static let dockRadius: CGFloat = 12
    static let dockPadding: CGFloat = 8
    static let dividerHeight: CGFloat = 24
}

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
            // Stop button (same size as other buttons)
            Button(action: onStop) {
                Image(systemName: "stop.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: IndicatorMetrics.buttonSize, height: IndicatorMetrics.buttonSize)
                    .background(Circle().fill(.red))
            }
            .buttonStyle(.plain)
            .help("Stop Recording (ESC)")

            // Recording indicator + time
            HStack(spacing: 8) {
                // Pulsing dot
                Circle()
                    .fill(.red)
                    .frame(width: 8, height: 8)
                    .scaleEffect(isPulsing ? 1.0 : 0.7)
                    .opacity(isPulsing ? 1.0 : 0.6)

                // Timer
                Text(formattedTime)
                    .font(.system(size: 14, weight: .medium, design: .monospaced))
                    .foregroundStyle(.primary)
                    .frame(minWidth: 44, alignment: .leading)
            }

            // Mic toggle with integrated level (only show if mic was enabled at start)
            if isMicEnabled {
                Divider()
                    .frame(height: IndicatorMetrics.dividerHeight)
                    .opacity(0.3)

                // Mic toggle button with integrated level indicator
                Button {
                    isMuted.toggle()
                    onMicToggle()
                } label: {
                    MicLevelIcon(
                        level: audioMonitor.isMonitoring ? audioMonitor.level : 0,
                        size: IndicatorMetrics.iconSize,
                        isMuted: isMuted,
                        isEnabled: true
                    )
                    .frame(width: IndicatorMetrics.buttonSize, height: IndicatorMetrics.buttonSize)
                    .background(
                        RoundedRectangle(cornerRadius: IndicatorMetrics.buttonRadius)
                            .fill(Color.primary.opacity(0.08))
                    )
                }
                .buttonStyle(.plain)
                .help(isMuted ? "Unmute (M)" : "Mute (M)")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, IndicatorMetrics.dockPadding)
        .background(
            RoundedRectangle(cornerRadius: IndicatorMetrics.dockRadius)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: IndicatorMetrics.dockRadius)
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.2), radius: 20, y: 8)
        .onAppear {
            // Start pulsing animation
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
