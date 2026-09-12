import AppKit
import Combine
import SwiftUI

/// A real, titled app window hosting AppRootView (sidebar + section content) -
/// not a popover anchored to the status item. Opened via the menu bar's
/// "Open app" item.
///
/// Sized dynamically: roomy while actually connected (there's real content worth
/// the space), a small compact size otherwise. Deliberately uses AppKit's own
/// `center()` rather than computing an origin from screen geometry ourselves - the
/// menu-bar popover bug turned out to be exactly that kind of custom positioning
/// math going wrong on an unusual display setup, so this avoids the same mistake:
/// fixed, sane sizes, AppKit does the centering.
final class DashboardWindowController: NSWindowController {
    private static let idleSize = NSSize(width: 760, height: 560)
    private static let connectedSize = NSSize(width: 900, height: 640)
    private var cancellable: AnyCancellable?

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
        // which is what produced an earlier tall/portrait window bug (height
        // ballooning to 1000+pt regardless of setContentSize below). Turning this
        // off makes setContentSize the single source of truth.
        hosting.sizingOptions = []
        let window = NSWindow(contentViewController: hosting)
        window.title = "DVoD"
        window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
        window.isReleasedWhenClosed = false // closing hides it, doesn't destroy the controller
        self.init(window: window)

        resize(connected: state.connected)
        cancellable = state.$connected
            .removeDuplicates()
            .sink { [weak self] connected in self?.resize(connected: connected) }
    }

    private func resize(connected: Bool) {
        guard let window else { return }
        let desired = connected ? Self.connectedSize : Self.idleSize
        // Same fixed size on every normal display - just clamped (never scaled up
        // or repositioned via percentage math, which is what broke this window
        // before) so it still fits whole on a smaller screen.
        let available = (window.screen ?? NSScreen.main)?.visibleFrame.size ?? desired
        let clamped = NSSize(
            width: min(desired.width, available.width - 40),
            height: min(desired.height, available.height - 40),
        )
        window.setContentSize(clamped)
        window.center()
    }

    func showAndFocus() {
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
