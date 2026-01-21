import SwiftUI
import AVFoundation

// MARK: - Design Constants

private enum DockMetrics {
    static let buttonSize: CGFloat = 32
    static let iconSize: CGFloat = 14
    static let buttonRadius: CGFloat = 8
    static let buttonSpacing: CGFloat = 4
    static let sectionPadding: CGFloat = 8
    static let dividerHeight: CGFloat = 24
    static let dockRadius: CGFloat = 12
    static let dockPadding: CGFloat = 8
}

// MARK: - Recording Options

struct RecordingOptions: Sendable {
    var captureSystemAudio: Bool = true
    var captureMicrophone: Bool = false
    var style: RecordingStyle = .default
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
    @State private var showStylePicker = false
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

    @State private var isStyleHovered = false
    @State private var isMicHovered = false

    var body: some View {
        HStack(spacing: 0) {
            // Left section - toggle buttons
            HStack(spacing: DockMetrics.buttonSpacing) {
                // System Audio
                ToolbarToggle(
                    icon: options.captureSystemAudio ? "speaker.wave.2.fill" : "speaker.slash.fill",
                    isOn: $options.captureSystemAudio,
                    tooltip: "System Audio"
                )

                // Microphone with integrated level indicator
                Button {
                    if micPermissionStatus != .denied {
                        options.captureMicrophone.toggle()
                    }
                } label: {
                    MicLevelIcon(
                        level: options.captureMicrophone && audioMonitor.isMonitoring
                            ? audioMonitor.level : 0,
                        size: DockMetrics.iconSize,
                        isMuted: false,
                        isEnabled: options.captureMicrophone
                    )
                    .frame(width: DockMetrics.buttonSize, height: DockMetrics.buttonSize)
                    .background(
                        RoundedRectangle(cornerRadius: DockMetrics.buttonRadius)
                            .fill(isMicHovered ? Color.primary.opacity(0.08) : Color.clear)
                    )
                }
                .buttonStyle(.plain)
                .opacity(micPermissionStatus == .denied ? 0.4 : 1)
                .help("Microphone")
                .onHover { isMicHovered = $0 }
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

                // Camera toggle
                ToolbarToggle(
                    icon: options.style.cameraEnabled ? "video.fill" : "video.slash.fill",
                    isOn: $options.style.cameraEnabled,
                    tooltip: "Camera",
                    disabled: cameraPermissionStatus == .denied
                )
                .onChange(of: options.style.cameraEnabled) { _, newValue in
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

                // Style picker button (matches toggle style)
                Button {
                    showStylePicker.toggle()
                } label: {
                    Image(systemName: "sparkles")
                        .font(.system(size: DockMetrics.iconSize, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: DockMetrics.buttonSize, height: DockMetrics.buttonSize)
                        .background(
                            RoundedRectangle(cornerRadius: DockMetrics.buttonRadius)
                                .fill(isStyleHovered ? Color.primary.opacity(0.08) : Color.clear)
                        )
                }
                .buttonStyle(.plain)
                .help("Recording Style")
                .onHover { isStyleHovered = $0 }
                .popover(isPresented: $showStylePicker, arrowEdge: .bottom) {
                    StylePickerView(
                        style: $options.style,
                        onCameraToggled: onCameraToggled
                    )
                }
            }
            .padding(.horizontal, DockMetrics.sectionPadding)

            // Divider
            Divider()
                .frame(height: DockMetrics.dividerHeight)
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
            .frame(width: 56, alignment: .leading)
            .padding(.horizontal, DockMetrics.sectionPadding)

            // Divider
            Divider()
                .frame(height: DockMetrics.dividerHeight)
                .opacity(0.3)

            // Right section - action buttons
            HStack(spacing: DockMetrics.sectionPadding) {
                // Cancel (same size as other buttons)
                Button(
                    action: {
                        audioMonitor.stopMonitoring()
                        onCancel()
                    },
                    label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: DockMetrics.buttonSize, height: DockMetrics.buttonSize)
                        .background(
                            RoundedRectangle(cornerRadius: DockMetrics.buttonRadius)
                                .fill(Color.secondary.opacity(0.1))
                        )
                    }
                )
                .buttonStyle(.plain)
                .help("Cancel (ESC)")

                // Record button with dropdown
                recordButton
            }
            .padding(.horizontal, DockMetrics.sectionPadding)
        }
        .padding(.vertical, DockMetrics.dockPadding)
        .background(
            RoundedRectangle(cornerRadius: DockMetrics.dockRadius)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DockMetrics.dockRadius)
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.2), radius: 20, y: 8)
        .onAppear {
            checkPermissions()
        }
    }

    // MARK: - Record Button with Dropdown

    private var recordButton: some View {
        HStack(spacing: 0) {
            // Record button - starts recording with current delay setting
            Button {
                startRecording()
            } label: {
                HStack(spacing: 6) {
                    Circle()
                        .fill(.red)
                        .frame(width: 14, height: 14)

                    // Show delay if set
                    if options.delaySeconds > 0 {
                        Text("\(options.delaySeconds)s")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(width: options.delaySeconds > 0 ? 52 : 36, height: DockMetrics.buttonSize)
            }
            .buttonStyle(.plain)
            .help(options.delaySeconds > 0 ? "Record with \(options.delaySeconds)s delay" : "Start Recording")

            // Divider
            Divider()
                .frame(height: 16)
                .opacity(0.3)

            // Dropdown chevron
            Button {
                showRecordMenu.toggle()
            } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.secondary)
                    .frame(width: 20, height: DockMetrics.buttonSize)
            }
            .buttonStyle(.plain)
            .popover(isPresented: $showRecordMenu, arrowEdge: .bottom) {
                recordDelayMenu
            }
        }
        .background(Color.primary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: DockMetrics.buttonRadius))
    }

    // MARK: - Record Delay Menu

    private var recordDelayMenu: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Just select the delay - don't start recording
            DelayMenuItem(
                label: "No Delay",
                icon: "record.circle",
                isSelected: options.delaySeconds == 0
            ) {
                options.delaySeconds = 0
                showRecordMenu = false
            }

            DelayMenuItem(
                label: "5 Second Delay",
                icon: "timer",
                isSelected: options.delaySeconds == 5
            ) {
                options.delaySeconds = 5
                showRecordMenu = false
            }

            DelayMenuItem(
                label: "10 Second Delay",
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
    let icon: String
    var isSelected: Bool = false
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action, label: {
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
        })
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
            Image(systemName: icon)
                .font(.system(size: DockMetrics.iconSize, weight: .medium))
                .foregroundStyle(iconColor)
                .frame(width: DockMetrics.buttonSize, height: DockMetrics.buttonSize)
                .background(
                    RoundedRectangle(cornerRadius: DockMetrics.buttonRadius)
                        .fill(isHovered ? Color.primary.opacity(0.08) : Color.clear)
                )
        }
        .buttonStyle(.plain)
        .opacity(disabled ? 0.4 : 1)
        .help(tooltip)
        .onHover { isHovered = $0 }
    }

    private var iconColor: Color {
        if isOn {
            return .primary
        } else if isSlashIcon {
            return .red
        } else {
            return .secondary
        }
    }
}
