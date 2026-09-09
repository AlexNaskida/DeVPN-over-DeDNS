import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { CapabilityRecord } from "@dvod/session-spec";

const bobRecord: CapabilityRecord = {
  operator: "bob.dvod-test.eth",
  operational_key: "0x1111111111111111111111111111111111111111",
  payout_address: "0x2222222222222222222222222222222222222222",
  endpoint: "https://relay-bob.example/tunnel",
  tiers_supported: ["lite", "standard"],
  status: "active",
  attestation_build_hash: "0xabc",
};

vi.mock("./relays.js", () => ({
  eligibleOperators: vi.fn(async (tier: string) =>
    bobRecord.tiers_supported.includes(tier as never) ? [bobRecord] : [],
  ),
}));

const verifySessionPurchase = vi.fn();
vi.mock("./arc-client.js", () => ({
  verifySessionPurchase: (...args: unknown[]) => verifySessionPurchase(...args),
  PaymentVerificationError: class PaymentVerificationError extends Error {},
}));

describe("sessions route", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { buildServer } = await import("./server.js");
    app = buildServer();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /tiers lists all three tiers with eligible relay counts", async () => {
    const res = await app.inject({ method: "GET", url: "/tiers" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tiers).toHaveLength(3);
    const standard = body.tiers.find((t: { tier: string }) => t.tier === "standard");
    expect(standard.eligibleRelayCount).toBe(1);
    expect(standard.pricePerHourUsdc).toBe("0.35");
    const turbo = body.tiers.find((t: { tier: string }) => t.tier === "turbo");
    expect(turbo.eligibleRelayCount).toBe(0); // bob doesn't support turbo
  });

  it("rejects a tier no active relay supports, before payment is attempted", async () => {
    const res = await app.inject({ method: "POST", url: "/sessions/turbo/1" });
    expect(res.statusCode).toBe(400);
    expect(verifySessionPurchase).not.toHaveBeenCalled();
  });

  it("returns a 402 quote pointing at SessionEscrow.purchaseSession when unpaid", async () => {
    const res = await app.inject({ method: "POST", url: "/sessions/standard/1" });
    expect(res.statusCode).toBe(402);
    const body = res.json();
    expect(body.accepts[0].price).toBe("$0.35");
    expect(body.accepts[0].extra.function).toBe("purchaseSession");
    expect(body.accepts[0].extra.args).toEqual(["standard", 1]);
  });

  it("issues a session token once a matching purchase tx is verified", async () => {
    verifySessionPurchase.mockResolvedValueOnce({
      sessionId: 0n,
      payer: "0x3333333333333333333333333333333333333333",
    });

    const res = await app.inject({
      method: "POST",
      url: "/sessions/standard/1",
      headers: { "x-session-tx": "0xdeadbeef" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.relay).toBe("bob.dvod-test.eth");
    expect(body.token).toBeTruthy();
  });

  it("rejects replaying the same payment tx for a second session", async () => {
    verifySessionPurchase.mockResolvedValue({
      sessionId: 0n,
      payer: "0x3333333333333333333333333333333333333333",
    });

    const first = await app.inject({
      method: "POST",
      url: "/sessions/standard/1",
      headers: { "x-session-tx": "0xreused" },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/sessions/standard/1",
      headers: { "x-session-tx": "0xreused" },
    });
    expect(second.statusCode).toBe(409);
  });

  it("returns 402 (not 500) when payment verification fails", async () => {
    const { PaymentVerificationError } = await import("./arc-client.js");
    verifySessionPurchase.mockRejectedValueOnce(
      new PaymentVerificationError("no matching payment found"),
    );

    const res = await app.inject({
      method: "POST",
      url: "/sessions/standard/1",
      headers: { "x-session-tx": "0xbadtx" },
    });
    expect(res.statusCode).toBe(402);
  });
});
