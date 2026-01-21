import CoreImage
import CoreVideo
import AppKit

// MARK: - Frame Renderer

/// Composites screen captures with backgrounds, styling, and camera overlays
final class FrameRenderer: @unchecked Sendable {

    // MARK: - Properties

    private let ciContext: CIContext
    private let colorSpace: CGColorSpace
    private var outputSize: CGSize
    private var style: RecordingStyle
    private var backgroundImage: CIImage

    // Pixel buffer pool for efficient memory reuse
    private var pixelBufferPool: CVPixelBufferPool?

    // MARK: - Initialization

    /// Initialize the frame renderer
    /// - Parameters:
    ///   - outputSize: Final output frame size
    ///   - style: Recording style configuration
    ///   - background: Pre-loaded background CIImage
    init(outputSize: CGSize, style: RecordingStyle, background: CIImage) {
        self.outputSize = outputSize
        self.style = style
        self.backgroundImage = background
        self.colorSpace = CGColorSpaceCreateDeviceRGB()

        // Create Metal-backed CIContext for GPU acceleration
        if let metalDevice = MTLCreateSystemDefaultDevice() {
            self.ciContext = CIContext(mtlDevice: metalDevice, options: [
                .workingColorSpace: colorSpace,
                .cacheIntermediates: false,  // Don't cache to reduce memory
                .priorityRequestLow: false
            ])
        } else {
            self.ciContext = CIContext(options: [
                .workingColorSpace: colorSpace
            ])
        }

        // Create pixel buffer pool
        createPixelBufferPool()
    }

    // MARK: - Public API

    /// Composite a frame
    /// - Parameters:
    ///   - screenBuffer: CVPixelBuffer containing screen capture
    ///   - cameraBuffer: Optional CVPixelBuffer containing camera capture
    /// - Returns: Composited CVPixelBuffer ready for encoding
    func compositeFrame(
        screen screenBuffer: CVPixelBuffer,
        camera cameraBuffer: CVPixelBuffer?
    ) -> CVPixelBuffer? {
        // Create output buffer from pool
        guard let outputBuffer = createOutputBuffer() else {
            return nil
        }

        // Convert screen capture to CIImage
        var screenImage = CIImage(cvPixelBuffer: screenBuffer)

        // Apply frame styling
        screenImage = applyFrameStyle(to: screenImage)

        // Start with background
        var composited = backgroundImage

        // Calculate position to center the screen frame
        let screenSize = screenImage.extent.size
        let offsetX = (outputSize.width - screenSize.width) / 2
        let offsetY = (outputSize.height - screenSize.height) / 2

        // Position and composite screen over background
        let positionedScreen = screenImage.transformed(
            by: CGAffineTransform(translationX: offsetX, y: offsetY)
        )
        composited = positionedScreen.composited(over: composited)

        // Add camera overlay if enabled and buffer provided
        if style.cameraEnabled, let cameraBuffer = cameraBuffer {
            if let cameraOverlay = createCameraOverlay(from: cameraBuffer) {
                composited = cameraOverlay.composited(over: composited)
            }
        }

        // Render to output buffer
        ciContext.render(
            composited,
            to: outputBuffer,
            bounds: CGRect(origin: .zero, size: outputSize),
            colorSpace: colorSpace
        )

        return outputBuffer
    }

    // MARK: - Frame Styling

    private func applyFrameStyle(to image: CIImage) -> CIImage {
        var result = image
        let originalSize = image.extent.size

        // 1. Apply scale
        if style.frameStyle.scale < 1.0 {
            let targetWidth = outputSize.width * style.frameStyle.scale
            let targetHeight = outputSize.height * style.frameStyle.scale

            // Calculate scale factors
            let scaleX = targetWidth / originalSize.width
            let scaleY = targetHeight / originalSize.height
            let scale = min(scaleX, scaleY)

            // Scale from center
            result = result.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        }

        // 2. Apply rounded corners
        if style.frameStyle.cornerRadius > 0 {
            result = applyRoundedCorners(to: result, radius: style.frameStyle.cornerRadius)
        }

        // 3. Apply shadow
        if style.frameStyle.shadowRadius > 0 && style.frameStyle.shadowOpacity > 0 {
            result = applyShadow(to: result)
        }

        return result
    }

