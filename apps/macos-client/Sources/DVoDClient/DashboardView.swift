import SwiftUI

/// Shown as a popover when the menu-bar icon is clicked (left click) - the "main
/// dashboard" this app previously didn't have, beyond a status-item title. Right
/// click still gives the minimal action menu (Disconnect/Quit) for anyone who
/// prefers that over the dashboard's own buttons.
struct DashboardView: View {
    @ObservedObject var state: AppState
    var onDisconnect: () -> Void
    var onQuit: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                if let logo = NSImage(named: "DashboardLogo") {
                    Image(nsImage: logo)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 22, height: 22)
                }
                Text("DVoD")
                    .font(.system(size: 15, weight: .bold))
                Spacer()
                StatusPill(connected: state.connected)
            }

            Divider()

            if state.connected, let payload = state.payload {
                VStack(alignment: .leading, spacing: 10) {
                    InfoRow(label: "Relay", value: payload.relay)
                    InfoRow(label: "Tier", value: payload.tier.capitalized)
                    InfoRow(label: "Time remaining", value: formatDuration(state.remainingSeconds), emphasized: true)
                    InfoRow(label: "Local relay", value: "127.0.0.1:8899")
                }

                Button("Disconnect", action: onDisconnect)
                    .buttonStyle(.bordered)
                    .tint(.red)
            } else {
                Text("Not connected")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                Text("Buy a session in the web app, then click \"Connect via macOS app\" on the session dashboard.")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Divider()

            HStack {
                Text("Demo Session - see README for scope")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                Spacer()
                Button("Quit", action: onQuit)
                    .buttonStyle(.plain)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(width: 280)
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        return String(format: "%d:%02d:%02d", total / 3600, (total % 3600) / 60, total % 60)
    }
}

private struct StatusPill: View {
    let connected: Bool
    var body: some View {
        Text(connected ? "Connected" : "Idle")
            .font(.system(size: 10, weight: .semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(connected ? Color.green.opacity(0.18) : Color.gray.opacity(0.18))
            .foregroundStyle(connected ? Color.green : Color.gray)
            .clipShape(Capsule())
    }
}

private struct InfoRow: View {
    let label: String
    let value: String
    var emphasized: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: emphasized ? .bold : .regular, design: .monospaced))
        }
    }
}
