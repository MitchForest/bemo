import CoreGraphics
import AppKit

enum ImageCropper {
    /// Crops a screenshot to the selection rectangle
    /// - Parameters:
    ///   - screenshot: The full screenshot CGImage
    ///   - selectionRect: The selection rectangle in screen coordinates (origin at bottom-left)
    ///   - screenFrame: The screen's frame
    /// - Returns: The cropped CGImage, or nil if cropping fails
    static func crop(
        screenshot: CGImage,
        selectionRect: CGRect,
        screenFrame: CGRect
    ) -> CGImage? {
        // Calculate scale factors (Retina displays)
        let scaleX = CGFloat(screenshot.width) / screenFrame.width
        let scaleY = CGFloat(screenshot.height) / screenFrame.height

        // Convert screen coordinates to image coordinates
        // Screen coordinates: origin at bottom-left
        // CGImage coordinates: origin at top-left
        let relativeX = selectionRect.minX - screenFrame.minX
        let relativeY = selectionRect.minY - screenFrame.minY

        // Flip Y axis for CGImage
        let flippedY = screenFrame.height - relativeY - selectionRect.height

        let cropRect = CGRect(
            x: (relativeX * scaleX).rounded(.down),
            y: (flippedY * scaleY).rounded(.down),
            width: (selectionRect.width * scaleX).rounded(.up),
            height: (selectionRect.height * scaleY).rounded(.up)
        )

        // Ensure crop rect is within image bounds
        let imageRect = CGRect(x: 0, y: 0, width: screenshot.width, height: screenshot.height)
        let clampedRect = cropRect.intersection(imageRect)

        guard !clampedRect.isNull, clampedRect.width > 1, clampedRect.height > 1 else {
            return nil
        }

        return screenshot.cropping(to: clampedRect)
    }
}
