import AppKit
import SwiftUI

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
    private let popover = NSPopover()
    private let state = AppState()
    private lazy var dashboardWindow = DashboardWindowController(
        state: state,
        onDisconnect: { [weak self] in self?.disconnect() },
        onQuit: { [weak self] in self?.quit() },
    )

    private var proxyServer: LocalProxyServer?
    private var activeNetworkService: String?
    private var expiryTimer: Timer?

    private let localPort: UInt16 = 8899

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory) // menu-bar only, no permanent Dock icon

        if let icon = NSImage(named: "MenuBarIcon") {
            icon.isTemplate = true // macOS recolors it to match the menu bar (white on dark)
            icon.size = NSSize(width: 18, height: 18)
            statusItem.button?.image = icon
        } else {
            statusItem.button?.title = "DVoD" // fallback if the icon didn't ship in the bundle
        }
        statusItem.button?.action = #selector(toggleExtension)
        statusItem.button?.target = self

        popover.behavior = .transient // closes when clicking elsewhere
        popover.contentViewController = NSHostingController(
            rootView: ExtensionView(
                state: state,
                onDisconnect: { [weak self] in self?.disconnect() },
                onOpenApp: { [weak self] in self?.openApp() },
                onQuit: { [weak self] in self?.quit() },
            ),
        )

        NSAppleEventManager.shared().setEventHandler(
            self,
            andSelector: #selector(handleGetURLEvent(_:withReplyEvent:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL),
        )
    }

    /// Called when the Dock icon (while running) or a relaunch requests the app
    /// come back to the foreground - shows the same extension a click would.
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows: Bool) -> Bool {
        toggleExtension()
        return true
    }

    @objc private func toggleExtension() {
        guard let button = statusItem.button else { return }
        if popover.isShown {
            popover.performClose(nil)
            return
        }
        state.now = Date() // refresh the countdown the instant it's opened
        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
    }

    /// "Open app" in the extension - the real, 80%-of-screen window.
    private func openApp() {
        popover.performClose(nil)
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
        expiryTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.state.now = Date()
        }
    }

    private func disconnect() {
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
    }

    private func quit() {
        disconnect()
        NSApp.terminate(nil)
    }
}
