import AppKit
import SwiftUI
import ScreenCaptureKit

// MARK: - Capture Result

/// Result types for different capture modes
enum CaptureResult: Sendable {
    /// OCR text recognition result
    case ocrText(String)

    /// Screenshot capture result with cropped image and selection rect
    case screenshot(CGImage, CGRect)

    /// Recording region selection (for both quick and studio modes)
    case recordingRegion(CGRect, CGDirectDisplayID)
}

// MARK: - Selection Overlay Controller

@MainActor
final class SelectionOverlayController {
    private struct OverlayPanel {
        let panel: NSPanel
        let screen: NSScreen
    }

    private struct WindowCandidate {
        let frame: CGRect
        let displayID: CGDirectDisplayID
    }

    private var overlayPanels: [OverlayPanel] = []
    private var completion: ((Result<CaptureResult, Error>) -> Void)?
    private var screenshots: [CGDirectDisplayID: CGImage] = [:]
    private var mouseState = MouseDragState()
    private var captureMode: CaptureMode = .ocr
    private var windowCandidates: [WindowCandidate] = []

    nonisolated(unsafe) private var keyEventMonitor: Any?
    nonisolated(unsafe) private var mouseDownMonitor: Any?
    nonisolated(unsafe) private var mouseDragMonitor: Any?
    nonisolated(unsafe) private var mouseUpMonitor: Any?
    nonisolated(unsafe) private var mouseMoveMonitor: Any?

    init() {}

    deinit {
        if let monitor = keyEventMonitor {
            NSEvent.removeMonitor(monitor)
        }
        if let monitor = mouseDownMonitor {
            NSEvent.removeMonitor(monitor)
        }
        if let monitor = mouseDragMonitor {
            NSEvent.removeMonitor(monitor)
        }
        if let monitor = mouseUpMonitor {
            NSEvent.removeMonitor(monitor)
        }
        if let monitor = mouseMoveMonitor {
            NSEvent.removeMonitor(monitor)
        }
    }

}

extension SelectionOverlayController {

    // MARK: - Public API

    /// Start the selection overlay with the specified capture mode
    /// - Parameters:
    ///   - mode: The capture mode (ocr, screenshot, quickRecording, studioRecording)
    ///   - completion: Callback with the capture result
    func start(
        mode: CaptureMode = .ocr,
        completion: @escaping @MainActor (Result<CaptureResult, Error>) -> Void
    ) {
        self.captureMode = mode
        self.completion = completion

        // First, capture screenshots using ScreenCaptureKit (async)
        Task { @MainActor in
            do {
                // Get our bundle ID to exclude our own windows from capture
                let bundleID = Bundle.main.bundleIdentifier

                // Capture all displays using the modern API
                let captures = try await ScreenCaptureService.shared.captureAllDisplays(
                    excludingAppBundleID: bundleID
                )

                self.screenshots = captures

                if mode == .recordingWindow {
                    self.windowCandidates = try await self.loadWindowCandidates(
                        excludingAppBundleID: bundleID
                    )
                }

                // Now show the overlay panels
                self.showOverlayPanels()

            } catch {
                // Handle permission error specially
                if case ScreenCaptureError.permissionDenied = error {
                    self.showPermissionAlert()
                }
                self.complete(with: .failure(error))
            }
        }
    }

    func dismiss() {
        closeAllPanels()
        completion = nil
    }

}

extension SelectionOverlayController {

    // MARK: - Overlay Display

    private func showOverlayPanels() {
        // Set up keyboard event monitor for ESC key
        setupEventMonitor()

        // Create overlay panels for each screen
        let screenNumberKey = NSDeviceDescriptionKey("NSScreenNumber")
        for screen in NSScreen.screens {
            // Get display ID for this screen
            guard let displayID = screen.deviceDescription[screenNumberKey] as? CGDirectDisplayID else {
                continue
            }
            guard let screenshot = screenshots[displayID] else {
                continue
            }

            let panel = createOverlayPanel(for: screen, displayID: displayID, screenshot: screenshot)
            overlayPanels.append(OverlayPanel(panel: panel, screen: screen))
        }

        // Show all panels at once using orderFrontRegardless (non-activating)
        for entry in overlayPanels {
            entry.panel.orderFrontRegardless()
        }
    }

