import type { FastifyInstance } from "fastify";
import { eligibleOperators } from "../relays.js";
import {
  getCurrentRelay,
  getCurrentState,
  getTier,
  InvalidTransitionError,
  recordTransition,
} from "../session-state.js";
import { broadcast } from "../ws-hub.js";

/**
 * `POST /sessions/:id/force-relay-failure` - the demo/testing-only control from
 * brief §9.3: kills the current relay and drives the automatic failover to a
 * healthy one, live. Clearly not a normal end-user action - a real deployment
 * would trigger this from the watchdog contract's revoke event or a real
 * connectivity check, not an HTTP call anyone can make.
 */
export function registerFailoverRoute(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/sessions/:id/force-relay-failure", async (request, reply) => {
    const sid = request.params.id;
    const state = await getCurrentState(sid);
    if (state !== "ACTIVE") {
      return reply.code(400).send({ error: `session ${sid} is not ACTIVE (current: ${state ?? "unknown"})` });
    }

    const tier = await getTier(sid);
    const failedRelay = await getCurrentRelay(sid);
    if (!tier || !failedRelay) {
      return reply.code(500).send({ error: `session ${sid} is missing tier/relay metadata` });
    }

    try {
      let event = await recordTransition(sid, "RELAY_UNREACHABLE", {
        relay: failedRelay,
        detail: "forced by demo control (brief §9.3)",
      });
      broadcast({ type: "session_transition", ...event });

      event = await recordTransition(sid, "FAILOVER_SELECT", { relay: failedRelay });
      broadcast({ type: "session_transition", ...event });

      const eligible = await eligibleOperators(tier);
      const nextRelay = eligible.find((op) => op.operator !== failedRelay);
      if (!nextRelay) {
        return reply.code(503).send({ error: `no other active relay currently supports tier "${tier}"` });
      }

      event = await recordTransition(sid, "TUNNEL_OPEN", { relay: nextRelay.operator, tier });
      broadcast({ type: "session_transition", ...event });

      event = await recordTransition(sid, "ACTIVE", { relay: nextRelay.operator, tier });
      broadcast({ type: "session_transition", ...event });

      return reply.send({ sessionId: sid, previousRelay: failedRelay, newRelay: nextRelay.operator });
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        return reply.code(409).send({ error: err.message });
      }
      throw err;
    }
  });
}
