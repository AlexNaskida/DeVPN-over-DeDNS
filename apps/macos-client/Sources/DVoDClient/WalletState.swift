import AppKit
import Foundation

/// A native Swift app has no access to a browser wallet extension (MetaMask etc.),
/// so there is no real in-app signing here - see apps/macos-client/README.md's
/// scope note. "Connect Wallet" and "Purchase" are honest about that: they open
/// the web app, where wallet connection and payment actually happen, rather than
/// pretending to connect or sign anything from inside this app.
enum WalletState {
    private static let webURL: URL = {
        let fallback = URL(string: "http://localhost:3000")!
        guard let configured = Bundle.main.object(forInfoDictionaryKey: "DVoDWebURL") as? String,
              let url = URL(string: configured) else { return fallback }
        return url
    }()

    static func openWebApp() {
        NSWorkspace.shared.open(webURL)
    }
}
