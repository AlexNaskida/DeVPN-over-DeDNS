import Foundation
import Combine

struct ConnectionHistoryEntry: Codable, Identifiable {
    let id: UUID
    let relay: String
    let tier: String
    let connectedAt: Date
    var disconnectedAt: Date?

    var duration: TimeInterval {
        (disconnectedAt ?? Date()).timeIntervalSince(connectedAt)
    }
}

/// Real local persistence (a JSON file under Application Support) - not sample/
/// placeholder data. Every actual connect/disconnect through AppDelegate appends
/// or closes an entry here, so History shows this machine's real session log.
final class ConnectionHistoryStore: ObservableObject {
    @Published private(set) var entries: [ConnectionHistoryEntry] = []

    private let fileURL: URL

    init() {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("DVoD", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        fileURL = dir.appendingPathComponent("connection-history.json")
        load()
    }

    func recordConnect(relay: String, tier: String) -> UUID {
        let entry = ConnectionHistoryEntry(id: UUID(), relay: relay, tier: tier, connectedAt: Date(), disconnectedAt: nil)
        entries.insert(entry, at: 0)
        save()
        return entry.id
    }

    func recordDisconnect(id: UUID) {
        guard let index = entries.firstIndex(where: { $0.id == id }) else { return }
        entries[index].disconnectedAt = Date()
        save()
    }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL) else { return }
        entries = (try? JSONDecoder().decode([ConnectionHistoryEntry].self, from: data)) ?? []
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(entries) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
