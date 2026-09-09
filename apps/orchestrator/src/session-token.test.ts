import { describe, expect, it } from "vitest";
import { issueSessionToken, verifySessionToken } from "./session-token.js";

describe("session token", () => {
  const payload = {
    sessionId: 0,
    relay: "bob.dvod-test.eth",
    tier: "standard" as const,
    hours: 1,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };

  it("round-trips a valid token", () => {
    const token = issueSessionToken(payload);
    expect(verifySessionToken(token)).toEqual(payload);
  });

  it("rejects a tampered payload", () => {
    const token = issueSessionToken(payload);
    const [, sig] = token.split(".");
    const tamperedBody = Buffer.from(JSON.stringify({ ...payload, hours: 24 })).toString(
      "base64url",
    );
    expect(verifySessionToken(`${tamperedBody}.${sig}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const expired = issueSessionToken({ ...payload, expiresAt: Math.floor(Date.now() / 1000) - 1 });
    expect(verifySessionToken(expired)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifySessionToken("not-a-real-token")).toBeNull();
  });
});
