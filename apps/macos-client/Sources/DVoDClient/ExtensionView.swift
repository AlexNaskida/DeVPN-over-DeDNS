import SwiftUI

/// The actual menu-bar extension - compact, shown as a popover when the status
/// item icon is clicked. "Open app" hands off to the full DashboardWindowController
/// window (80% of the screen) - this view stays deliberately small.
struct ExtensionView: View {
    @ObservedObject var state: AppState
    var onDisconnect: () -> Void
    var onOpenApp: () -> Void
    var onQuit: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                if let logo = NSImage(named: "DashboardLogo") {
                    Image(nsImage: logo)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 16, height: 16)
                }
                Text("DVoD")
                    .font(.system(size: 13, weight: .bold))
                Spacer()
                Text(state.connected ? "Connected" : "Idle")
                    .font(.system(size: 9, weight: .semibold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(state.connected ? Color.green.opacity(0.18) : Color.gray.opacity(0.18))
                    .foregroundStyle(state.connected ? Color.green : Color.gray)
                    .clipShape(Capsule())
            }

            if state.connected, let payload = state.payload {
                Text("\(payload.relay) · \(formatDuration(state.remainingSeconds)) left")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Divider()

            VStack(spacing: 6) {
                Button("Open app", action: onOpenApp)
                    .buttonStyle(.borderedProminent)
                    .frame(maxWidth: .infinity)

                if state.connected {
                    Button("Disconnect", action: onDisconnect)
                        .buttonStyle(.bordered)
                        .tint(.red)
                        .frame(maxWidth: .infinity)
                }

                Button("Quit", action: onQuit)
                    .buttonStyle(.plain)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(14)
        .frame(width: 220)
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        return String(format: "%d:%02d:%02d", total / 3600, (total % 3600) / 60, total % 60)
    }
}
