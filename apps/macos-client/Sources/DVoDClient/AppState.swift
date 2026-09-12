import Foundation
import Combine

enum SidebarSection: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case purchase = "Purchase"
    case history = "History"
    case relay = "Become a Relay"

    var id: String { rawValue }

    var systemImage: String {
        switch self {
        case .dashboard: "shield.lefthalf.filled"
        case .purchase: "cart"
        case .history: "clock.arrow.circlepath"
        case .relay: "antenna.radiowaves.left.and.right"
        }
    }
}

/// Shared, observable state - both AppDelegate (which drives it) and DashboardView
/// (which just renders it) read from the same source, so the SwiftUI dashboard
/// updates reactively with no manual view-rebuilding.
final class AppState: ObservableObject {
    @Published var connected: Bool = false
    @Published var payload: SessionTokenPayload?
    @Published var now: Date = Date()
    @Published var connectedSince: Date?
    @Published var selectedSection: SidebarSection = .dashboard

    var remainingSeconds: TimeInterval {
        guard let payload else { return 0 }
        return max(0, payload.expiresAt - now.timeIntervalSince1970)
    }
}
