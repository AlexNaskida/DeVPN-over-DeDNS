import AppKit
import Foundation

/// Everything a connect link needs - see web app's `dvod://connect` link builder
/// (apps/web/src/app/session/[id]/page.tsx). `host`/`port` point at a real,
/// currently-local-only tunnel-server instance - see apps/macos-client/README.md's
/// "Demo Session" scope note.
struct ConnectRequest {
    let token: String
    let host: String
    let port: UInt16
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    private var proxyServer: LocalProxyServer?
    private var activeNetworkService: String?
    private var expiryTimer: Timer?

    private let localPort: UInt16 = 8899

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory) // menu-bar only, no Dock icon
        statusItem.button?.title = "DVoD"
        rebuildMenu(connected: false, payload: nil)

        NSAppleEventManager.shared().setEventHandler(
            self,
            andSelector: #selector(handleGetURLEvent(_:withReplyEvent:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL),
        )
    }

    @objc private func handleGetURLEvent(_ event: NSAppleEventDescriptor, withReplyEvent: NSAppleEventDescriptor) {
        guard let urlString = event.paramDescriptor(forKeyword: keyDirectObject)?.stringValue,
              let request = Self.parseConnectURL(urlString) else { return }
        connect(request)
    }

    static func parseConnectURL(_ urlString: String) -> ConnectRequest? {
        guard let components = URLComponents(string: urlString),
              components.scheme == "dvod", components.host == "connect" else { return nil }
        let items = components.queryItems ?? []
        func value(_ name: String) -> String? { items.first { $0.name == name }?.value }
        guard let token = value("token"), let host = value("host"),
              let portString = value("port"), let port = UInt16(portString) else { return nil }
        return ConnectRequest(token: token, host: host, port: port)
    }

    private func connect(_ request: ConnectRequest) {
        disconnect() // clean up any prior session first

        let payload = SessionTokenPayload.decode(request.token)

        do {
            let server = try LocalProxyServer(
                localPort: localPort,
                remoteHost: request.host,
                remotePort: request.port,
                token: request.token,
            )
            server.onEvent = { event in NSLog("[DVoD] %@", event) }
            server.start()
            proxyServer = server
        } catch {
            NSLog("[DVoD] failed to start local proxy: %@", error.localizedDescription)
            return
        }

        guard let service = SystemProxy.activeServiceName() else {
            NSLog("[DVoD] no active network service found")
            return
        }
        activeNetworkService = service
        SystemProxy.enable(service: service, host: "127.0.0.1", port: Int(localPort))

        rebuildMenu(connected: true, payload: payload)
        expiryTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.rebuildMenu(connected: true, payload: payload)
        }
    }

    @objc private func disconnect() {
        expiryTimer?.invalidate()
        expiryTimer = nil
        proxyServer?.stop()
        proxyServer = nil
        if let service = activeNetworkService {
            SystemProxy.disable(service: service)
        }
        activeNetworkService = nil
        rebuildMenu(connected: false, payload: nil)
    }

    private func rebuildMenu(connected: Bool, payload: SessionTokenPayload?) {
        let menu = NSMenu()

        if connected, let payload {
            let remaining = max(0, payload.expiresAt - Date().timeIntervalSince1970)
            statusItem.button?.title = "DVoD ● \(Self.formatDuration(remaining))"
            menu.addItem(withTitle: "Connected via \(payload.relay)", action: nil, keyEquivalent: "").isEnabled = false
            menu.addItem(withTitle: "Tier: \(payload.tier)", action: nil, keyEquivalent: "").isEnabled = false
            menu.addItem(NSMenuItem.separator())
            let item = NSMenuItem(title: "Disconnect", action: #selector(disconnect), keyEquivalent: "")
            item.target = self
            menu.addItem(item)
        } else {
            statusItem.button?.title = "DVoD"
            menu.addItem(withTitle: "Not connected", action: nil, keyEquivalent: "").isEnabled = false
            menu.addItem(withTitle: "Buy a session in the web app, then click", action: nil, keyEquivalent: "").isEnabled = false
            menu.addItem(withTitle: "\"Connect via macOS app\" on the dashboard.", action: nil, keyEquivalent: "").isEnabled = false
        }

        menu.addItem(NSMenuItem.separator())
        menu.addItem(withTitle: "Quit DVoD", action: #selector(quit), keyEquivalent: "q")
        statusItem.menu = menu
    }

    @objc private func quit() {
        disconnect()
        NSApp.terminate(nil)
    }

    private static func formatDuration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        return String(format: "%d:%02d:%02d", total / 3600, (total % 3600) / 60, total % 60)
    }
}
