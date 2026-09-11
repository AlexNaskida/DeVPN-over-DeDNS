import AppKit
import SwiftUI

/// A real, titled app window hosting DashboardView - not a popover anchored to the
/// status item (which was positioning far from the menu bar for some users; a
/// normal window sidesteps that entirely by just appearing at a sane default
/// screen position). Shown on launch, on Dock/relaunch "reopen", and by clicking
/// the menu bar icon - "opening it as an app", not only a menu extension.
final class DashboardWindowController: NSWindowController {
    convenience init(state: AppState, onDisconnect: @escaping () -> Void, onQuit: @escaping () -> Void) {
        let hosting = NSHostingController(
            rootView: DashboardView(state: state, onDisconnect: onDisconnect, onQuit: onQuit),
        )
        let window = NSWindow(contentViewController: hosting)
        window.title = "DVoD"
        window.styleMask = [.titled, .closable, .miniaturizable]
        window.isReleasedWhenClosed = false // closing hides it, doesn't destroy the controller
        window.center()
        self.init(window: window)
    }

    func showAndFocus() {
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
