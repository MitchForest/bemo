import SwiftUI
import AVFoundation

// MARK: - Recording Options

struct RecordingOptions: Sendable {
    var captureSystemAudio: Bool = true
    var captureMicrophone: Bool = false
    var includeCamera: Bool = false
    var cameraPosition: CameraPosition = .bottomRight
    var cameraSize: CameraSize = .medium
    var delaySeconds: Int = 0  // 0 = no delay, 5, or 10
}

// MARK: - Recording Controls View (Horizontal Toolbar)

/// Pre-recording toolbar styled like macOS native screenshot bar
struct RecordingControlsView: View {
    let regionSize: CGSize
    let onStart: (RecordingOptions) -> Void
    let onCancel: () -> Void
    let onCameraToggled: ((Bool) -> Void)?  // Callback when camera is toggled

    @StateObject private var audioMonitor = AudioLevelMonitor.shared
    @State private var options = RecordingOptions()
    @State private var micPermissionStatus: AVAuthorizationStatus = .notDetermined
    @State private var cameraPermissionStatus: AVAuthorizationStatus = .notDetermined
    @State private var showCameraOptions = false
    @State private var showRecordMenu = false

    init(
        regionSize: CGSize,
        onStart: @escaping (RecordingOptions) -> Void,
        onCancel: @escaping () -> Void,
        onCameraToggled: ((Bool) -> Void)? = nil
    ) {
        self.regionSize = regionSize
        self.onStart = onStart
        self.onCancel = onCancel
        self.onCameraToggled = onCameraToggled
    }

    var body: some View {
        HStack(spacing: 0) {
            // Left section - toggle buttons with audio meter
            HStack(spacing: 2) {
                // System Audio
                ToolbarToggle(
                    icon: options.captureSystemAudio ? "speaker.wave.2.fill" : "speaker.slash.fill",
                    isOn: $options.captureSystemAudio,
                    tooltip: "System Audio"
                )

                // Microphone with level meter
                HStack(spacing: 4) {
                    ToolbarToggle(
                        icon: options.captureMicrophone ? "mic.fill" : "mic.slash.fill",
                        isOn: $options.captureMicrophone,
                        tooltip: "Microphone",
                        disabled: micPermissionStatus == .denied
                    )
                    .onChange(of: options.captureMicrophone) { _, newValue in
                        if newValue {
                            if micPermissionStatus == .notDetermined {
                                Task {
                                    _ = await AVCaptureDevice.requestAccess(for: .audio)
                                    micPermissionStatus = AVCaptureDevice.authorizationStatus(for: .audio)
                                    if micPermissionStatus == .authorized {
                                        audioMonitor.startMonitoring()
                                    }
                                }
                            } else if micPermissionStatus == .authorized {
                                audioMonitor.startMonitoring()
                            }
                        } else {
                            audioMonitor.stopMonitoring()
                        }
                    }

                    // Audio meter - fixed width container to prevent layout shifts
                    ZStack {
                        if options.captureMicrophone && audioMonitor.isMonitoring {
                            CompactAudioLevelMeterView(level: audioMonitor.level)
                                .transition(.opacity)
                        }
                    }
                    .frame(width: 32)  // Reserve space for meter
                }

                // Camera with popover
                ToolbarToggle(
                    icon: options.includeCamera ? "video.fill" : "video.slash.fill",
                    isOn: $options.includeCamera,
                    tooltip: "Camera",
                    disabled: cameraPermissionStatus == .denied,
                    hasMenu: true,
                    onLongPress: { showCameraOptions.toggle() }
                )
                .onChange(of: options.includeCamera) { _, newValue in
                    if newValue && cameraPermissionStatus == .notDetermined {
                        Task {
                            _ = await AVCaptureDevice.requestAccess(for: .video)
                            cameraPermissionStatus = AVCaptureDevice.authorizationStatus(for: .video)
                            if cameraPermissionStatus == .authorized {
                                onCameraToggled?(true)
                            }
                        }
                    } else {
                        onCameraToggled?(newValue)
                    }
                }
                .popover(isPresented: $showCameraOptions, arrowEdge: .bottom) {
                    cameraOptionsPopover
                }
            }
            .padding(.horizontal, 8)

            // Divider
            Divider()
                .frame(height: 24)
                .opacity(0.3)

            // Center - dimensions (stacked, left aligned)
            VStack(alignment: .leading, spacing: 0) {
                Text("\(Int(regionSize.width)) ×")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundStyle(.secondary)
                Text("\(Int(regionSize.height))")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            .frame(width: 60, alignment: .leading)  // Fixed width to prevent layout shifts
            .padding(.horizontal, 8)

            // Divider
            Divider()
                .frame(height: 24)
                .opacity(0.3)

            // Right section - action buttons
            HStack(spacing: 8) {
                // Cancel
                Button(action: {
                    audioMonitor.stopMonitoring()
                    onCancel()
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 28, height: 28)
                        .background(Color.secondary.opacity(0.1))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .help("Cancel")

                // Record button with dropdown
                recordButton
            }
            .padding(.horizontal, 8)
        }
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.2), radius: 20, y: 8)
        .onAppear {
            checkPermissions()
        }
        // NOTE: Don't stop audio monitoring on disappear - it continues during recording
    }

