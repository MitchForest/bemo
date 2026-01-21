import SwiftUI

@MainActor
enum BemoTheme {
    static let panelRadius: CGFloat = 16
    static let cardRadius: CGFloat = 10
    static let badgeRadius: CGFloat = 6
    static let buttonRadius: CGFloat = 8
    static let panelPadding: CGFloat = 12
    static let cardPadding: CGFloat = 10
    static let itemSpacing: CGFloat = 8

    static func color(for type: ClipboardItem.ItemType) -> Color {
        switch type {
        case .ocr: return .blue
        case .filePath: return .orange
        case .fileContents: return .purple
        case .screenshot: return .green
        case .recording: return .red
        }
    }

    static var cardBackground: Color { Color.secondary.opacity(0.08) }
    static var cardBackgroundHover: Color { Color.accentColor.opacity(0.12) }
    static var subtleBorder: Color { Color.primary.opacity(0.08) }
    static var subtleBorderHover: Color { Color.accentColor.opacity(0.25) }
}

struct GlassPanelStyle: ViewModifier {
    var cornerRadius: CGFloat = BemoTheme.panelRadius
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .background(RoundedRectangle(cornerRadius: cornerRadius).fill(.ultraThinMaterial.opacity(0.8)))
            .overlay(RoundedRectangle(cornerRadius: cornerRadius).strokeBorder(Color.primary.opacity(colorScheme == .dark ? 0.15 : 0.1), lineWidth: 0.5))
            .shadow(color: .black.opacity(0.06), radius: 1, y: 1)
            .shadow(color: .black.opacity(0.15), radius: 20, y: 10)
    }
}

struct GlassCardStyle: ViewModifier {
    var isHovered: Bool = false
    var accentColor: Color = .accentColor
    var cornerRadius: CGFloat = BemoTheme.cardRadius

    func body(content: Content) -> some View {
        content
            .background(RoundedRectangle(cornerRadius: cornerRadius).fill(isHovered ? accentColor.opacity(0.1) : Color.secondary.opacity(0.06)))
            .overlay(RoundedRectangle(cornerRadius: cornerRadius).strokeBorder(isHovered ? accentColor.opacity(0.3) : Color.primary.opacity(0.06), lineWidth: 0.5))
    }
}

struct TypeBadgeStyle: ViewModifier {
    let color: Color
    var size: CGFloat = 26

    func body(content: Content) -> some View {
        content
            .font(.system(size: size * 0.45, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(color))
    }
}

struct GlowButtonStyle: ButtonStyle {
    let tint: Color
    var isProminent: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 11, weight: .medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(RoundedRectangle(cornerRadius: BemoTheme.buttonRadius).fill(isProminent ? tint : tint.opacity(0.15)))
            .foregroundStyle(isProminent ? .white : tint)
            .overlay(RoundedRectangle(cornerRadius: BemoTheme.buttonRadius).strokeBorder(tint.opacity(isProminent ? 0.3 : 0.2), lineWidth: 0.5))
            .shadow(color: tint.opacity(configuration.isPressed ? 0.4 : 0.2), radius: configuration.isPressed ? 2 : 4, y: 2)
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct CircleIconButtonStyle: ButtonStyle {
    var size: CGFloat = 28
    var tint: Color = .secondary
    var isDestructive: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: size * 0.5, weight: .medium))
            .foregroundStyle(isDestructive ? .red : tint)
            .frame(width: size, height: size)
            .background(Circle().fill(configuration.isPressed ? tint.opacity(0.15) : Color.clear))
            .overlay(Circle().strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.5))
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct FilledCircleIconButtonStyle: ButtonStyle {
    var size: CGFloat = 28
    var tint: Color = .accentColor

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: size * 0.45, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(tint))
            .shadow(color: tint.opacity(0.3), radius: 4, y: 2)
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

extension View {
    func glassPanelStyle(cornerRadius: CGFloat = BemoTheme.panelRadius) -> some View {
        modifier(GlassPanelStyle(cornerRadius: cornerRadius))
    }

    func glassCardStyle(isHovered: Bool = false, accentColor: Color = .accentColor, cornerRadius: CGFloat = BemoTheme.cardRadius) -> some View {
        modifier(GlassCardStyle(isHovered: isHovered, accentColor: accentColor, cornerRadius: cornerRadius))
    }

    func typeBadgeStyle(color: Color, size: CGFloat = 26) -> some View {
        modifier(TypeBadgeStyle(color: color, size: size))
    }
}
