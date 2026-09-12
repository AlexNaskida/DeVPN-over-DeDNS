import SwiftUI

/// Placeholder only - running a relay is a whole separate long-lived server role
/// (see the orchestrator's relay-registration flow), not something this
/// short-lived menu-bar client does. This screen states that plainly rather than
/// implying a working "become a relay" flow exists here.
struct RelayView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 40))
                .foregroundStyle(.orange)
            Text("Become a Relay")
                .font(.system(size: 22, weight: .bold))
            Text("Running a relay means operating a long-lived server that stakes collateral and serves other users' sessions - a different role from this client app. Relay registration isn't wired up here yet.")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 360)
                .fixedSize(horizontal: false, vertical: true)
            Button("Register as Relay") {}
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .disabled(true)
            Text("Coming soon")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
