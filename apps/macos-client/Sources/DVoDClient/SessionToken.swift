import Foundation

/// Mirrors packages/session-spec/src/session-token.ts's payload shape. Only decoded
/// here for display (relay name, expiry countdown) - the app never verifies the
/// HMAC signature itself, since it has no reason to hold SESSION_TOKEN_SECRET; the
/// relay's tunnel-server is the one that actually verifies it on every CONNECT.
struct SessionTokenPayload: Decodable {
    let sessionId: Int
    let relay: String
    let tier: String
    let hours: Int
    let expiresAt: Double

    /// Decodes just the base64url body before the "." - never touches the signature.
    static func decode(_ token: String) -> SessionTokenPayload? {
        guard let body = token.split(separator: ".").first else { return nil }
        var base64 = body
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64 += "=" }
        guard let data = Data(base64Encoded: base64) else { return nil }
        return try? JSONDecoder().decode(SessionTokenPayload.self, from: data)
    }
}
