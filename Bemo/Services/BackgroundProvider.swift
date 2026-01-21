import AppKit
import CoreImage

// MARK: - Background Provider

/// Provides background images for composited recordings
actor BackgroundProvider {
    static let shared = BackgroundProvider()

    // MARK: - Private

    private var cachedWallpaper: CIImage?
    private var cachedBlurredWallpaper: CIImage?
    private var wallpaperCacheSize: CGSize = .zero

    private init() {}

    // MARK: - Public API

    /// Load background image for the given style and size
    /// - Parameters:
    ///   - style: The background style to generate
    ///   - size: Output size for the background
    ///   - wallpaperURL: Wallpaper URL to use for wallpaper styles
    /// - Returns: CIImage of the background
    func loadBackground(
        _ style: BackgroundStyle,
        size: CGSize,
        wallpaperURL: URL? = nil
    ) async throws -> CIImage {
        switch style {
        case .wallpaper:
            return try await loadWallpaper(from: wallpaperURL, size: size)

        case .blur:
            return try await loadBlurredWallpaper(from: wallpaperURL, size: size)

        case .solid(let red, let green, let blue):
            return createSolidColor(red: red, green: green, blue: blue, size: size)

        case .gradient(let startR, let startG, let startB, let endR, let endG, let endB):
            return createGradient(
                startR: startR, startG: startG, startB: startB,
                endR: endR, endG: endG, endB: endB,
                size: size
            )
        }
    }

    // MARK: - Wallpaper Loading

    private func loadWallpaper(from wallpaperURL: URL?, size: CGSize) async throws -> CIImage {
        // Check cache
        if let cached = cachedWallpaper, wallpaperCacheSize == size {
            return cached
        }

        let resolvedWallpaperURL: URL?
        if let wallpaperURL {
            resolvedWallpaperURL = wallpaperURL
        } else {
            resolvedWallpaperURL = await resolveWallpaperURL()
        }
        guard let resolvedWallpaperURL else {
            // Fallback to solid color
            return createSolidColor(red: 0.1, green: 0.1, blue: 0.12, size: size)
        }

        // Load image
        guard let nsImage = NSImage(contentsOf: resolvedWallpaperURL),
              let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            return createSolidColor(red: 0.1, green: 0.1, blue: 0.12, size: size)
        }

        var ciImage = CIImage(cgImage: cgImage)

        // Scale and crop to fill the output size
        ciImage = scaleToFill(image: ciImage, targetSize: size)

        // Cache
        cachedWallpaper = ciImage
        wallpaperCacheSize = size

        return ciImage
    }

    private func loadBlurredWallpaper(from wallpaperURL: URL?, size: CGSize) async throws -> CIImage {
        // Check cache
        if let cached = cachedBlurredWallpaper, wallpaperCacheSize == size {
            return cached
        }

        // First load the wallpaper
        let wallpaper = try await loadWallpaper(from: wallpaperURL, size: size)

        // Apply Gaussian blur
        guard let blurFilter = CIFilter(name: "CIGaussianBlur") else {
            return wallpaper
        }

        blurFilter.setValue(wallpaper, forKey: kCIInputImageKey)
        blurFilter.setValue(30.0, forKey: kCIInputRadiusKey)  // Strong blur

        guard var blurred = blurFilter.outputImage else {
            return wallpaper
        }

        // Blur extends the image bounds, so crop back to original size
        blurred = blurred.cropped(to: CGRect(origin: .zero, size: size))

        // Apply slight darkening for better contrast
        if let darkenFilter = CIFilter(name: "CIColorControls") {
            darkenFilter.setValue(blurred, forKey: kCIInputImageKey)
            darkenFilter.setValue(-0.1, forKey: kCIInputBrightnessKey)
            darkenFilter.setValue(1.1, forKey: kCIInputContrastKey)
            if let darkened = darkenFilter.outputImage {
                blurred = darkened.cropped(to: CGRect(origin: .zero, size: size))
            }
        }

        // Cache
        cachedBlurredWallpaper = blurred

        return blurred
    }

    private func resolveWallpaperURL() async -> URL? {
        await MainActor.run {
            guard let screen = NSScreen.main else { return nil }
            return NSWorkspace.shared.desktopImageURL(for: screen)
        }
    }

    // MARK: - Solid Color

    private func createSolidColor(red: CGFloat, green: CGFloat, blue: CGFloat, size: CGSize) -> CIImage {
        let color = CIColor(red: red, green: green, blue: blue)

        guard let colorGenerator = CIFilter(name: "CIConstantColorGenerator") else {
            // Fallback: create a 1x1 pixel image and scale
            return CIImage(color: color).cropped(to: CGRect(origin: .zero, size: size))
        }

        colorGenerator.setValue(color, forKey: kCIInputColorKey)

        guard let output = colorGenerator.outputImage else {
            return CIImage(color: color).cropped(to: CGRect(origin: .zero, size: size))
        }

        return output.cropped(to: CGRect(origin: .zero, size: size))
    }

    // MARK: - Gradient

    private func createGradient(
        startR: CGFloat, startG: CGFloat, startB: CGFloat,
        endR: CGFloat, endG: CGFloat, endB: CGFloat,
        size: CGSize
    ) -> CIImage {
        let startColor = CIColor(red: startR, green: startG, blue: startB)
        let endColor = CIColor(red: endR, green: endG, blue: endB)

        guard let gradientFilter = CIFilter(name: "CILinearGradient") else {
            return createSolidColor(red: startR, green: startG, blue: startB, size: size)
        }

        // Vertical gradient from top to bottom
        let startPoint = CIVector(x: size.width / 2, y: size.height)  // Top
        let endPoint = CIVector(x: size.width / 2, y: 0)              // Bottom

        gradientFilter.setValue(startColor, forKey: "inputColor0")
        gradientFilter.setValue(endColor, forKey: "inputColor1")
        gradientFilter.setValue(startPoint, forKey: "inputPoint0")
        gradientFilter.setValue(endPoint, forKey: "inputPoint1")

        guard let output = gradientFilter.outputImage else {
            return createSolidColor(red: startR, green: startG, blue: startB, size: size)
        }

        return output.cropped(to: CGRect(origin: .zero, size: size))
    }

    // MARK: - Image Utilities

    /// Scale image to fill target size (center crop)
    private func scaleToFill(image: CIImage, targetSize: CGSize) -> CIImage {
        let imageSize = image.extent.size

        // Calculate scale to fill
        let scaleX = targetSize.width / imageSize.width
        let scaleY = targetSize.height / imageSize.height
        let scale = max(scaleX, scaleY)

        // Scale the image
        let scaledImage = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

        // Calculate crop rect to center
        let scaledSize = CGSize(
            width: imageSize.width * scale,
            height: imageSize.height * scale
        )
        let cropX = (scaledSize.width - targetSize.width) / 2
        let cropY = (scaledSize.height - targetSize.height) / 2

        let cropRect = CGRect(
            x: cropX,
            y: cropY,
            width: targetSize.width,
            height: targetSize.height
        )

        // Crop to target size
        var cropped = scaledImage.cropped(to: cropRect)

        // Translate to origin
        cropped = cropped.transformed(by: CGAffineTransform(translationX: -cropX, y: -cropY))

        return cropped
    }
}
