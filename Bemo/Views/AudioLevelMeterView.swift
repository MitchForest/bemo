import SwiftUI

// MARK: - Audio Level Meter View

/// Horizontal bar meter showing real-time audio levels
struct AudioLevelMeterView: View {
    let level: Float  // 0.0 to 1.0
    var barCount: Int = 5
    var spacing: CGFloat = 2
    var barWidth: CGFloat = 3
    var barHeight: CGFloat = 14
    var isMuted: Bool = false

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(0..<barCount, id: \.self) { index in
                RoundedRectangle(cornerRadius: 1)
                    .fill(barColor(for: index))
                    .frame(width: barWidth, height: barHeight(for: index))
            }
        }
        .opacity(isMuted ? 0.3 : 1)
        .animation(.easeOut(duration: 0.05), value: level)
    }

    // MARK: - Helpers

    private func barHeight(for index: Int) -> CGFloat {
        let threshold = Float(index + 1) / Float(barCount)
        let isActive = level >= threshold * 0.8  // Slightly lower threshold for responsiveness
        return isActive ? barHeight : barHeight * 0.4
    }

    private func barColor(for index: Int) -> Color {
        let threshold = Float(index + 1) / Float(barCount)
        let isActive = level >= threshold * 0.8

        if !isActive {
            return Color.secondary.opacity(0.3)
        }

        // Green for low, yellow for medium, red for high
        if index < barCount - 2 {
            return .green
        } else if index < barCount - 1 {
            return .yellow
        } else {
            return .red
        }
    }
}

// MARK: - Compact Audio Level Meter

/// Even more compact version for tight spaces
struct CompactAudioLevelMeterView: View {
    let level: Float
    var isMuted: Bool = false

    var body: some View {
        AudioLevelMeterView(
            level: level,
            barCount: 4,
            spacing: 1.5,
            barWidth: 2.5,
            barHeight: 10,
            isMuted: isMuted
        )
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 20) {
        AudioLevelMeterView(level: 0.3)
        AudioLevelMeterView(level: 0.6)
        AudioLevelMeterView(level: 0.9)
        AudioLevelMeterView(level: 0.5, isMuted: true)
        CompactAudioLevelMeterView(level: 0.7)
    }
    .padding()
    .background(Color.black.opacity(0.8))
}