    // MARK: - Record Button with Dropdown

    private var recordButton: some View {
        HStack(spacing: 0) {
            // Record button - starts recording with current delay setting
            Button {
                startRecording()
            } label: {
                HStack(spacing: 4) {
                    Circle()
                        .fill(.red)
                        .frame(width: 16, height: 16)

                    // Show delay if set
                    if options.delaySeconds > 0 {
                        Text("\(options.delaySeconds)s")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
            }
            .buttonStyle(.plain)
            .help(options.delaySeconds > 0 ? "Start Recording with \(options.delaySeconds)s delay" : "Start Recording")

            // Dropdown chevron
            Button {
                showRecordMenu.toggle()
            } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.secondary)
                    .frame(width: 20, height: 32)
            }
            .buttonStyle(.plain)
            .popover(isPresented: $showRecordMenu, arrowEdge: .bottom) {
                recordDelayMenu
            }
        }
        .background(Color.primary.opacity(0.08))
        .clipShape(Capsule())
    }

    // MARK: - Record Delay Menu

    private var recordDelayMenu: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Just select the delay - don't start recording
            DelayMenuItem(
                label: "No Delay",
                delay: 0,
                icon: "record.circle",
                isSelected: options.delaySeconds == 0
            ) {
                options.delaySeconds = 0
                showRecordMenu = false
            }

            DelayMenuItem(
                label: "5 Second Delay",
                delay: 5,
                icon: "timer",
                isSelected: options.delaySeconds == 5
            ) {
                options.delaySeconds = 5
                showRecordMenu = false
            }

            DelayMenuItem(
                label: "10 Second Delay",
                delay: 10,
                icon: "timer",
                isSelected: options.delaySeconds == 10
            ) {
                options.delaySeconds = 10
                showRecordMenu = false
            }
        }
        .padding(8)
        .frame(width: 160)
    }

    // MARK: - Camera Options Popover

    private var cameraOptionsPopover: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Camera Options")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            // Position
            HStack {
                Text("Position")
                    .font(.system(size: 12))
                Spacer()
                HStack(spacing: 4) {
                    ForEach(CameraPosition.allCases, id: \.self) { position in
                        Button {
                            options.cameraPosition = position
                        } label: {
                            Image(systemName: position.icon)
                                .font(.system(size: 10, weight: .medium))
                                .frame(width: 24, height: 24)
                                .background(
                                    options.cameraPosition == position
                                        ? Color.accentColor.opacity(0.2)
                                        : Color.clear
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            // Size
            HStack {
                Text("Size")
                    .font(.system(size: 12))
                Spacer()
                Picker("", selection: $options.cameraSize) {
                    ForEach(CameraSize.allCases, id: \.self) { size in
                        Text(size.label).tag(size)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 100)
            }
        }
        .padding(12)
        .frame(width: 200)
    }

    // MARK: - Actions

    private func startRecording() {
        // Keep audio monitoring running - it will be used during recording
        onStart(options)
    }

    private func checkPermissions() {
        micPermissionStatus = AVCaptureDevice.authorizationStatus(for: .audio)
        cameraPermissionStatus = AVCaptureDevice.authorizationStatus(for: .video)
    }
}

// MARK: - Delay Menu Item

private struct DelayMenuItem: View {
    let label: String
    let delay: Int
    let icon: String
    var isSelected: Bool = false
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .frame(width: 16)

                Text(label)
                    .font(.system(size: 12))

                Spacer()

                // Checkmark for selected item
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.accentColor)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(isHovered || isSelected ? Color.primary.opacity(0.1) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
    }
}

// MARK: - Toolbar Toggle Button

private struct ToolbarToggle: View {
    let icon: String
    @Binding var isOn: Bool
    var tooltip: String = ""
    var disabled: Bool = false
    var hasMenu: Bool = false
    var onLongPress: (() -> Void)?

    @State private var isHovered = false

    // Check if this is a "slash" icon (off state)
    private var isSlashIcon: Bool {
        icon.contains(".slash")
    }

    var body: some View {
        Button {
            if !disabled {
                isOn.toggle()
            }
        } label: {
            ZStack(alignment: .bottomTrailing) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(iconColor)
                    .frame(width: 36, height: 36)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(isHovered ? Color.primary.opacity(0.08) : Color.clear)
                    )

                if hasMenu {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 6, weight: .bold))
                        .foregroundStyle(.secondary)
                        .offset(x: -4, y: -4)
                }
            }
        }
        .buttonStyle(.plain)
        .opacity(disabled ? 0.4 : 1)
        .help(tooltip)
        .onHover { isHovered = $0 }
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.3)
                .onEnded { _ in onLongPress?() }
        )
    }

    private var iconColor: Color {
        if isOn {
            return .primary  // White when on
        } else if isSlashIcon {
            return .red  // Red slash when off
        } else {
            return .secondary
        }
    }
}
