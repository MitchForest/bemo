import AppKit
import SwiftUI

// MARK: - Mouse State (Shared between controller and view)

@MainActor
@Observable
final class MouseDragState {
    var dragStart: CGPoint?
    var dragCurrent: CGPoint?
    var isDragging = false
    var hoveredWindowRect: CGRect?
    var hoveredWindowDisplayID: CGDirectDisplayID?

    var selectionRect: CGRect? {
        guard let start = dragStart, let current = dragCurrent else { return nil }
        return CGRect(
            x: min(start.x, current.x),
            y: min(start.y, current.y),
            width: abs(current.x - start.x),
            height: abs(current.y - start.y)
        )
    }
}

// MARK: - Selection Overlay View

@MainActor
struct SelectionOverlayView: View {
    let screenshot: CGImage
    let screenScale: CGFloat
    var mouseState: MouseDragState
    let captureMode: CaptureMode
    let displayID: CGDirectDisplayID

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Layer 1: Frozen screenshot as background
                screenshotLayer(size: geometry.size)

                // Layer 2: Very subtle dim overlay - mostly transparent
                Color.black.opacity(0.15)

                // Layer 3: Selection cutout (drag or hovered window)
                if let rect = activeSelectionRect(in: geometry.size),
                   rect.width > 5,
                   rect.height > 5 {
                    selectionLayer(rect: rect)
                }

                // Layer 4: Instructions (hide immediately when dragging starts)
                if shouldShowInstructions {
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

    private func activeSelectionRect(in size: CGSize) -> CGRect? {
        if captureMode == .recordingWindow {
            guard mouseState.hoveredWindowDisplayID == displayID,
                  let rect = mouseState.hoveredWindowRect else {
                return nil
            }
            return CGRect(
                x: rect.minX,
                y: size.height - rect.maxY,
                width: rect.width,
                height: rect.height
            )
        }

        return flippedSelectionRect(in: size)
    }

    private var shouldShowInstructions: Bool {
        if captureMode == .recordingWindow {
            return mouseState.hoveredWindowRect == nil || mouseState.hoveredWindowDisplayID != displayID
        }
        return !mouseState.isDragging
    }

    // MARK: - View Layers

    @ViewBuilder
    private func screenshotLayer(size: CGSize) -> some View {
        Image(decorative: screenshot, scale: screenScale)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: size.width, height: size.height)
    }

    @ViewBuilder
    private func selectionLayer(rect: CGRect) -> some View {
        // Darken area outside selection for contrast
        Canvas { context, canvasSize in
            // Fill entire area with darker overlay
            context.fill(Path(CGRect(origin: .zero, size: canvasSize)), with: .color(.black.opacity(0.25)))
            // Cut out the selection area
            context.blendMode = .destinationOut
            context.fill(Path(rect), with: .color(.white))
        }
        .allowsHitTesting(false)

        // Selection border with glow effect - use mode accent color
        RoundedRectangle(cornerRadius: 4)
            .strokeBorder(
                LinearGradient(
                    colors: [captureMode.accentColor.opacity(0.9), captureMode.accentColor.opacity(0.6)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                lineWidth: 2
            )
            .frame(width: rect.width, height: rect.height)
            .position(x: rect.midX, y: rect.midY)
            .shadow(color: captureMode.accentColor.opacity(0.3), radius: 8)
            .shadow(color: .black.opacity(0.4), radius: 4, y: 2)
            .allowsHitTesting(false)

        // Corner handles for visual feedback - use mode accent color
        ForEach(cornerPositions(for: rect), id: \.x) { position in
            Circle()
                .fill(captureMode.accentColor)
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
            // Icon with glow - use mode icon
            ZStack {
                // Glow effect
                Image(systemName: captureMode.icon)
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(captureMode.accentColor.opacity(0.3))
                    .blur(radius: 8)

                Image(systemName: captureMode.icon)
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(.white.opacity(0.95))
            }

            VStack(spacing: 6) {
                // Use mode instructions
                Text(captureMode.instructions)
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
                        colors: [captureMode.accentColor.opacity(0.5), captureMode.accentColor.opacity(0.15)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        }
        .shadow(color: .black.opacity(0.25), radius: 30, y: 15)
        .shadow(color: captureMode.accentColor.opacity(0.1), radius: 1, y: -1)
    }
}