    // MARK: - Panel Creation

    private func createOverlayPanel(
        for screen: NSScreen,
        displayID: CGDirectDisplayID,
        screenshot: CGImage
    ) -> NSPanel {
        // Create a non-activating panel
        let panel = SelectionPanel(
            contentRect: screen.frame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        // Configure to not activate the app
        panel.isFloatingPanel = true
        panel.level = .screenSaver  // Very high, above everything
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.acceptsMouseMovedEvents = true

        // Create the SwiftUI overlay view with shared mouse state and capture mode
        let overlayView = SelectionOverlayView(
            screenshot: screenshot,
            screenScale: screen.backingScaleFactor,
            mouseState: mouseState,
            captureMode: captureMode,
            displayID: displayID
        )

        panel.contentView = NSHostingView(rootView: overlayView)

        return panel
    }

    // MARK: - Window Candidates (Window Recording)

    private func loadWindowCandidates(
        excludingAppBundleID: String?
    ) async throws -> [WindowCandidate] {
        let content = try await ScreenCaptureService.shared.fetchShareableContent()
        let primaryScreenHeight = NSScreen.screens.first?.frame.height ?? 0

        return content.windows.compactMap { window in
            guard window.isOnScreen, window.windowLayer == 0 else { return nil }

            if let bundleID = excludingAppBundleID,
               window.owningApplication?.bundleIdentifier == bundleID {
                return nil
            }

            let appKitFrame = convertWindowFrameToAppKit(
                window.frame,
                primaryScreenHeight: primaryScreenHeight
            )

            guard appKitFrame.width > 40, appKitFrame.height > 40 else { return nil }
            guard let displayID = displayID(for: appKitFrame) else { return nil }

            return WindowCandidate(frame: appKitFrame, displayID: displayID)
        }
    }

    private func convertWindowFrameToAppKit(
        _ frame: CGRect,
        primaryScreenHeight: CGFloat
    ) -> CGRect {
        CGRect(
            x: frame.minX,
            y: primaryScreenHeight - frame.maxY,
            width: frame.width,
            height: frame.height
        )
    }

    private func displayID(for frame: CGRect) -> CGDirectDisplayID? {
        let center = CGPoint(x: frame.midX, y: frame.midY)
        guard let screen = NSScreen.screens.first(where: { $0.frame.contains(center) }) else {
            return nil
        }
        return screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
    }

}

extension SelectionOverlayController {

    // MARK: - Event Handling

    private func setupEventMonitor() {
        // ESC key monitor
        keyEventMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.keyCode == 53 { // ESC key
                Task { @MainActor in
                    self?.cancel()
                }
                return nil // Consume the event
            }
            return event
        }

        // Mouse down - start dragging immediately
        mouseDownMonitor = NSEvent.addLocalMonitorForEvents(matching: .leftMouseDown) { [weak self] event in
            guard let self = self else { return event }

            if self.captureMode == .recordingWindow {
                return event
            }

            Task { @MainActor in
                let location = event.locationInWindow
                self.mouseState.isDragging = true
                self.mouseState.dragStart = location
                self.mouseState.dragCurrent = location
            }
            return event
        }

        // Mouse dragged - update current position
        mouseDragMonitor = NSEvent.addLocalMonitorForEvents(matching: .leftMouseDragged) { [weak self] event in
            guard let self = self else { return event }

            if self.captureMode == .recordingWindow {
                return event
            }

            Task { @MainActor in
                self.mouseState.dragCurrent = event.locationInWindow
            }
            return event
        }

        // Mouse up - complete selection
        mouseUpMonitor = NSEvent.addLocalMonitorForEvents(matching: .leftMouseUp) { [weak self] event in
            guard let self = self else { return event }

            Task { @MainActor in
                if self.captureMode == .recordingWindow {
                    self.handleWindowClick(at: event.locationInWindow, in: event.window)
                } else {
                    self.handleMouseUp(at: event.locationInWindow, in: event.window)
                }
            }
            return event
        }

