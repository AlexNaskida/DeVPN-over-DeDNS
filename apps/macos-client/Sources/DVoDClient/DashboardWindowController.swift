import AppKit
import Combine
import SwiftUI

/// A real, titled app window hosting DashboardView - not a popover anchored to the
/// status item. Opened via the menu bar's "Open app" item.
///
/// Sized dynamically: roomy while actually connected (there's real content worth
/// the space), a small compact size otherwise. Deliberately uses AppKit's own
/// `center()` rather than computing an origin from screen geometry ourselves - the
/// menu-bar popover bug turned out to be exactly that kind of custom positioning
/// math going wrong on an unusual display setup, so this avoids the same mistake:
/// fixed, sane sizes, AppKit does the centering.
final class DashboardWindowController: NSWindowController {
    private static let idleSize = NSSize(width: 480, height: 420)
    private static let connectedSize = NSSize(width: 900, height: 700)
    private var cancellable: AnyCancellable?

    convenience init(state: AppState, onDisconnect: @escaping () -> Void, onQuit: @escaping () -> Void) {
        let hosting = NSHostingController(
            rootView: DashboardView(state: state, onDisconnect: onDisconnect, onQuit: onQuit),
        )
        // Without this, NSHostingController resizes the window to SwiftUI's own
        // "ideal" content size on every layout pass - and DashboardView's Spacer()s
        // inside a maxWidth/maxHeight: .infinity frame report a huge, effectively
        // unbounded ideal height, which is what produced the tall/portrait window
        // bug (height ballooning to 1000+pt regardless of setContentSize below).
        // Turning this off makes setContentSize the single source of truth.
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
        window.setContentSize(connected ? Self.connectedSize : Self.idleSize)
        window.center()
    }

    func showAndFocus() {
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
