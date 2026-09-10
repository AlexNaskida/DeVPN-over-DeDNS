import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { pool } from "./db/pool.js";
import {
  getCurrentRelay,
  getCurrentState,
  getSessionEvents,
  getTier,
  InvalidTransitionError,
  recordTransition,
} from "./session-state.js";

/**
 * Real integration test against an actual Postgres database (DATABASE_URL, default
 * postgres://localhost/dvod_test) - not mocked. Run `pnpm migrate` against that
 * database first. Each test uses its own random session id so they don't collide.
 */
describe("session-state (real Postgres)", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("drives the real state machine and persists every transition as a row", async () => {
    const sid = randomUUID();

    await recordTransition(sid, "PAID", { tier: "standard", detail: "test purchase" });
    await recordTransition(sid, "TOKEN_ISSUED");
    await recordTransition(sid, "TUNNEL_OPEN", { relay: "carol.dvod-test.eth" });
    await recordTransition(sid, "ACTIVE");

    expect(await getCurrentState(sid)).toBe("ACTIVE");
    expect(await getCurrentRelay(sid)).toBe("carol.dvod-test.eth");
    expect(await getTier(sid)).toBe("standard");

    const events = await getSessionEvents(sid);
    expect(events.map((e) => e.toState)).toEqual(["PAID", "TOKEN_ISSUED", "TUNNEL_OPEN", "ACTIVE"]);
    expect(events[0]!.fromState).toBeNull();
    expect(events[3]!.fromState).toBe("TUNNEL_OPEN");
  });

  it("rejects an invalid transition rather than silently recording it", async () => {
    const sid = randomUUID();
    await recordTransition(sid, "PAID");

    await expect(recordTransition(sid, "ACTIVE")).rejects.toThrow(InvalidTransitionError);

    // The rejected transition must not have been persisted.
    expect(await getCurrentState(sid)).toBe("PAID");
  });

  it("rejects a first transition that isn't PAID", async () => {
    const sid = randomUUID();
    await expect(recordTransition(sid, "TOKEN_ISSUED")).rejects.toThrow(InvalidTransitionError);
  });

  it("models the failover branch: ACTIVE -> RELAY_UNREACHABLE -> FAILOVER_SELECT -> TUNNEL_OPEN -> ACTIVE", async () => {
    const sid = randomUUID();
    await recordTransition(sid, "PAID", { tier: "standard" });
    await recordTransition(sid, "TOKEN_ISSUED");
    await recordTransition(sid, "TUNNEL_OPEN", { relay: "bob.dvod-test.eth" });
    await recordTransition(sid, "ACTIVE");

    await recordTransition(sid, "RELAY_UNREACHABLE", { relay: "bob.dvod-test.eth" });
    await recordTransition(sid, "FAILOVER_SELECT");
    await recordTransition(sid, "TUNNEL_OPEN", { relay: "carol.dvod-test.eth" });
    await recordTransition(sid, "ACTIVE");

    expect(await getCurrentState(sid)).toBe("ACTIVE");
    expect(await getCurrentRelay(sid)).toBe("carol.dvod-test.eth");
  });
});