        if captureMode == .recordingWindow {
            mouseMoveMonitor = NSEvent.addLocalMonitorForEvents(matching: .mouseMoved) { [weak self] event in
                guard let self = self else { return event }
                Task { @MainActor in
                    self.updateHoveredWindow(at: event.locationInWindow, in: event.window)
                }
                return event
            }
        }
    }

    private func handleMouseUp(at _: CGPoint, in window: NSWindow?) {
        guard let rect = mouseState.selectionRect else {
            // No selection - cancel
            cancel()
            return
        }

        // Check if selection is large enough
        if rect.width > 10 && rect.height > 10 {
            // Find which screen/panel this belongs to
            if let panel = window as? SelectionPanel,
               let entry = overlayPanels.first(where: { $0.panel === panel }) {
                let screen = entry.screen

                // Convert from flipped window coordinates to screen coordinates
                let screenRect = CGRect(
                    x: screen.frame.minX + rect.minX,
                    y: screen.frame.minY + rect.minY,
                    width: rect.width,
                    height: rect.height
                )
                handleSelection(rect: screenRect, screen: screen)
            } else {
                // Couldn't find panel - cancel
                cancel()
            }
        } else {
            // Too small - treat as cancel (single click)
            cancel()
        }
    }

    private func updateHoveredWindow(at location: CGPoint, in window: NSWindow?) {
        guard captureMode == .recordingWindow else { return }
        guard let panel = window as? SelectionPanel,
              let entry = overlayPanels.first(where: { $0.panel === panel }) else {
            mouseState.hoveredWindowRect = nil
            mouseState.hoveredWindowDisplayID = nil
            return
        }

        let screenPoint = CGPoint(
            x: entry.screen.frame.minX + location.x,
            y: entry.screen.frame.minY + location.y
        )

        let screenNumberKey = NSDeviceDescriptionKey("NSScreenNumber")
        let displayID = entry.screen.deviceDescription[screenNumberKey] as? CGDirectDisplayID

        guard let displayID else {
            mouseState.hoveredWindowRect = nil
            mouseState.hoveredWindowDisplayID = nil
            return
        }

        if let candidate = windowCandidates.first(where: {
            $0.displayID == displayID && $0.frame.contains(screenPoint)
        }) {
            let localRect = CGRect(
                x: candidate.frame.minX - entry.screen.frame.minX,
                y: candidate.frame.minY - entry.screen.frame.minY,
                width: candidate.frame.width,
                height: candidate.frame.height
            )
            mouseState.hoveredWindowRect = localRect
            mouseState.hoveredWindowDisplayID = displayID
        } else {
            mouseState.hoveredWindowRect = nil
            mouseState.hoveredWindowDisplayID = nil
        }
    }

    private func handleWindowClick(at location: CGPoint, in window: NSWindow?) {
        guard let panel = window as? SelectionPanel,
              let entry = overlayPanels.first(where: { $0.panel === panel }) else {
            cancel()
            return
        }

        let screenPoint = CGPoint(
            x: entry.screen.frame.minX + location.x,
            y: entry.screen.frame.minY + location.y
        )

        let screenNumberKey = NSDeviceDescriptionKey("NSScreenNumber")
        guard let displayID = entry.screen.deviceDescription[screenNumberKey] as? CGDirectDisplayID else {
            cancel()
            return
        }

        guard let candidate = windowCandidates.first(where: {
            $0.displayID == displayID && $0.frame.contains(screenPoint)
        }) else {
            cancel()
            return
        }

        handleRecordingSelection(rect: candidate.frame, displayID: displayID)
    }

    private func removeEventMonitor() {
        if let monitor = keyEventMonitor {
            NSEvent.removeMonitor(monitor)
            keyEventMonitor = nil
        }
        if let monitor = mouseDownMonitor {
            NSEvent.removeMonitor(monitor)
            mouseDownMonitor = nil
        }
        if let monitor = mouseDragMonitor {
            NSEvent.removeMonitor(monitor)
            mouseDragMonitor = nil
        }
        if let monitor = mouseUpMonitor {
            NSEvent.removeMonitor(monitor)
            mouseUpMonitor = nil
        }
        if let monitor = mouseMoveMonitor {
            NSEvent.removeMonitor(monitor)
            mouseMoveMonitor = nil
        }
    }

}

