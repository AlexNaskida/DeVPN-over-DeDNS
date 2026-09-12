import AppKit
import SwiftUI

/// A real, titled app window hosting AppRootView (sidebar + section content) -
/// not a popover anchored to the status item. Opened via the menu bar's
/// "Open app" item.
///
/// One fixed default size, set once and never changed afterward (including on
/// connect/disconnect) - deliberately not dynamic. Uses AppKit's own `center()`
/// rather than computing an origin from screen geometry ourselves - the menu-bar
/// popover bug turned out to be exactly that kind of custom positioning math
/// going wrong on an unusual display setup, so this avoids the same mistake.
final class DashboardWindowController: NSWindowController {
    private static let defaultSize = NSSize(width: 1600, height: 900)

    convenience init(
        state: AppState,
        historyStore: ConnectionHistoryStore,
        onDisconnect: @escaping () -> Void,
    ) {
        let hosting = NSHostingController(
            rootView: AppRootView(state: state, historyStore: historyStore, onDisconnect: onDisconnect),
        )
        // Without this, NSHostingController resizes the window to SwiftUI's own
        // "ideal" content size on every layout pass - and flexible frames (maxWidth/
        // maxHeight: .infinity) report a huge, effectively unbounded ideal size,
        // which is what produced an earlier tall/portrait window bug. Turning this
        // off makes the one setContentSize call below the single source of truth.
        hosting.sizingOptions = []
        let window = NSWindow(contentViewController: hosting)
        window.title = "DVoD"
        window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
        window.isReleasedWhenClosed = false // closing hides it, doesn't destroy the controller
        self.init(window: window)

        // Same fixed size on every normal display - just clamped (never scaled up
        // or repositioned via percentage math) so it still fits whole on a
        // smaller screen. Set once here; nothing resizes it afterward.
        let available = (window.screen ?? NSScreen.main)?.visibleFrame.size ?? Self.defaultSize
        let clamped = NSSize(
            width: min(Self.defaultSize.width, available.width - 40),
            height: min(Self.defaultSize.height, available.height - 40),
        )
        window.setContentSize(clamped)
        window.center()
    }

    func showAndFocus() {
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
