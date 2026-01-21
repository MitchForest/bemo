import SwiftUI

// MARK: - Mic Level Icon

/// Microphone icon with interior fill based on audio level.
/// The fill animates from bottom to top with a color gradient
/// that transitions from green (low) to yellow (medium) to red (high).
struct MicLevelIcon: View {
    let level: Float  // 0.0 to 1.0
    var size: CGFloat = 20
    var isMuted: Bool = false
    var isEnabled: Bool = true

    // Animate level changes smoothly
    @State private var animatedLevel: Float = 0

    var body: some View {
        ZStack {
            if isMuted {
                // Muted state - show slash icon in red
                Image(systemName: "mic.slash.fill")
                    .font(.system(size: size, weight: .medium))
                    .foregroundStyle(.red)
            } else if !isEnabled {
                // Disabled state - show slash icon in secondary
                Image(systemName: "mic.slash.fill")
                    .font(.system(size: size, weight: .medium))
                    .foregroundStyle(.secondary)
            } else {
                // Active state with level fill
                ZStack {
                    // Background mic (empty state)
                    Image(systemName: "mic.fill")
                        .font(.system(size: size, weight: .medium))
                        .foregroundStyle(Color.primary.opacity(0.15))

                    // Filled mic (masked by level)
                    Image(systemName: "mic.fill")
                        .font(.system(size: size, weight: .medium))
                        .foregroundStyle(levelGradient)
                        .mask(
                            // Mask from bottom based on level
                            GeometryReader { geo in
                                Rectangle()
                                    .frame(height: geo.size.height * CGFloat(animatedLevel))
                                    .frame(maxHeight: .infinity, alignment: .bottom)
                            }
                        )

                    // Mic outline for definition
                    Image(systemName: "mic")
                        .font(.system(size: size, weight: .medium))
                        .foregroundStyle(Color.primary.opacity(0.4))
                }
            }
        }
        .frame(width: size * 1.5, height: size * 1.5)
        .onChange(of: level) { _, newLevel in
            withAnimation(.easeOut(duration: 0.08)) {
                animatedLevel = newLevel
            }
        }
        .onAppear {
            animatedLevel = level
        }
    }

    // MARK: - Level Gradient

    private var levelGradient: LinearGradient {
        // Color transitions based on level
        let colors: [Color]

        if animatedLevel < 0.5 {
            // Low level - green
            colors = [.green.opacity(0.8), .green]
        } else if animatedLevel < 0.8 {
            // Medium level - green to yellow
            colors = [.green, .yellow]
        } else {
            // High level - yellow to red
            colors = [.yellow, .red]
        }

        return LinearGradient(
            colors: colors,
            startPoint: .bottom,
            endPoint: .top
        )
    }
}

// MARK: - Preview

#Preview {
    HStack(spacing: 20) {
        // Various states
        VStack {
            MicLevelIcon(level: 0.0, size: 24)
            Text("0%").font(.caption2)
        }
        VStack {
            MicLevelIcon(level: 0.3, size: 24)
            Text("30%").font(.caption2)
        }
        VStack {
            MicLevelIcon(level: 0.6, size: 24)
            Text("60%").font(.caption2)
        }
        VStack {
            MicLevelIcon(level: 0.9, size: 24)
            Text("90%").font(.caption2)
        }
        VStack {
            MicLevelIcon(level: 0.5, size: 24, isMuted: true)
            Text("Muted").font(.caption2)
        }
        VStack {
            MicLevelIcon(level: 0.0, size: 24, isEnabled: false)
            Text("Off").font(.caption2)
        }
    }
    .padding()
    .background(Color.black.opacity(0.8))
}