extension SelectionOverlayController {

    // MARK: - Selection Handling

    private func handleSelection(rect: CGRect, screen: NSScreen) {
        // Get display ID for this screen
        let screenNumberKey = NSDeviceDescriptionKey("NSScreenNumber")
        guard let displayID = screen.deviceDescription[screenNumberKey] as? CGDirectDisplayID else {
            complete(with: .failure(OCRError.noTextFound))
            return
        }

        // Route based on capture mode
        switch captureMode {
        case .ocr:
            handleOCRSelection(rect: rect, screen: screen, displayID: displayID)
        case .screenshot:
            handleScreenshotSelection(rect: rect, screen: screen, displayID: displayID)
        case .recording:
            handleRecordingSelection(rect: rect, displayID: displayID)
        case .recordingWindow:
            handleRecordingSelection(rect: rect, displayID: displayID)
        }
    }

    // MARK: - OCR Selection

    private func handleOCRSelection(rect: CGRect, screen: NSScreen, displayID: CGDirectDisplayID) {
        guard let screenshot = screenshots[displayID] else {
            complete(with: .failure(OCRError.noTextFound))
            return
        }

        // Close all panels
        closeAllPanels()

        // Crop the screenshot to the selection
        guard let croppedImage = ImageCropper.crop(
            screenshot: screenshot,
            selectionRect: rect,
            screenFrame: screen.frame
        ) else {
            complete(with: .failure(OCRError.noTextFound))
            return
        }

        // Run OCR on the cropped image
        Task { @MainActor in
            do {
                let text = try await OCRService.shared.recognize(image: croppedImage)
                self.complete(with: .success(.ocrText(text)))
            } catch {
                self.complete(with: .failure(error))
            }
        }
    }

    // MARK: - Screenshot Selection

    private func handleScreenshotSelection(rect: CGRect, screen: NSScreen, displayID: CGDirectDisplayID) {
        guard let screenshot = screenshots[displayID] else {
            complete(with: .failure(ScreenshotError.conversionFailed))
            return
        }

        // Close all panels
        closeAllPanels()

        // Crop the screenshot to the selection
        guard let croppedImage = ImageCropper.crop(
            screenshot: screenshot,
            selectionRect: rect,
            screenFrame: screen.frame
        ) else {
            complete(with: .failure(ScreenshotError.conversionFailed))
            return
        }

        // Return the cropped image
        complete(with: .success(.screenshot(croppedImage, rect)))
    }

    // MARK: - Recording Selection

    private func handleRecordingSelection(rect: CGRect, displayID: CGDirectDisplayID) {
        // Close all panels
        closeAllPanels()

        // Return the recording region info
        complete(with: .success(.recordingRegion(rect, displayID)))
    }

    private func cancel() {
        closeAllPanels()
    }

    private func closeAllPanels() {
        removeEventMonitor()

        for entry in overlayPanels {
            entry.panel.orderOut(nil)
        }
        overlayPanels.removeAll()
        screenshots.removeAll()
        windowCandidates.removeAll()
        mouseState.isDragging = false
        mouseState.dragStart = nil
        mouseState.dragCurrent = nil
        mouseState.hoveredWindowRect = nil
        mouseState.hoveredWindowDisplayID = nil
    }

    private func complete(with result: Result<CaptureResult, Error>) {
        completion?(result)
    }

}

extension SelectionOverlayController {

    // MARK: - Permission Handling

    private func showPermissionAlert() {
        let alert = NSAlert()
        alert.messageText = "Screen Recording Permission Required"
        alert.informativeText =
            "Bemo needs Screen Recording permission to capture screen content.\n\n" +
            "Please enable it in System Settings > Privacy & Security > Screen Recording, then restart Bemo."
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Open System Settings")
        alert.addButton(withTitle: "Cancel")

        if alert.runModal() == .alertFirstButtonReturn {
            // Open System Settings to the Screen Recording pane
            if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
                NSWorkspace.shared.open(url)
            }
        }
    }
}

// MARK: - Selection Panel (Non-Activating)

final class SelectionPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}
