import AppKit
import SwiftUI

@MainActor
class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var popover: NSPopover!
    private var hotkeyManager: HotkeyManager!
    private var selectionOverlay: SelectionOverlayController?
    private var clipboardDock: ClipboardDockController!

    // Recording controllers
    private var recordingControlsController: RecordingControlsController?
    private var recordingIndicatorController: RecordingIndicatorController?
    private var cameraOverlayController: CameraOverlayController?
    private var countdownController: CountdownOverlayController?

    // Recording state
    private var isRecording = false
    private var currentRecordingRegion: CGRect?
    private var currentDisplayID: CGDirectDisplayID?
    private var currentScreenFrame: CGRect?
    private var currentRecordingOptions: RecordingOptions?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Hide dock icon - menubar only app
        NSApp.setActivationPolicy(.accessory)

        setupMenubarItem()
        setupPopover()
        setupHotkeys()
        setupClipboardDock()

        // Check accessibility permission (needed for global hotkeys)
        checkAccessibilityPermission()
    }

    private func checkAccessibilityPermission() {
        // If not trusted, prompt the user
        if !AXIsProcessTrusted() {
            PermissionService.shared.requestAccessibility()
        }
    }

    // MARK: - Setup

    private func setupMenubarItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "square.stack", accessibilityDescription: "Bemo")
            button.action = #selector(handleMenubarClick)
            button.target = self
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])

            // Enable drag & drop
            button.registerForDraggedTypes([.fileURL])
        }
    }

    private func setupPopover() {
        popover = NSPopover()
        popover.contentSize = NSSize(width: 280, height: 280)
        popover.behavior = .transient
        popover.contentViewController = NSHostingController(rootView: MenubarView(
            onOCRCapture: { [weak self] in self?.startOCRCapture() },
            onScreenshotCapture: { [weak self] in self?.startScreenshotCapture() },
            onRecordingCapture: { [weak self] in self?.startQuickRecording() }
        ))
    }

    private func setupHotkeys() {
        hotkeyManager = HotkeyManager()

        // Cmd+Shift+1 for OCR capture
        hotkeyManager.registerHotkey(keyCode: 0x12, modifiers: [.command, .shift]) { [weak self] in
            self?.startOCRCapture()
        }

        // Cmd+Shift+2 for Screenshot capture
        hotkeyManager.registerHotkey(keyCode: 0x13, modifiers: [.command, .shift]) { [weak self] in
            self?.startScreenshotCapture()
        }

        // Cmd+Shift+3 for Quick Recording
        hotkeyManager.registerHotkey(keyCode: 0x14, modifiers: [.command, .shift]) { [weak self] in
            self?.startQuickRecording()
        }

        // Cmd+Shift+V for clipboard dock
        hotkeyManager.registerHotkey(keyCode: 0x09, modifiers: [.command, .shift]) { [weak self] in
            self?.clipboardDock.toggle()
        }
    }

    private func setupClipboardDock() {
        clipboardDock = ClipboardDockController.shared
    }

    // MARK: - Menubar Actions

    @objc private func handleMenubarClick(_ sender: NSStatusBarButton) {
        // If recording, stop recording on any click
        if isRecording {
            stopRecording()
            return
        }

        let event = NSApp.currentEvent

        if event?.type == .rightMouseUp {
            // Right-click: show popover with options
            showPopover()
        } else {
            // Left-click: toggle clipboard dock
            clipboardDock.toggle()
        }
    }

    private func showPopover() {
        guard let button = statusItem.button else { return }

        if popover.isShown {
            popover.performClose(nil)
        } else {
            // Hide dock if visible
            ClipboardHistoryManager.shared.hideDock()

            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
            NSApp.activate(ignoringOtherApps: true)
        }
    }

    // MARK: - OCR Capture

    func startOCRCapture() {
        // Close popover
        popover.performClose(nil)

        // Start capture with OCR mode
        selectionOverlay = SelectionOverlayController()
        selectionOverlay?.start(mode: .ocr) { [weak self] result in
            switch result {
            case .success(let captureResult):
                if case .ocrText(let text) = captureResult {
                    // Add to clipboard history (this also copies to system clipboard and shows dock)
                    ClipboardHistoryManager.shared.addOCR(text)
                    ToastController.shared.show(message: "Copied!", preview: text, type: .ocr)
                }
            case .failure(let error):
                // Only show error if it's not a "no text found" case (which happens on cancel)
                if let ocrError = error as? OCRError {
                    switch ocrError {
                    case .noTextFound:
                        // User cancelled or no text - don't show error
                        break
                    case .processingFailed:
                        ToastController.shared.show(message: "Error", preview: error.localizedDescription, type: .error)
                    }
                } else {
                    ToastController.shared.show(message: "Error", preview: error.localizedDescription, type: .error)
                }
            }
            self?.selectionOverlay = nil
        }
    }

    // MARK: - Screenshot Capture

    func startScreenshotCapture() {
        // Close popover
        popover.performClose(nil)

        // Start capture with screenshot mode
        selectionOverlay = SelectionOverlayController()
        selectionOverlay?.start(mode: .screenshot) { [weak self] result in
            switch result {
            case .success(let captureResult):
                if case .screenshot(let image, _) = captureResult {
                    Task { @MainActor in
                        do {
                            // Generate thumbnail for clipboard history
                            let thumbnail = ScreenshotService.shared.generateThumbnail(from: image, maxSize: 120)

                            // Save to clipboard and file
                            let fileURL = try await ScreenshotService.shared.save(
                                image: image,
                                toClipboard: true,
                                toFile: true
                            )

                            // Add to clipboard history if we have both thumbnail and file URL
                            if let thumbnail = thumbnail, let fileURL = fileURL {
                                ClipboardHistoryManager.shared.addScreenshot(
                                    thumbnailData: thumbnail,
                                    fileURL: fileURL
                                )
                                ToastController.shared.showScreenshotSaved(filename: fileURL.lastPathComponent)
                            }
                        } catch {
                            ToastController.shared.show(
                                message: "Error",
                                preview: error.localizedDescription,
                                type: .error
                            )
                        }
                    }
                }
            case .failure(let error):
                // Only show error for actual failures, not cancellations
                let errorDescription = error.localizedDescription
                if !errorDescription.contains("No text found") {
                    ToastController.shared.show(message: "Error", preview: errorDescription, type: .error)
                }
            }
            self?.selectionOverlay = nil
        }
    }

    // MARK: - Quick Recording

    func startQuickRecording() {
        // If already recording, just show the indicator
        if isRecording {
            return
        }

        // Close popover
        popover.performClose(nil)

        // Start capture with recording mode
        selectionOverlay = SelectionOverlayController()
        selectionOverlay?.start(mode: .quickRecording) { [weak self] result in
            switch result {
            case .success(let captureResult):
                if case .recordingRegion(let rect, let displayID) = captureResult {
                    self?.showRecordingControls(region: rect, displayID: displayID)
                }
            case .failure:
                // User cancelled - do nothing
                break
            }
            self?.selectionOverlay = nil
        }
    }

    private func showRecordingControls(region: CGRect, displayID: CGDirectDisplayID) {
        // Store region info
        currentRecordingRegion = region
        currentDisplayID = displayID

        // Find the screen for this display
        guard let screen = NSScreen.screens.first(where: {
            let screenDisplayID = $0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
            return screenDisplayID == displayID
        }) else { return }

        currentScreenFrame = screen.frame

        // Show recording controls
        recordingControlsController = RecordingControlsController()
        recordingControlsController?.show(
            for: region,
            displayID: displayID,
            screenFrame: screen.frame,
            onStart: { [weak self] options in
                self?.handleRecordingStart(options: options)
            },
            onCancel: { [weak self] in
                self?.cancelRecordingSetup()
            },
            onCameraToggled: { [weak self] enabled in
                self?.handleCameraPreviewToggle(enabled: enabled)
            }
        )
    }

    private func handleCameraPreviewToggle(enabled: Bool) {
        guard let screenFrame = currentScreenFrame else { return }

        if enabled {
            // Show camera preview immediately
            Task { @MainActor in
                cameraOverlayController = CameraOverlayController()
                try? await cameraOverlayController?.show(
                    position: .bottomRight,
                    size: .medium,
                    in: screenFrame
                )
            }
        } else {
            // Hide camera preview
            cameraOverlayController?.hide()
            cameraOverlayController = nil
        }
    }

    private func handleRecordingStart(options: RecordingOptions) {
        currentRecordingOptions = options

        if options.delaySeconds > 0 {
            // Show countdown
            countdownController = CountdownOverlayController()
            countdownController?.show(
                seconds: options.delaySeconds,
                onComplete: { [weak self] in
                    self?.countdownController = nil
                    self?.beginRecording(options: options)
                },
                onCancel: { [weak self] in
                    self?.countdownController = nil
                    self?.cancelRecordingSetup()
                }
            )
        } else {
            beginRecording(options: options)
        }
    }

    private func beginRecording(options: RecordingOptions) {
        guard let region = currentRecordingRegion,
              let displayID = currentDisplayID,
              let screenFrame = currentScreenFrame else { return }

        Task { @MainActor in
            do {
                // Camera overlay may already be showing from preview
                // Update its position/size if needed, or show it if not already visible
                if options.includeCamera {
                    if cameraOverlayController == nil {
                        cameraOverlayController = CameraOverlayController()
                        try await cameraOverlayController?.show(
                            position: options.cameraPosition,
                            size: options.cameraSize,
                            in: screenFrame
                        )
                    } else {
                        // Update position/size if different
                        cameraOverlayController?.updatePosition(options.cameraPosition)
                        cameraOverlayController?.updateSize(options.cameraSize)
                    }
                } else {
                    // Hide camera if it was showing from preview but user disabled it
                    cameraOverlayController?.hide()
                    cameraOverlayController = nil
                }

                // Build recording configuration
                let config = RecordingConfiguration(
                    region: region,
                    displayID: displayID,
                    captureSystemAudio: options.captureSystemAudio,
                    captureMicrophone: options.captureMicrophone,
                    outputURL: RecordingConfiguration.defaultOutputURL()
                )

                // Start recording
                try await ScreenRecordingService.shared.startRecording(config: config)

                // Show recording indicator with mic status
                recordingIndicatorController = RecordingIndicatorController()
                recordingIndicatorController?.show(
                    isMicEnabled: options.captureMicrophone,
                    onStop: { [weak self] in
                        self?.stopRecording()
                    }
                )

                isRecording = true

            } catch {
                // Cleanup on error
                cameraOverlayController?.hide()
                cameraOverlayController = nil

                ToastController.shared.show(
                    message: "Error",
                    preview: error.localizedDescription,
                    type: .error
                )
            }
        }
    }

    private func stopRecording() {
        Task { @MainActor in
            do {
                // Hide indicator
                recordingIndicatorController?.hide()
                recordingIndicatorController = nil

                // Hide camera overlay
                cameraOverlayController?.hide()
                cameraOverlayController = nil

                // Stop audio monitoring
                AudioLevelMonitor.shared.stopMonitoring()

                // Stop recording
                let outputURL = try await ScreenRecordingService.shared.stopRecording()

                // Generate thumbnail and get duration
                let thumbnail = await ScreenshotService.shared.generateVideoThumbnail(from: outputURL, maxSize: 120)
                let duration = await ScreenshotService.shared.getVideoDuration(from: outputURL) ?? 0

                // Auto-copy video file to clipboard
                let pasteboard = NSPasteboard.general
                pasteboard.clearContents()
                pasteboard.writeObjects([outputURL as NSURL])

                // Add to clipboard history
                if let thumbnail = thumbnail {
                    ClipboardHistoryManager.shared.addRecording(
                        thumbnailData: thumbnail,
                        fileURL: outputURL,
                        duration: duration
                    )
                }

                // Format duration for toast
                let minutes = Int(duration) / 60
                let seconds = Int(duration) % 60
                let durationString = String(format: "%d:%02d", minutes, seconds)

                ToastController.shared.showRecordingSaved(
                    filename: outputURL.lastPathComponent,
                    duration: durationString
                )

                isRecording = false
                currentRecordingRegion = nil
                currentDisplayID = nil
                currentScreenFrame = nil
                currentRecordingOptions = nil

            } catch {
                ToastController.shared.show(
                    message: "Error",
                    preview: error.localizedDescription,
                    type: .error
                )
                isRecording = false
            }
        }
    }

    private func cancelRecordingSetup() {
        // Hide camera preview if showing
        cameraOverlayController?.hide()
        cameraOverlayController = nil

        // Stop audio monitoring
        AudioLevelMonitor.shared.stopMonitoring()

        recordingControlsController = nil
        currentRecordingRegion = nil
        currentDisplayID = nil
        currentScreenFrame = nil
        currentRecordingOptions = nil
    }
}
