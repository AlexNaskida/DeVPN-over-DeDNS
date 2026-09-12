import SwiftUI

/// Real local history - see ConnectionHistoryStore.swift. Every actual connect/
/// disconnect through this app gets an entry; nothing here is sample data.
struct HistoryView: View {
    @ObservedObject var store: ConnectionHistoryStore

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Connection History")
                .font(.system(size: 22, weight: .bold))
                .padding(.horizontal, 28)
                .padding(.top, 28)
                .padding(.bottom, 12)

            if store.entries.isEmpty {
                VStack(spacing: 8) {
                    Spacer()
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 32))
                        .foregroundStyle(.secondary)
                    Text("No sessions yet on this machine")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(store.entries) { entry in
                            row(entry)
                        }
                    }
                    .padding(.horizontal, 28)
                    .padding(.bottom, 28)
                }
            }
        }
    }

    private func row(_ entry: ConnectionHistoryEntry) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.relay)
                    .font(.system(size: 13, weight: .medium))
                Text(entry.connectedAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(entry.tier.capitalized)
                .font(.system(size: 11, weight: .semibold))
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color.orange.opacity(0.15))
                .foregroundStyle(.orange)
                .clipShape(Capsule())
            Text(durationLabel(entry))
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(width: 70, alignment: .trailing)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color(red: 0.07, green: 0.09, blue: 0.11)),
        )
    }

    private func durationLabel(_ entry: ConnectionHistoryEntry) -> String {
        let total = Int(entry.duration)
        let ongoing = entry.disconnectedAt == nil
        return String(format: "%@%d:%02d:%02d", ongoing ? "▶ " : "", total / 3600, (total % 3600) / 60, total % 60)
    }
}
