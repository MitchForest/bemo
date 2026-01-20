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
        popover.contentSize = NSSize(width: 280, height: 200)
        popover.behavior = .transient
        popover.contentViewController = NSHostingController(rootView: MenubarView(
            onCaptureScreen: { [weak self] in self?.startScreenCapture() }
        ))
    }

    private func setupHotkeys() {
        hotkeyManager = HotkeyManager()

        // Cmd+Shift+2 for OCR capture
        hotkeyManager.registerHotkey(keyCode: 0x13, modifiers: [.command, .shift]) { [weak self] in
            self?.startScreenCapture()
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

    // MARK: - Screen Capture

    func startScreenCapture() {
        // Close popover
        popover.performClose(nil)

        // Start capture
        selectionOverlay = SelectionOverlayController()
        selectionOverlay?.start { [weak self] result in
            switch result {
            case .success(let text):
                // Add to clipboard history (this also copies to system clipboard and shows dock)
                ClipboardHistoryManager.shared.addOCR(text)
                ToastController.shared.show(message: "Copied!", preview: text, type: .ocr)
            case .failure(let error):
                ToastController.shared.show(message: "Error", preview: error.localizedDescription, type: .error)
            }
            self?.selectionOverlay = nil
        }
    }
}
