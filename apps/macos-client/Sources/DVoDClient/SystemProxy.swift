import Foundation

/// Wraps `networksetup` to point the whole system's HTTP/HTTPS traffic at our local
/// relay (127.0.0.1:<port>, see LocalProxyServer) and revert it back to no proxy on
/// disconnect. This is deliberately a *proxy*, not a full NetworkExtension VPN -
/// see apps/macos-client/README.md for why (Apple's Network Extension entitlement
/// needs a formal approval process, not something obtainable in a hackathon window).
enum SystemProxy {
    /// The active network service (e.g. "Wi-Fi") - `networksetup` addresses proxy
    /// settings per-service, not globally, so we have to find the right one.
    static func activeServiceName() -> String? {
        let listOutput = run("/usr/sbin/networksetup", ["-listallnetworkservices"])
        let candidates = listOutput
            .split(separator: "\n")
            .map(String.init)
            .filter { !$0.hasPrefix("*") && !$0.isEmpty && !$0.contains("asterisk") }

        for service in candidates {
            let info = run("/usr/sbin/networksetup", ["-getinfo", service])
            if info.contains("IP address") && !info.contains("IP address: none") {
                return service
            }
        }
        return candidates.first
    }

    static func enable(service: String, host: String, port: Int) {
        _ = run("/usr/sbin/networksetup", ["-setwebproxy", service, host, String(port)])
        _ = run("/usr/sbin/networksetup", ["-setsecurewebproxy", service, host, String(port)])
        _ = run("/usr/sbin/networksetup", ["-setwebproxystate", service, "on"])
        _ = run("/usr/sbin/networksetup", ["-setsecurewebproxystate", service, "on"])
    }

    static func disable(service: String) {
        _ = run("/usr/sbin/networksetup", ["-setwebproxystate", service, "off"])
        _ = run("/usr/sbin/networksetup", ["-setsecurewebproxystate", service, "off"])
    }

    @discardableResult
    private static func run(_ path: String, _ args: [String]) -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: path)
        process.arguments = args
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = Pipe()
        do {
            try process.run()
            process.waitUntilExit()
        } catch {
            return ""
        }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(data: data, encoding: .utf8) ?? ""
    }
}
