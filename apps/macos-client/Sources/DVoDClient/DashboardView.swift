import SwiftUI

/// The Dashboard section's content, shown in AppRootView's detail pane. A 3D hero
/// (Hero3DView) fills the idle state instead of empty space; once connected it's
/// replaced by the live session card with more detail than before.
struct DashboardView: View {
    @ObservedObject var state: AppState
    var onDisconnect: () -> Void

    var body: some View {
        ZStack {
            if state.connected, let payload = state.payload {
                connectedCard(payload)
            } else {
                idleHero
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Tokens.background)
    }

    private var idleHero: some View {
        VStack(spacing: 24) {
            Hero3DView()
                .frame(width: 280, height: 220)

            VStack(spacing: 6) {
                Text("Not connected")
                    .font(.system(size: 20, weight: .semibold))
                Text("Buy a session in the web app, then click \"Connect via macOS app\" on the session dashboard.")
                    .font(.system(size: 13))
                    .foregroundStyle(Tokens.mutedForeground)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 320)
            }
        }
    }

    private func connectedCard(_ payload: SessionTokenPayload) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 12) {
                Text("Active Session")
                    .font(.system(size: 22, weight: .bold))
                Spacer()
                StatusPill(connected: true)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("TIME REMAINING")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Tokens.mutedForeground)
                    .tracking(0.5)
                Text(formatDuration(state.remainingSeconds))
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Tokens.accent) // accent reserved for exactly this: live-session-countdown
            }
            .padding(.vertical, 4)

            Divider()

            RelaySequenceTimeline(currentStep: state.connectStep)
                .padding(.vertical, 4)

            Divider()

            VStack(alignment: .leading, spacing: 12) {
                InfoRow(label: "Relay", value: payload.relay)
                InfoRow(label: "Tier", value: payload.tier.capitalized)
                InfoRow(label: "Purchased duration", value: "\(payload.hours)h")
                InfoRow(label: "Local relay", value: "127.0.0.1:8899")
                if let connectedSince = state.connectedSince {
                    InfoRow(label: "Connected since", value: connectedSince.formatted(date: .omitted, time: .shortened))
                }
                InfoRow(label: "Session ID", value: "#\(payload.sessionId)")
            }

            Button("Disconnect", action: onDisconnect)
                .buttonStyle(.bordered)
                .controlSize(.large)
                .tint(Tokens.destructive)
        }
        .padding(28)
        .frame(maxWidth: 460)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Tokens.card)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Tokens.border, lineWidth: 1),
                ),
        )
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        return String(format: "%d:%02d:%02d", total / 3600, (total % 3600) / 60, total % 60)
    }
}

struct StatusPill: View {
    let connected: Bool
    var body: some View {
        Text(connected ? "Connected" : "Idle")
            .font(.system(size: 12, weight: .semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(connected ? Tokens.primary.opacity(0.18) : Tokens.muted)
            .foregroundStyle(connected ? Tokens.primary : Tokens.mutedForeground)
            .clipShape(Capsule())
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(Tokens.mutedForeground)
            Spacer()
            Text(value)
                .font(.system(size: 13, design: .monospaced))
        }
    }
}
