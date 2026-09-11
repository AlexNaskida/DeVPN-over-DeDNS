import AppKit
import Combine
import SwiftUI

/// A real, titled app window hosting DashboardView - not a popover anchored to the
/// status item. Opened explicitly via the menu-bar extension's "Open app" button.
///
/// Sized dynamically: 80% of the screen while actually connected (there's real
/// content worth the space - relay, tier, live countdown), a small compact size
/// otherwise (a huge, mostly-empty window for "not connected, go buy a session"
/// just looks broken).
final class DashboardWindowController: NSWindowController {
    private static let idleSize = NSSize(width: 480, height: 420)
    private var cancellable: AnyCancellable?

    convenience init(state: AppState, onDisconnect: @escaping () -> Void, onQuit: @escaping () -> Void) {
        let hosting = NSHostingController(
            rootView: DashboardView(state: state, onDisconnect: onDisconnect, onQuit: onQuit),
        )
        let window = NSWindow(contentViewController: hosting)
        window.title = "DVoD"
        window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
        window.isReleasedWhenClosed = false // closing hides it, doesn't destroy the controller
        self.init(window: window)

        resize(connected: state.connected, animate: false)
        cancellable = state.$connected
            .removeDuplicates()
            .sink { [weak self] connected in self?.resize(connected: connected, animate: true) }
    }

    private func resize(connected: Bool, animate: Bool) {
        guard let window, let screen = window.screen ?? NSScreen.main else { return }
        let visible = screen.visibleFrame

        let size: NSSize = connected
            ? NSSize(width: visible.width * 0.8, height: visible.height * 0.8)
            : Self.idleSize
        let origin = NSPoint(
            x: visible.minX + (visible.width - size.width) / 2,
            y: visible.minY + (visible.height - size.height) / 2,
        )
        window.setFrame(NSRect(origin: origin, size: size), display: true, animate: animate)
    }

    func showAndFocus() {
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