    private func applyRoundedCorners(to image: CIImage, radius: CGFloat) -> CIImage {
        let size = image.extent.size

        // Create a rounded rect mask using Core Graphics
        let maskImage = createRoundedRectMask(size: size, radius: radius)

        // Apply mask
        guard let blendFilter = CIFilter(name: "CIBlendWithMask") else {
            return image
        }

        // Create transparent background for masked areas
        let transparent = CIImage(color: CIColor.clear).cropped(to: image.extent)

        blendFilter.setValue(image, forKey: kCIInputImageKey)
        blendFilter.setValue(transparent, forKey: kCIInputBackgroundImageKey)
        blendFilter.setValue(maskImage, forKey: kCIInputMaskImageKey)

        return blendFilter.outputImage ?? image
    }

    private func createRoundedRectMask(size: CGSize, radius: CGFloat) -> CIImage {
        // Use Core Graphics to draw the mask
        let rect = CGRect(origin: .zero, size: size)
        let path = CGPath(
            roundedRect: rect,
            cornerWidth: radius,
            cornerHeight: radius,
            transform: nil
        )

        // Create bitmap context
        let colorSpace = CGColorSpaceCreateDeviceGray()
        guard let context = CGContext(
            data: nil,
            width: Int(size.width),
            height: Int(size.height),
            bitsPerComponent: 8,
            bytesPerRow: Int(size.width),
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else {
            return CIImage(color: CIColor.white).cropped(to: rect)
        }

        // Fill with black (transparent)
        context.setFillColor(gray: 0, alpha: 1)
        context.fill(rect)

        // Draw white rounded rect (visible)
        context.setFillColor(gray: 1, alpha: 1)
        context.addPath(path)
        context.fillPath()

        guard let cgImage = context.makeImage() else {
            return CIImage(color: CIColor.white).cropped(to: rect)
        }

        return CIImage(cgImage: cgImage)
    }

    private func applyShadow(to image: CIImage) -> CIImage {
        // Create shadow using CIFilter
        guard let shadowFilter = CIFilter(name: "CIDropShadow") else {
            return image
        }

        // Shadow parameters
        let radius = style.frameStyle.shadowRadius
        let opacity = style.frameStyle.shadowOpacity

        shadowFilter.setValue(image, forKey: kCIInputImageKey)
        shadowFilter.setValue(radius, forKey: "inputRadius")
        shadowFilter.setValue(CIVector(x: 0, y: -radius / 2), forKey: "inputOffset")
        shadowFilter.setValue(CIColor(red: 0, green: 0, blue: 0, alpha: opacity), forKey: "inputColor")

        return shadowFilter.outputImage ?? image
    }

    // MARK: - Camera Overlay

    private func createCameraOverlay(from cameraBuffer: CVPixelBuffer) -> CIImage? {
        var cameraImage = CIImage(cvPixelBuffer: cameraBuffer)

        // Calculate camera size
        let cameraDimension = style.cameraSize.dimension

        // Scale camera to target size
        let cameraOriginalSize = cameraImage.extent.size
        let scale = cameraDimension / min(cameraOriginalSize.width, cameraOriginalSize.height)
        cameraImage = cameraImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

        // Crop to square
        let scaledSize = cameraImage.extent.size
        let cropX = (scaledSize.width - cameraDimension) / 2
        let cropY = (scaledSize.height - cameraDimension) / 2
        cameraImage = cameraImage.cropped(to: CGRect(
            x: cropX,
            y: cropY,
            width: cameraDimension,
            height: cameraDimension
        ))

        // Translate to origin
        cameraImage = cameraImage.transformed(
            by: CGAffineTransform(translationX: -cropX, y: -cropY)
        )

        // Apply circular mask
        let circleMask = createCircleMask(size: cameraDimension)
        guard let maskFilter = CIFilter(name: "CIBlendWithMask") else {
            return nil
        }

        let transparent = CIImage(color: CIColor.clear).cropped(
            to: CGRect(origin: .zero, size: CGSize(width: cameraDimension, height: cameraDimension))
        )

        maskFilter.setValue(cameraImage, forKey: kCIInputImageKey)
        maskFilter.setValue(transparent, forKey: kCIInputBackgroundImageKey)
        maskFilter.setValue(circleMask, forKey: kCIInputMaskImageKey)

        guard var maskedCamera = maskFilter.outputImage else {
            return nil
        }

        // Add border
        if style.cameraStyle.borderWidth > 0 {
            let border = createCameraBorder(dimension: cameraDimension)
            maskedCamera = maskedCamera.composited(over: border)
        }

        // Position based on camera position setting
        let position = calculateCameraPosition(cameraDimension: cameraDimension)
        maskedCamera = maskedCamera.transformed(
            by: CGAffineTransform(translationX: position.x, y: position.y)
        )

        return maskedCamera
    }

    private func createCircleMask(size: CGFloat) -> CIImage {
        let rect = CGRect(origin: .zero, size: CGSize(width: size, height: size))

        let colorSpace = CGColorSpaceCreateDeviceGray()
        guard let context = CGContext(
            data: nil,
            width: Int(size),
            height: Int(size),
            bitsPerComponent: 8,
            bytesPerRow: Int(size),
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else {
            return CIImage(color: CIColor.white).cropped(to: rect)
        }

        // Fill with black
        context.setFillColor(gray: 0, alpha: 1)
        context.fill(rect)

        // Draw white circle
        context.setFillColor(gray: 1, alpha: 1)
        context.fillEllipse(in: rect)

        guard let cgImage = context.makeImage() else {
            return CIImage(color: CIColor.white).cropped(to: rect)
        }

        return CIImage(cgImage: cgImage)
    }

    private func createCameraBorder(dimension: CGFloat) -> CIImage {
        let borderWidth = style.cameraStyle.borderWidth
        let outerSize = dimension + borderWidth * 2
        let rect = CGRect(origin: .zero, size: CGSize(width: outerSize, height: outerSize))

        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let context = CGContext(
            data: nil,
            width: Int(outerSize),
            height: Int(outerSize),
            bitsPerComponent: 8,
            bytesPerRow: Int(outerSize) * 4,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return CIImage(color: CIColor.clear).cropped(to: rect)
        }

        // Clear background
        context.clear(rect)

        // Draw white circle for border
        context.setFillColor(
            red: style.cameraStyle.borderColorR,
            green: style.cameraStyle.borderColorG,
            blue: style.cameraStyle.borderColorB,
            alpha: 1.0
        )
        context.fillEllipse(in: rect)

        guard let cgImage = context.makeImage() else {
            return CIImage(color: CIColor.clear).cropped(to: rect)
        }

        // Offset so the camera content will be centered
        var borderImage = CIImage(cgImage: cgImage)
        borderImage = borderImage.transformed(
            by: CGAffineTransform(translationX: -borderWidth, y: -borderWidth)
        )

        return borderImage
    }

    private func calculateCameraPosition(cameraDimension: CGFloat) -> CGPoint {
        let margin: CGFloat = 30

        switch style.cameraPosition {
        case .topLeft:
            return CGPoint(x: margin, y: outputSize.height - cameraDimension - margin)
        case .topRight:
            return CGPoint(
                x: outputSize.width - cameraDimension - margin,
                y: outputSize.height - cameraDimension - margin
            )
        case .bottomLeft:
            return CGPoint(x: margin, y: margin)
        case .bottomRight:
            return CGPoint(
                x: outputSize.width - cameraDimension - margin,
                y: margin
            )
        }
    }

    // MARK: - Pixel Buffer Management

    private func createPixelBufferPool() {
        let poolAttributes: [String: Any] = [
            kCVPixelBufferPoolMinimumBufferCountKey as String: 3
        ]

        let pixelBufferAttributes: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: Int(outputSize.width),
            kCVPixelBufferHeightKey as String: Int(outputSize.height),
            kCVPixelBufferIOSurfacePropertiesKey as String: [:],
            kCVPixelBufferMetalCompatibilityKey as String: true
        ]

        CVPixelBufferPoolCreate(
            kCFAllocatorDefault,
            poolAttributes as CFDictionary,
            pixelBufferAttributes as CFDictionary,
            &pixelBufferPool
        )
    }

    private func createOutputBuffer() -> CVPixelBuffer? {
        guard let pool = pixelBufferPool else {
            // Fallback: create individual buffer
            var pixelBuffer: CVPixelBuffer?
            let attributes: [String: Any] = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                kCVPixelBufferWidthKey as String: Int(outputSize.width),
                kCVPixelBufferHeightKey as String: Int(outputSize.height),
                kCVPixelBufferIOSurfacePropertiesKey as String: [:],
                kCVPixelBufferMetalCompatibilityKey as String: true
            ]

            CVPixelBufferCreate(
                kCFAllocatorDefault,
                Int(outputSize.width),
                Int(outputSize.height),
                kCVPixelFormatType_32BGRA,
                attributes as CFDictionary,
                &pixelBuffer
            )

            return pixelBuffer
        }

        var pixelBuffer: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &pixelBuffer)
        return pixelBuffer
    }
}
