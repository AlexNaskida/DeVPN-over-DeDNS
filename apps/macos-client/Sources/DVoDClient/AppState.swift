import Foundation
import Combine

/// Shared, observable state - both AppDelegate (which drives it) and DashboardView
/// (which just renders it) read from the same source, so the SwiftUI dashboard
/// updates reactively with no manual view-rebuilding.
final class AppState: ObservableObject {
    @Published var connected: Bool = false
    @Published var payload: SessionTokenPayload?
    @Published var now: Date = Date()

    var remainingSeconds: TimeInterval {
        guard let payload else { return 0 }
        return max(0, payload.expiresAt - now.timeIntervalSince1970)
    }
}
