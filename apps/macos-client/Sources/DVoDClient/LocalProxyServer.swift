import Foundation
import Network

/// A real local HTTP CONNECT proxy (127.0.0.1 only) that solves one specific
/// problem: macOS's system proxy settings (SystemProxy.swift, via `networksetup`)
/// can't inject a custom header, but relay/handler_cre/tunnel-server's CONNECT
/// handler requires `x-session-token` on every request. So this sits in between:
/// the OS points at us (no auth needed, it's local-only), and *we* open the real
/// connection to the remote tunnel-server and add the header ourselves.
///
/// This mirrors the tunnel-server's own real CONNECT-proxy shape (real DNS
/// resolution via the OS resolver, real bidirectional piping) - it's not a stub.
final class LocalProxyServer {
    private let listener: NWListener
    private let remoteHost: String
    private let remotePort: UInt16
    private let token: String
    var onEvent: ((String) -> Void)?

    init(localPort: UInt16, remoteHost: String, remotePort: UInt16, token: String) throws {
        self.remoteHost = remoteHost
        self.remotePort = remotePort
        self.token = token
        guard let port = NWEndpoint.Port(rawValue: localPort) else {
            throw NSError(domain: "DVoDClient", code: 1, userInfo: [NSLocalizedDescriptionKey: "invalid local port"])
        }
        listener = try NWListener(using: .tcp, on: port)
        listener.newConnectionHandler = { [weak self] conn in self?.handleClient(conn) }
    }

    func start() { listener.start(queue: .main) }
    func stop() { listener.cancel() }

    private func handleClient(_ client: NWConnection) {
        client.start(queue: .main)
        readUntilDoubleCRLF(on: client) { [weak self] headerText, leftover in
            guard let self else { return }
            guard let headerText, let firstLine = headerText.split(separator: "\r\n").first,
                  firstLine.hasPrefix("CONNECT ") else {
                client.cancel()
                return
            }
            let parts = firstLine.split(separator: " ")
            guard parts.count >= 2 else { client.cancel(); return }
            let target = String(parts[1])
            self.onEvent?("connecting to \(target) via \(self.remoteHost):\(self.remotePort)")
            self.bridgeToRemote(target: target, client: client, leftover: leftover)
        }
    }

    private func bridgeToRemote(target: String, client: NWConnection, leftover: Data) {
        guard let port = NWEndpoint.Port(rawValue: remotePort) else { client.cancel(); return }
        let remote = NWConnection(host: NWEndpoint.Host(remoteHost), port: port, using: .tcp)
        remote.start(queue: .main)

        let request = "CONNECT \(target) HTTP/1.1\r\nHost: \(target)\r\nx-session-token: \(token)\r\n\r\n"
        remote.send(content: request.data(using: .utf8), completion: .contentProcessed { _ in })

        readUntilDoubleCRLF(on: remote) { [weak self] headerText, remoteLeftover in
            guard let self else { return }
            guard let headerText, headerText.hasPrefix("HTTP/1.1 200") || headerText.hasPrefix("HTTP/1.0 200") else {
                let reason = headerText ?? "no response"
                self.onEvent?("rejected: \(reason)")
                client.send(content: "HTTP/1.1 502 Bad Gateway\r\n\r\n".data(using: .utf8), completion: .contentProcessed { _ in
                    client.cancel()
                })
                remote.cancel()
                return
            }
            client.send(content: "HTTP/1.1 200 Connection Established\r\n\r\n".data(using: .utf8), completion: .contentProcessed { _ in
                if !leftover.isEmpty {
                    remote.send(content: leftover, completion: .contentProcessed { _ in })
                }
                if !remoteLeftover.isEmpty {
                    client.send(content: remoteLeftover, completion: .contentProcessed { _ in })
                }
                self.pump(from: client, to: remote)
                self.pump(from: remote, to: client)
            })
        }
    }

    /// Bidirectional byte relay, one direction per call (called twice per tunnel).
    private func pump(from source: NWConnection, to destination: NWConnection) {
        source.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, isComplete, error in
            if let data, !data.isEmpty {
                destination.send(content: data, completion: .contentProcessed { _ in })
            }
            if isComplete || error != nil {
                source.cancel()
                destination.cancel()
                return
            }
            self?.pump(from: source, to: destination)
        }
    }

    /// Reads from `connection` until "\r\n\r\n", returning the header text (decoded,
    /// without the trailing blank line) and any bytes already received past it
    /// (a client's TLS ClientHello often arrives in the same read as its CONNECT
    /// request - those bytes belong to the tunnel, not the headers).
    private func readUntilDoubleCRLF(
        on connection: NWConnection,
        buffer: Data = Data(),
        completion: @escaping (String?, Data) -> Void,
    ) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, isComplete, error in
            var buffer = buffer
            if let data { buffer.append(data) }

            if let range = buffer.range(of: Data("\r\n\r\n".utf8)) {
                let headerData = buffer[..<range.lowerBound]
                let leftover = buffer[range.upperBound...]
                completion(String(data: headerData, encoding: .utf8), Data(leftover))
                return
            }
            if isComplete || error != nil {
                completion(nil, Data())
                return
            }
            self?.readUntilDoubleCRLF(on: connection, buffer: buffer, completion: completion)
        }
    }
}
