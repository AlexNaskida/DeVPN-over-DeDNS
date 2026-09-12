import AppKit

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
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let state = AppState()
    private let historyStore = ConnectionHistoryStore()
    private lazy var dashboardWindow = DashboardWindowController(
        state: state,
        historyStore: historyStore,
        onDisconnect: { [weak self] in self?.disconnect() },
    )

    private var proxyServer: LocalProxyServer?
    private var activeNetworkService: String?
    private var expiryTimer: Timer?
    private var historyEntryId: UUID?

    private let localPort: UInt16 = 8899

    func applicationDidFinishLaunching(_ notification: Notification) {
        terminateOtherRunningInstances() // a stale leftover process (common during
        // dev - rebuilding and relaunching without quitting the old one first)
        // leaves a second, orphaned status item around - only one instance should
        // ever be live.

        NSApp.setActivationPolicy(.accessory) // menu-bar only, no permanent Dock icon

        if let icon = NSImage(named: "MenuBarIcon") {
            icon.isTemplate = true // macOS recolors it to match the menu bar (white on dark)
            icon.size = NSSize(width: 18, height: 18)
            statusItem.button?.image = icon
        } else {
            statusItem.button?.title = "DVoD" // fallback if the icon didn't ship in the bundle
        }

        // A native NSMenu, not a custom-positioned NSPopover - AppKit places this
        // itself, correctly, every time, with zero positioning code of ours to get
        // wrong. The popover approach was fragile in practice; this isn't.
        rebuildMenu()

        NSAppleEventManager.shared().setEventHandler(
            self,
            andSelector: #selector(handleGetURLEvent(_:withReplyEvent:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL),
        )
    }

    private func terminateOtherRunningInstances() {
        guard let bundleId = Bundle.main.bundleIdentifier else { return }
        let myPid = ProcessInfo.processInfo.processIdentifier
        for app in NSWorkspace.shared.runningApplications
        where app.bundleIdentifier == bundleId && app.processIdentifier != myPid {
            app.forceTerminate()
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows: Bool) -> Bool {
        openApp()
        return true
    }

    private func rebuildMenu() {
        let menu = NSMenu()

        if state.connected, let payload = state.payload {
            menu.addItem(disabledItem("Connected via \(payload.relay)"))
            menu.addItem(disabledItem("Tier: \(payload.tier.capitalized) · \(formatDuration(state.remainingSeconds)) left"))
        } else {
            menu.addItem(disabledItem("Not connected"))
        }

        menu.addItem(NSMenuItem.separator())

        menu.addItem(actionItem("Open app", #selector(openApp)))
        if state.connected {
            menu.addItem(actionItem("Disconnect", #selector(disconnect)))
        }

        menu.addItem(NSMenuItem.separator())
        menu.addItem(actionItem("Quit DVoD", #selector(quit), keyEquivalent: "q"))

        statusItem.menu = menu
    }

    private func disabledItem(_ title: String) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.isEnabled = false
        return item
    }

    private func actionItem(_ title: String, _ action: Selector, keyEquivalent: String = "") -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: keyEquivalent)
        item.target = self
        return item
    }

    @objc private func openApp() {
        state.now = Date()
        dashboardWindow.showAndFocus()
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

        state.payload = payload
        state.connected = true
        state.now = Date()
        state.connectedSince = Date()
        historyEntryId = historyStore.recordConnect(
            relay: payload?.relay ?? request.host,
            tier: payload?.tier ?? "unknown",
        )
        rebuildMenu()
        expiryTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            self.state.now = Date()
            self.rebuildMenu() // keeps the countdown in "Tier: ... left" current
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
        state.connected = false
        state.payload = nil
        state.connectedSince = nil
        if let id = historyEntryId {
            historyStore.recordDisconnect(id: id)
            historyEntryId = nil
        }
        rebuildMenu()
    }

    @objc private func quit() {
        disconnect()
        NSApp.terminate(nil)
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        return String(format: "%d:%02d:%02d", total / 3600, (total % 3600) / 60, total % 60)
    }
}
