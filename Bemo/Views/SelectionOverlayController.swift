import AppKit
import SwiftUI
import ScreenCaptureKit

// MARK: - Mouse State (Shared between controller and view)

@MainActor
@Observable
final class MouseDragState {
    var dragStart: CGPoint?
    var dragCurrent: CGPoint?
    var isDragging = false

    var selectionRect: CGRect? {
        guard let start = dragStart, let current = dragCurrent else { return nil }
        return CGRect(
            x: min(start.x, current.x),
            y: min(start.y, current.y),
            width: abs(current.x - start.x),
            height: abs(current.y - start.y)
        )
    }

    func reset() {
        dragStart = nil
        dragCurrent = nil
        isDragging = false
    }
}

// MARK: - Selection Overlay Controller

@MainActor
final class SelectionOverlayController {
    private var overlayPanels: [NSPanel] = []
    private var completion: ((Result<String, Error>) -> Void)?
    private var screenshots: [CGDirectDisplayID: CGImage] = [:]
    private var mouseState = MouseDragState()

    nonisolated(unsafe) private var keyEventMonitor: Any?
    nonisolated(unsafe) private var mouseDownMonitor: Any?
    nonisolated(unsafe) private var mouseDragMonitor: Any?
    nonisolated(unsafe) private var mouseUpMonitor: Any?

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
    }

    // MARK: - Public API

    func start(completion: @escaping @MainActor (Result<String, Error>) -> Void) {
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

    // MARK: - Overlay Display

    private func showOverlayPanels() {
        // Set up keyboard event monitor for ESC key
        setupEventMonitor()

        // Create overlay panels for each screen
        for screen in NSScreen.screens {
            // Get display ID for this screen
            guard let displayID = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID,
                  let screenshot = screenshots[displayID] else {
                continue
            }

            let panel = createOverlayPanel(for: screen, screenshot: screenshot)
            overlayPanels.append(panel)
        }

        // Show all panels at once using orderFrontRegardless (non-activating)
        for panel in overlayPanels {
            panel.orderFrontRegardless()
        }
    }

    // MARK: - Panel Creation

    private func createOverlayPanel(for screen: NSScreen, screenshot: CGImage) -> NSPanel {
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

        // Create the SwiftUI overlay view with shared mouse state
        let overlayView = SelectionOverlayView(
            screenshot: screenshot,
            screenFrame: screen.frame,
            mouseState: mouseState,
            onComplete: { [weak self] rect in
                self?.handleSelection(rect: rect, screen: screen)
            },
            onCancel: { [weak self] in
                self?.cancel()
            }
        )

        panel.contentView = NSHostingView(rootView: overlayView)

        return panel
    }

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

            Task { @MainActor in
                self.mouseState.dragCurrent = event.locationInWindow
            }
            return event
        }

        // Mouse up - complete selection
        mouseUpMonitor = NSEvent.addLocalMonitorForEvents(matching: .leftMouseUp) { [weak self] event in
            guard let self = self else { return event }

            Task { @MainActor in
                self.handleMouseUp(at: event.locationInWindow, in: event.window)
            }
            return event
        }
    }

    private func handleMouseUp(at location: CGPoint, in window: NSWindow?) {
        guard let rect = mouseState.selectionRect else {
            // No selection - cancel
            cancel()
            return
        }

        // Check if selection is large enough
        if rect.width > 10 && rect.height > 10 {
            // Find which screen/panel this belongs to
            if let panel = window as? SelectionPanel,
               let index = overlayPanels.firstIndex(of: panel),
               index < NSScreen.screens.count {
                let screen = NSScreen.screens[index]

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
    }

    // MARK: - Selection Handling

    private func handleSelection(rect: CGRect, screen: NSScreen) {
        // Get display ID for this screen
        guard let displayID = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID,
              let screenshot = screenshots[displayID] else {
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
                self.complete(with: .success(text))
            } catch {
                self.complete(with: .failure(error))
            }
        }
    }

    private func cancel() {
        closeAllPanels()
    }

    private func closeAllPanels() {
        removeEventMonitor()

        for panel in overlayPanels {
            panel.orderOut(nil)
        }
        overlayPanels.removeAll()
        screenshots.removeAll()
    }

    private func complete(with result: Result<String, Error>) {
        completion?(result)
    }

    // MARK: - Permission Handling

    private func showPermissionAlert() {
        let alert = NSAlert()
        alert.messageText = "Screen Recording Permission Required"
        alert.informativeText = "Bemo needs Screen Recording permission to capture screen content.\n\nPlease enable it in System Settings > Privacy & Security > Screen Recording, then restart Bemo."
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

// MARK: - Selection Overlay View

@MainActor
struct SelectionOverlayView: View {
    let screenshot: CGImage
    let screenFrame: CGRect
    var mouseState: MouseDragState
    let onComplete: @MainActor (CGRect) -> Void
    let onCancel: @MainActor () -> Void

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Layer 1: Frozen screenshot as background
                screenshotLayer(size: geometry.size)

                // Layer 2: Very subtle dim overlay - mostly transparent
                Color.black.opacity(0.15)

                // Layer 3: Selection cutout (if dragging)
                if let rect = flippedSelectionRect(in: geometry.size), rect.width > 5, rect.height > 5 {
                    selectionLayer(rect: rect, size: geometry.size)
                }

                // Layer 4: Instructions (hide immediately when dragging starts)
                if !mouseState.isDragging {
                    instructionsLayer
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            .onAppear {
                NSCursor.crosshair.push()
            }
            .onDisappear {
                NSCursor.pop()
            }
        }
    }

    // Convert from AppKit coordinates (origin bottom-left) to SwiftUI (origin top-left)
    private func flippedSelectionRect(in size: CGSize) -> CGRect? {
        guard let rect = mouseState.selectionRect else { return nil }
        return CGRect(
            x: rect.minX,
            y: size.height - rect.maxY,
            width: rect.width,
            height: rect.height
        )
    }

    // MARK: - View Layers

    @ViewBuilder
    private func screenshotLayer(size: CGSize) -> some View {
        Image(decorative: screenshot, scale: NSScreen.main?.backingScaleFactor ?? 2.0)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: size.width, height: size.height)
    }

    @ViewBuilder
    private func selectionLayer(rect: CGRect, size: CGSize) -> some View {
        // Darken area outside selection for contrast
        Canvas { context, canvasSize in
            // Fill entire area with darker overlay
            context.fill(Path(CGRect(origin: .zero, size: canvasSize)), with: .color(.black.opacity(0.25)))
            // Cut out the selection area
            context.blendMode = .destinationOut
            context.fill(Path(rect), with: .color(.white))
        }
        .allowsHitTesting(false)

        // Selection border with glow effect
        RoundedRectangle(cornerRadius: 4)
            .strokeBorder(
                LinearGradient(
                    colors: [.white.opacity(0.9), .white.opacity(0.6)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                lineWidth: 2
            )
            .frame(width: rect.width, height: rect.height)
            .position(x: rect.midX, y: rect.midY)
            .shadow(color: .white.opacity(0.3), radius: 8)
            .shadow(color: .black.opacity(0.4), radius: 4, y: 2)
            .allowsHitTesting(false)

        // Corner handles for visual feedback
        ForEach(cornerPositions(for: rect), id: \.x) { position in
            Circle()
                .fill(.white)
                .frame(width: 8, height: 8)
                .shadow(color: .black.opacity(0.3), radius: 2)
                .position(position)
        }
    }

    private func cornerPositions(for rect: CGRect) -> [CGPoint] {
        [
            CGPoint(x: rect.minX, y: rect.minY),
            CGPoint(x: rect.maxX, y: rect.minY),
            CGPoint(x: rect.minX, y: rect.maxY),
            CGPoint(x: rect.maxX, y: rect.maxY)
        ]
    }

    private var instructionsLayer: some View {
        VStack(spacing: 12) {
            // Icon with glow
            ZStack {
                // Glow effect
                Image(systemName: "viewfinder")
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(.white.opacity(0.3))
                    .blur(radius: 8)

                Image(systemName: "viewfinder")
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(.white.opacity(0.95))
            }

            VStack(spacing: 6) {
                Text("Drag to select text")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)

                HStack(spacing: 16) {
                    Label("Click to cancel", systemImage: "cursorarrow.click")
                    Label("ESC to cancel", systemImage: "escape")
                }
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white.opacity(0.6))
            }
        }
        .padding(.horizontal, 32)
        .padding(.vertical, 24)
        .background {
            RoundedRectangle(cornerRadius: BemoTheme.panelRadius)
                .fill(.ultraThinMaterial.opacity(0.85))
        }
        .overlay {
            RoundedRectangle(cornerRadius: BemoTheme.panelRadius)
                .strokeBorder(
                    LinearGradient(
                        colors: [.white.opacity(0.5), .white.opacity(0.15)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        }
        .shadow(color: .black.opacity(0.25), radius: 30, y: 15)
        .shadow(color: .white.opacity(0.1), radius: 1, y: -1)
    }
}
