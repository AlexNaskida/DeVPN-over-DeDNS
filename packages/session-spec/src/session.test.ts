import { describe, expect, it } from "vitest";
import { SessionSchema, isValidTransition } from "./session.js";
import { sessionPriceUsdc, softDataCapGbPerHour } from "./tier.js";
import { CapabilityRecordSchema } from "./capability-record.js";

describe("Session", () => {
  it("constructs, validates, and round-trips through JSON", () => {
    const session = SessionSchema.parse({
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      tier: "standard",
      hours: 1,
      relay: "bob.dvod.eth",
      state: "BROWSING",
      price_usdc: sessionPriceUsdc("standard", 1),
      created_at: new Date().toISOString(),
    });

    expect(session.price_usdc).toBeCloseTo(0.35);

    const roundTripped = SessionSchema.parse(JSON.parse(JSON.stringify(session)));
    expect(roundTripped).toEqual(session);
  });

  it("rejects a session longer than the configured max", () => {
    expect(() =>
      SessionSchema.parse({
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        tier: "lite",
        hours: 25,
        relay: "bob.dvod.eth",
        state: "BROWSING",
        price_usdc: 0,
        created_at: new Date().toISOString(),
      }),
    ).toThrow();
  });

  it("enforces the session state machine", () => {
    expect(isValidTransition("BROWSING", "QUOTED")).toBe(true);
    expect(isValidTransition("BROWSING", "ACTIVE")).toBe(false);
    expect(isValidTransition("ACTIVE", "RELAY_REVOKED")).toBe(true);
    expect(isValidTransition("RELAY_REVOKED", "FAILOVER_SELECT")).toBe(true);
  });
});

describe("Tier pricing", () => {
  it("computes soft data caps per the brief's worked example", () => {
    expect(softDataCapGbPerHour("lite")).toBeCloseTo(2.25);
    expect(softDataCapGbPerHour("standard")).toBeCloseTo(11.25);
    expect(softDataCapGbPerHour("turbo")).toBeCloseTo(45);
  });
});

describe("CapabilityRecord", () => {
  it("validates a well-formed record", () => {
    const record = CapabilityRecordSchema.parse({
      operator: "bob.dvod.eth",
      operational_key: "0x1111111111111111111111111111111111111111",
      payout_address: "0x2222222222222222222222222222222222222222",
      endpoint: "https://relay-bob.example/tunnel",
      tiers_supported: ["lite", "standard"],
      status: "active",
      attestation_build_hash: "0xabcdef",
    });
    expect(record.status).toBe("active");
  });
});
