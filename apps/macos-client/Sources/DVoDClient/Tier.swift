import Foundation

/// Mirrors packages/session-spec/src/tier.ts - kept in sync by hand since this is a
/// separate Swift target with no shared build step. Update both if pricing changes.
enum Tier: String, CaseIterable, Identifiable {
    case lite
    case standard
    case turbo

    var id: String { rawValue }

    var displayName: String { rawValue.capitalized }

    var reservedMbps: Int {
        switch self {
        case .lite: 5
        case .standard: 25
        case .turbo: 100
        }
    }

    var pricePerHourUsdc: Double {
        switch self {
        case .lite: 0.1
        case .standard: 0.35
        case .turbo: 1.0
        }
    }

    var summary: String {
        "\(reservedMbps) Mbps reserved"
    }
}
