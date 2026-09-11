import SwiftUI

/// The full app window's content (DashboardWindowController, sized to 80% of the
/// screen) - opened via the menu-bar extension's "Open app" button. The compact
/// day-to-day UI is ExtensionView, not this.
struct DashboardView: View {
    @ObservedObject var state: AppState
    var onDisconnect: () -> Void
    var onQuit: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 14) {
                    if let logo = NSImage(named: "DashboardLogo") {
                        Image(nsImage: logo)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 40, height: 40)
                    }
                    Text("DVoD")
                        .font(.system(size: 28, weight: .bold))
                    Spacer()
                    StatusPill(connected: state.connected)
                }

                Divider()

                if state.connected, let payload = state.payload {
                    VStack(alignment: .leading, spacing: 16) {
                        InfoRow(label: "Relay", value: payload.relay)
                        InfoRow(label: "Tier", value: payload.tier.capitalized)
                        InfoRow(label: "Time remaining", value: formatDuration(state.remainingSeconds), emphasized: true)
                        InfoRow(label: "Local relay", value: "127.0.0.1:8899")
                    }

                    Button("Disconnect", action: onDisconnect)
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                        .tint(.red)
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Not connected")
                            .font(.system(size: 16, weight: .semibold))
                        Text("Buy a session in the web app, then click \"Connect via macOS app\" on the session dashboard.")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                Divider()

                HStack {
                    Text("Demo Session - see apps/macos-client/README.md for scope")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("Quit", action: onQuit)
                        .buttonStyle(.plain)
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(40)
            .frame(maxWidth: 560)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
            .font(.system(size: 12, weight: .semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
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
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: emphasized ? .bold : .regular, design: .monospaced))
        }
    }
}
