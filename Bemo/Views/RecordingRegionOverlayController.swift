import AppKit
import SwiftUI

@MainActor
final class RecordingRegionOverlayController {
    private var panel: NSPanel?

    func show(region: CGRect) {
        hide()

        let newPanel = NSPanel(
            contentRect: region,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        newPanel.isFloatingPanel = true
        newPanel.level = .screenSaver
        newPanel.isOpaque = false
        newPanel.backgroundColor = .clear
        newPanel.hasShadow = false
        newPanel.hidesOnDeactivate = false
        newPanel.ignoresMouseEvents = true
        newPanel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]

        let overlayView = RecordingRegionOverlayView()
        let hostingView = NSHostingView(rootView: overlayView)
        hostingView.frame = CGRect(origin: .zero, size: region.size)

        newPanel.contentView = hostingView
        newPanel.orderFrontRegardless()

        panel = newPanel
    }

    func hide() {
        panel?.orderOut(nil)
        panel = nil
    }
}

private struct RecordingRegionOverlayView: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 6)
            .strokeBorder(Color.red.opacity(0.9), lineWidth: 2)
            .shadow(color: .red.opacity(0.25), radius: 6)
            .padding(1)
    }
}
