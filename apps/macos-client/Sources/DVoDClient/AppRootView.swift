import SwiftUI

/// The whole window's content: a fixed sidebar (SidebarView) plus whichever
/// section is selected. Plain HStack, not NavigationSplitView - NSHostingController
/// + NavigationSplitView fights window auto-sizing in ways similar to the bug
/// DashboardWindowController just had to work around, and a fixed-width sidebar
/// next to a flexible detail pane doesn't need NavigationSplitView's column
/// machinery anyway.
struct AppRootView: View {
    @ObservedObject var state: AppState
    @ObservedObject var historyStore: ConnectionHistoryStore
    var onDisconnect: () -> Void

    var body: some View {
        HStack(spacing: 0) {
            SidebarView(state: state)
            Divider()
            detail
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var detail: some View {
        switch state.selectedSection {
        case .dashboard:
            DashboardView(state: state, onDisconnect: onDisconnect)
        case .purchase:
            PurchaseView()
        case .history:
            HistoryView(store: historyStore)
        case .relay:
            RelayView()
        }
    }
}
