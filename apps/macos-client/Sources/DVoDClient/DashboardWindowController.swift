import AppKit
import SwiftUI

/// A real, titled app window hosting DashboardView - not a popover anchored to the
/// status item. Opened explicitly via the menu-bar extension's "Open app" button,
/// sized to 80% of the screen so it actually reads as "an app", not a widget.
final class DashboardWindowController: NSWindowController {
    convenience init(state: AppState, onDisconnect: @escaping () -> Void, onQuit: @escaping () -> Void) {
        let hosting = NSHostingController(
            rootView: DashboardView(state: state, onDisconnect: onDisconnect, onQuit: onQuit),
        )
        let window = NSWindow(contentViewController: hosting)
        window.title = "DVoD"
        window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
        window.isReleasedWhenClosed = false // closing hides it, doesn't destroy the controller
        self.init(window: window)
        sizeToEightyPercentOfScreen()
    }

    private func sizeToEightyPercentOfScreen() {
        guard let window, let screen = NSScreen.main else { return }
        let visible = screen.visibleFrame
        let size = NSSize(width: visible.width * 0.8, height: visible.height * 0.8)
        let origin = NSPoint(
            x: visible.minX + (visible.width - size.width) / 2,
            y: visible.minY + (visible.height - size.height) / 2,
        )
        window.setFrame(NSRect(origin: origin, size: size), display: false)
    }

    func showAndFocus() {
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
