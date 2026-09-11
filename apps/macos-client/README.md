# DVoD macOS client

A real menu-bar app that closes DVoD's biggest previously-documented gap: until this
existed, purchasing a session got you a real payment, a real token, and a real
dashboard - but nothing that actually routed a single byte of your traffic anywhere.
This does.

## What it actually does

1. Registers the `dvod://` URL scheme. The web app's session dashboard links to
   `dvod://connect?token=<token>&host=<host>&port=<port>` once a session is `ACTIVE`.
2. On that link, starts a **local** HTTP CONNECT proxy on `127.0.0.1:8899`
   (`LocalProxyServer.swift`, built on `Network.framework` - real DNS resolution via
   the OS resolver, real bidirectional byte piping, not a stub).
3. Points the Mac's system HTTP/HTTPS proxy settings at that local relay
   (`SystemProxy.swift`, via `networksetup` - finds the actually-active network
   service itself, doesn't assume "Wi-Fi").
4. Every request the local relay receives, it forwards to the **real** remote
   `relay/handler_cre/tunnel-server`, adding the `x-session-token` header that
   server's `CONNECT` handler requires - solving a real problem: macOS's system
   proxy settings can't inject custom headers, only standard
   `Proxy-Authorization`, so the OS can't point directly at the remote relay.
5. Clicking the menu bar icon opens a real SwiftUI dashboard (`DashboardView.swift`,
   `AppState.swift` - a proper `ObservableObject`, not just a status-item title
   string) showing connection state, relay name, tier, and a live countdown decoded
   from the token's own `expiresAt`, with a "Disconnect" button that stops the local
   relay and reverts the system proxy setting.
6. Ships a real app icon (`Resources/DVoD.icns`, generated from the actual brand
   logo) and can be installed into `/Applications` so it's Spotlight-searchable like
   any other app, not just a loose bundle you have to `open` by path.

Verified live, not just built: ran the real `tunnel-server`, issued a real signed
token, triggered `dvod://connect` via `open`, and fetched `https://example.com`
through the entire chain (this app → real tunnel-server → real DNS resolution → real
TCP connect) - got the real page back. Also verified the rejection path: a token
signed for the wrong relay name is correctly refused by `tunnel-server`'s own check,
proving this app doesn't bypass that.

## Honest scope - read this before assuming more than what's here

- **This is a system HTTP/HTTPS proxy, not a full VPN.** A real `NetworkExtension`/
  `NEVPNManager` tunnel (capturing *all* traffic, all protocols) requires Apple's
  Network Extension entitlement, which needs a formal request and approval from
  Apple - not obtainable inside a hackathon window. This app is the realistic
  version of "your traffic routes through the relay": HTTP/HTTPS traffic that
  respects the system proxy setting, not literally everything on the machine.
- **"Demo Session" is the honest label, not marketing.** `relay/handler_cre/
  tunnel-server` isn't deployed anywhere publicly reachable yet - every registered
  operator endpoint in ENSv2 is still a placeholder `.example` domain (see
  `docs/SECURITY.md`). This app is fully real and fully tested against a locally-run
  tunnel-server; connecting it to a real, publicly-reachable relay is a separate,
  not-yet-done step.
- **No confidential compute**, same as documented everywhere else - the relay
  operator's own process (or, in local testing, your own machine) can read the
  traffic in the clear. This app doesn't change that.
- **Unsigned, unnotarized.** A hackathon demo build - macOS's Gatekeeper will block
  a plain double-click on first launch; right-click → Open, or `xattr -d
  com.apple.quarantine DVoD.app` after building it yourself.
- **Password-less proxy config.** `networksetup -setwebproxy` without an
  authenticated-proxy flag - fine here since the proxy only listens on
  `127.0.0.1`, not exposed to the network.

## Build & run

```bash
./build-app.sh                # swift build + assembles DVoD.app (loose bundle here)
open DVoD.app                  # first launch: right-click > Open to pass Gatekeeper

./build-app.sh --install      # also copies to /Applications, registers with
                                # Launch Services - Spotlight-searchable, `open -a DVoD` works
```

Test the `dvod://` link without the web app:

```bash
open "dvod://connect?token=<a real signed token>&host=127.0.0.1&port=8443"
```

Requires a locally-running `tunnel-server`:

```bash
cd ../../relay/handler_cre/tunnel-server
SESSION_TOKEN_SECRET=dev-only-insecure-secret RELAY_NAME=carol.dvod-test.eth TUNNEL_PORT=8443 \
  pnpm exec tsx src/server.ts
```

Requires macOS 13+ and the Swift toolchain (ships with Xcode / Xcode Command Line
Tools). No Xcode project needed - this is a plain Swift Package Manager executable,
built and run entirely from the command line.
