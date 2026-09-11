import SwiftUI

/// The full app window's content (DashboardWindowController - 80% of the screen
/// while connected, a small compact size while idle). Opened via the menu-bar
/// extension's "Open app" button. The compact day-to-day UI is ExtensionView, not
/// this.
struct DashboardView: View {
    @ObservedObject var state: AppState
    var onDisconnect: () -> Void
    var onQuit: () -> Void

    var body: some View {
        ZStack(alignment: .bottom) {
            Color(red: 0.04, green: 0.055, blue: 0.07).ignoresSafeArea() // matches --background

            VStack {
                Spacer()
                card
                Spacer()
            }

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
            .padding(20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 12) {
                if let logo = NSImage(named: "DashboardLogo") {
                    Image(nsImage: logo)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 36, height: 36)
                }
                Text("DVoD")
                    .font(.system(size: 24, weight: .bold))
                Spacer()
                StatusPill(connected: state.connected)
            }

            if state.connected, let payload = state.payload {
                VStack(alignment: .leading, spacing: 4) {
                    Text("TIME REMAINING")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .tracking(0.5)
                    Text(formatDuration(state.remainingSeconds))
                        .font(.system(size: 44, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.orange)
                }
                .padding(.vertical, 4)

                Divider()

                VStack(alignment: .leading, spacing: 12) {
                    InfoRow(label: "Relay", value: payload.relay)
                    InfoRow(label: "Tier", value: payload.tier.capitalized)
                    InfoRow(label: "Local relay", value: "127.0.0.1:8899")
                }

                Button("Disconnect", action: onDisconnect)
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    .tint(.red)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Not connected")
                        .font(.system(size: 16, weight: .semibold))
                    Text("Buy a session in the web app, then click \"Connect via macOS app\" on the session dashboard.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .padding(28)
        .frame(maxWidth: 460)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(red: 0.07, green: 0.09, blue: 0.11)) // matches --card
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color.white.opacity(0.08), lineWidth: 1),
                ),
        )
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

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 13, design: .monospaced))
        }
    }
}
