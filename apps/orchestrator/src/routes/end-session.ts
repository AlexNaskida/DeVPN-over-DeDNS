import type { FastifyInstance } from "fastify";
import { getCurrentState, InvalidTransitionError, recordTransition } from "../session-state.js";
import { broadcast } from "../ws-hub.js";

/**
 * `POST /sessions/:id/end` - a real user action (unlike force-relay-failure,
 * which is a demo-only control): the payer chooses to end an active session
 * early. Transitions straight to EXPIRED_NORMAL - there's no refund for unused
 * time (brief has no partial-refund mechanism), just an honest record that the
 * session ended by user choice rather than by running out the clock.
 */
export function registerEndSessionRoute(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/sessions/:id/end", async (request, reply) => {
    const sid = request.params.id;
    const state = await getCurrentState(sid);
    if (state !== "ACTIVE") {
      return reply.code(400).send({ error: `session ${sid} is not ACTIVE (current: ${state ?? "unknown"})` });
    }

    try {
      const event = await recordTransition(sid, "EXPIRED_NORMAL", { detail: "ended by user" });
      broadcast({ type: "session_transition", ...event });
      return reply.send({ sessionId: sid, state: "EXPIRED_NORMAL" });
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        return reply.code(409).send({ error: err.message });
      }
      throw err;
    }
  });
}
