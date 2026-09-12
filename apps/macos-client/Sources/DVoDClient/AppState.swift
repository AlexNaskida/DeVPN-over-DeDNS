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

/// The real steps AppDelegate.connect() goes through, in order - not a fake
/// animation. AppDelegate sets `AppState.connectStep` right before doing the work
/// each step names, so the dashboard's timeline reflects actual progress, even
/// though in practice the whole sequence usually completes in well under a
/// second (local relay bind + a couple of `networksetup` shells).
enum ConnectStep: Int, CaseIterable {
    case verifying
    case relay
    case proxy
    case connected

    var label: String {
        switch self {
        case .verifying: "Session verified"
        case .relay: "Local relay started"
        case .proxy: "System proxy configured"
        case .connected: "Connected"
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
    @Published var connectStep: ConnectStep?

    var remainingSeconds: TimeInterval {
        guard let payload else { return 0 }
        return max(0, payload.expiresAt - now.timeIntervalSince1970)
    }
}
