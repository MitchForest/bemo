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
    private var recordingCompleteController: RecordingCompleteController?
    private var recordingRegionOverlayController: RecordingRegionOverlayController?

    // Recording state
    private var isRecording = false
    private var currentRecordingRegion: CGRect?
    private var currentDisplayID: CGDirectDisplayID?
    private var currentScreenFrame: CGRect?

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
        }
    }

    private func setupPopover() {
        popover = NSPopover()
        popover.contentSize = NSSize(width: 280, height: 320)
        popover.behavior = .transient
        popover.contentViewController = NSHostingController(rootView: MenubarView(
            onOCRCapture: { [weak self] in self?.startOCRCapture() },
            onScreenshotCapture: { [weak self] in self?.startScreenshotCapture() },
            onRecordingCapture: { [weak self] in self?.startQuickRecording() },
            onWindowRecordingCapture: { [weak self] in self?.startWindowRecording() }
        ))
    }

    private func setupHotkeys() {
        hotkeyManager = HotkeyManager()

        for action in HotkeyAction.allCases {
            hotkeyManager.registerHotkey(keyCode: action.keyCode, modifiers: action.modifiers) { [weak self] in
                self?.handleHotkey(action)
            }
        }
    }

    private func handleHotkey(_ action: HotkeyAction) {
        switch action {
        case .ocrCapture:
            startOCRCapture()
        case .screenshotCapture:
            startScreenshotCapture()
        case .recordingCapture:
            startQuickRecording()
        case .recordingWindowCapture:
            startWindowRecording()
        case .clipboardHistory:
            clipboardDock.toggle()
        }
    }

    private func setupClipboardDock() {
        clipboardDock = ClipboardDockController.shared
    }

    // MARK: - Menubar Actions

    @objc private func handleMenubarClick(_ _: NSStatusBarButton) {
        // If recording, stop recording on any click
        if isRecording {
            stopRecording()
            return
        }

        if dismissSelectionOverlay() {
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

        if dismissSelectionOverlay() {
            return
        }

        // Start capture with OCR mode
        selectionOverlay = SelectionOverlayController()
        selectionOverlay?.start(mode: .ocr) { [weak self] result in
            switch result {
            case .success(let captureResult):
                if case .ocrText(let text) = captureResult {
                    // Add to clipboard history (this also copies to system clipboard and shows dock)
                    ClipboardHistoryManager.shared.addOCR(text)
                    FeedbackService.showCopied(preview: text, type: .ocr)
                }
            case .failure(let error):
                // Only show error if it's not a "no text found" case (which happens on cancel)
                if let ocrError = error as? OCRError {
                    switch ocrError {
                    case .noTextFound:
                        // User cancelled or no text - don't show error
                        break
                    case .processingFailed:
                        FeedbackService.showError(error)
                    }
                } else {
                    FeedbackService.showError(error)
                }
            }
            self?.selectionOverlay = nil
        }
    }

    // MARK: - Screenshot Capture

    func startScreenshotCapture() {
        // Close popover
        popover.performClose(nil)

        if dismissSelectionOverlay() {
            return
        }

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
                                FeedbackService.showScreenshotSaved(filename: fileURL.lastPathComponent)
                            }
                        } catch {
                            FeedbackService.showError(error)
                        }
                    }
                }
            case .failure(let error):
                // Only show error for actual failures, not cancellations
                let errorDescription = error.localizedDescription
                if !errorDescription.contains("No text found") {
                    FeedbackService.showError(preview: errorDescription)
                }
            }
            self?.selectionOverlay = nil
        }
    }

    // MARK: - Quick Recording

    func startQuickRecording() {
        startRecordingSelection(mode: .recording)
    }

    func startWindowRecording() {
        startRecordingSelection(mode: .recordingWindow)
    }

    private func startRecordingSelection(mode: CaptureMode) {
        // If already recording, just show the indicator
        if isRecording {
            return
        }

        // Close popover
        popover.performClose(nil)

        if dismissSelectionOverlay() {
            return
        }

        // Start capture with recording mode
        selectionOverlay = SelectionOverlayController()
        selectionOverlay?.start(mode: mode) { [weak self] result in
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
              let displayID = currentDisplayID else { return }

        Task { @MainActor in
            do {
                // Ensure the pre-recording controls are dismissed
                recordingControlsController?.dismiss()
                recordingControlsController = nil

                // NOTE: Camera preview stays visible during recording!
                // CompositorService shares the camera via CameraService,
                // so the preview overlay continues to work while frames
                // are also composited into the video.

                // Build compositor configuration with style
                let config = CompositorConfiguration(
                    region: region,
                    displayID: displayID,
                    style: options.style,
                    captureSystemAudio: options.captureSystemAudio,
                    captureMicrophone: options.captureMicrophone,
                    outputURL: CompositorConfiguration.defaultOutputURL()
                )

                // Start composited recording
                try await CompositorService.shared.startRecording(config: config)

                showRecordingRegionOverlay()

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
                // Cleanup on error - hide camera preview
                cameraOverlayController?.hide()
                cameraOverlayController = nil
                hideRecordingRegionOverlay()

                FeedbackService.showError(error)
            }
        }
    }

    private func showRecordingRegionOverlay() {
        guard let region = currentRecordingRegion else { return }
        recordingRegionOverlayController = RecordingRegionOverlayController()
        recordingRegionOverlayController?.show(region: region)
    }

    private func hideRecordingRegionOverlay() {
        recordingRegionOverlayController?.hide()
        recordingRegionOverlayController = nil
    }

    private func stopRecording() {
        Task { @MainActor in
            do {
                // Hide indicator and camera preview
                recordingIndicatorController?.hide()
                recordingIndicatorController = nil

                // Hide camera preview after recording stops
                cameraOverlayController?.hide()
                cameraOverlayController = nil

                hideRecordingRegionOverlay()

                // Stop audio monitoring
                AudioLevelMonitor.shared.stopMonitoring()

                // Stop composited recording
                let outputURL = try await CompositorService.shared.stopRecording()

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

                isRecording = false
                currentRecordingRegion = nil
                currentDisplayID = nil
                currentScreenFrame = nil

                self.recordingCompleteController = RecordingCompleteController()
                self.recordingCompleteController?.show(
                    fileURL: outputURL,
                    duration: duration,
                    thumbnailData: thumbnail
                )

            } catch {
                FeedbackService.showError(error)
                isRecording = false
                hideRecordingRegionOverlay()
            }
        }
    }

    private func cancelRecordingSetup() {
        // Hide camera preview if showing
        cameraOverlayController?.hide()
        cameraOverlayController = nil
        hideRecordingRegionOverlay()

        // Stop audio monitoring
        AudioLevelMonitor.shared.stopMonitoring()

        recordingControlsController = nil
        currentRecordingRegion = nil
        currentDisplayID = nil
        currentScreenFrame = nil
    }

    @discardableResult
    private func dismissSelectionOverlay() -> Bool {
        guard let selectionOverlay else { return false }
        selectionOverlay.dismiss()
        self.selectionOverlay = nil
        return true
    }
}
