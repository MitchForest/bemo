import SwiftUI

// MARK: - Style Picker View

/// Popover for selecting recording style options
struct StylePickerView: View {
    @Binding var style: RecordingStyle
    let onCameraToggled: ((Bool) -> Void)?

    @State private var showAdvanced = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Background Section
            backgroundSection

            Divider().opacity(0.3)

            // Frame Section
            frameSection

            Divider().opacity(0.3)

            // Camera Section
            cameraSection

            // Advanced toggle
            if showAdvanced {
                Divider().opacity(0.3)
                advancedSection
            }

            // Show/hide advanced
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    showAdvanced.toggle()
                }
            } label: {
                HStack {
                    Text(showAdvanced ? "Less options" : "More options")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                    Image(systemName: showAdvanced ? "chevron.up" : "chevron.down")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .frame(width: 260)
    }

    // MARK: - Background Section

    private var backgroundSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Background")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            // Background presets grid
            LazyVGrid(columns: [
                GridItem(.fixed(44)),
                GridItem(.fixed(44)),
                GridItem(.fixed(44)),
                GridItem(.fixed(44)),
                GridItem(.fixed(44))
            ], spacing: 8) {
                ForEach(Array(BackgroundStyle.presets.enumerated()), id: \.offset) { _, preset in
                    BackgroundPresetButton(
                        preset: preset,
                        isSelected: style.background == preset,
                        action: { style.background = preset }
                    )
                }
            }
        }
    }

    // MARK: - Frame Section

    private var frameSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Frame")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            // Scale slider
            HStack {
                Text("Scale")
                    .font(.system(size: 12))
                    .frame(width: 60, alignment: .leading)
                Slider(value: $style.frameStyle.scale, in: 0.7...1.0, step: 0.05)
                Text("\(Int(style.frameStyle.scale * 100))%")
                    .font(.system(size: 11, design: .monospaced))
                    .frame(width: 36, alignment: .trailing)
            }

            // Corners slider
            HStack {
                Text("Corners")
                    .font(.system(size: 12))
                    .frame(width: 60, alignment: .leading)
                Slider(value: $style.frameStyle.cornerRadius, in: 0...24, step: 4)
                Text("\(Int(style.frameStyle.cornerRadius))")
                    .font(.system(size: 11, design: .monospaced))
                    .frame(width: 36, alignment: .trailing)
            }

            // Shadow slider
            HStack {
                Text("Shadow")
                    .font(.system(size: 12))
                    .frame(width: 60, alignment: .leading)
                Slider(value: $style.frameStyle.shadowRadius, in: 0...32, step: 4)
                Text("\(Int(style.frameStyle.shadowRadius))")
                    .font(.system(size: 11, design: .monospaced))
                    .frame(width: 36, alignment: .trailing)
            }
        }
    }

    // MARK: - Camera Section

    private var cameraSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Camera")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                Spacer()

                Toggle("", isOn: $style.cameraEnabled)
                    .toggleStyle(.switch)
                    .scaleEffect(0.7)
                    .onChange(of: style.cameraEnabled) { _, newValue in
                        onCameraToggled?(newValue)
                    }
            }

            if style.cameraEnabled {
                // Position picker
                HStack {
                    Text("Position")
                        .font(.system(size: 12))
                    Spacer()
                    HStack(spacing: 4) {
                        ForEach(CameraPosition.allCases, id: \.self) { position in
                            Button {
                                style.cameraPosition = position
                            } label: {
                                Image(systemName: position.icon)
                                    .font(.system(size: 10, weight: .medium))
                                    .frame(width: 24, height: 24)
                                    .background(
                                        style.cameraPosition == position
                                            ? Color.accentColor.opacity(0.2)
                                            : Color.clear
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 4))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Size picker
                HStack {
                    Text("Size")
                        .font(.system(size: 12))
                    Spacer()
                    Picker("", selection: $style.cameraSize) {
                        ForEach(CameraSize.allCases, id: \.self) { size in
                            Text(size.label).tag(size)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 100)
                }
            }
        }
    }

    // MARK: - Advanced Section

    private var advancedSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Output")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            // Resolution picker
            HStack {
                Text("Resolution")
                    .font(.system(size: 12))
                Spacer()
                Picker("", selection: $style.outputResolution) {
                    ForEach(OutputResolution.allCases, id: \.self) { res in
                        Text(res.displayName).tag(res)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 100)
            }
        }
    }
}

// MARK: - Background Preset Button

private struct BackgroundPresetButton: View {
    let preset: BackgroundStyle
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                // Background preview
                previewBackground
                    .frame(width: 40, height: 40)
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                // Selection indicator
                if isSelected {
                    RoundedRectangle(cornerRadius: 6)
                        .strokeBorder(Color.accentColor, lineWidth: 2)
                        .frame(width: 40, height: 40)

                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
        }
        .buttonStyle(.plain)
        .help(preset.displayName)
    }

    @ViewBuilder
    private var previewBackground: some View {
        switch preset {
        case .wallpaper:
            // Show desktop icon
            ZStack {
                LinearGradient(
                    colors: [.blue.opacity(0.6), .purple.opacity(0.6)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                Image(systemName: "photo")
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.7))
            }

        case .blur:
            // Show blur icon
            ZStack {
                LinearGradient(
                    colors: [.blue.opacity(0.4), .purple.opacity(0.4)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                Image(systemName: "photo.artframe")
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.7))
            }

        case .solid(let red, let green, let blue):
            Color(red: red, green: green, blue: blue)

        case .gradient(let startRed, let startGreen, let startBlue, let endRed, let endGreen, let endBlue):
            LinearGradient(
                colors: [
                    Color(red: startRed, green: startGreen, blue: startBlue),
                    Color(red: endRed, green: endGreen, blue: endBlue)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        }
    }
}

// MARK: - Preview

#Preview {
    StylePickerView(
        style: .constant(RecordingStyle.default),
        onCameraToggled: nil
    )
    .background(.ultraThinMaterial)
}
