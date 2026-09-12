import SwiftUI

/// Exact mirror of packages/ui/src/tokens.ts - kept in sync by hand since this is
/// a separate Swift target with no shared build step. This app should never
/// introduce a color outside this set; see ACCENT_RESERVED_FOR in tokens.ts for
/// which three UI moments `accent` is allowed in.
enum Tokens {
    static let background = Color(hex: 0x0A0E12)
    static let foreground = Color(hex: 0xEAEDF0)
    static let card = Color(hex: 0x12171C)
    static let primary = Color(hex: 0x2E7D6B)
    static let secondary = Color(hex: 0x3B4A52)
    static let secondaryForeground = Color(hex: 0xEAEDF0)
    static let muted = Color(hex: 0x1B2126)
    static let mutedForeground = Color(hex: 0x8A97A0)
    static let accent = Color(hex: 0xE8A33D)
    static let destructive = Color(hex: 0xC0473F)
    static let border = Color(hex: 0x232B31)
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
