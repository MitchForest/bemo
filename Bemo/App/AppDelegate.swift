import AppKit
import SwiftUI

@MainActor
class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var popover: NSPopover!
    private var hotkeyManager: HotkeyManager!
    private var selectionOverlay: SelectionOverlayController?
    private var clipboardDock: ClipboardDockController!

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
        popover.contentSize = NSSize(width: 280, height: 240)
        popover.behavior = .transient
        popover.contentViewController = NSHostingController(rootView: MenubarView(
            onOCRCapture: { [weak self] in self?.startOCRCapture() },
            onScreenshotCapture: { [weak self] in self?.startScreenshotCapture() }
        ))
    }

    private func setupHotkeys() {
        hotkeyManager = HotkeyManager()

        // Cmd+Shift+2 for OCR capture
        hotkeyManager.registerHotkey(keyCode: 0x13, modifiers: [.command, .shift]) { [weak self] in
            self?.startOCRCapture()
        }

        // Cmd+Shift+3 for Screenshot capture
        hotkeyManager.registerHotkey(keyCode: 0x14, modifiers: [.command, .shift]) { [weak self] in
            self?.startScreenshotCapture()
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
}
