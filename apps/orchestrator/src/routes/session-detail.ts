import type { FastifyInstance } from "fastify";
import { getCurrentState, getCurrentRelay, getSessionEvents } from "../session-state.js";

/** `GET /sessions/:id` - session detail: state, relay, expiry, visibility log. */
export function registerSessionDetailRoute(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/sessions/:id", async (request, reply) => {
    const { id } = request.params;
    const events = await getSessionEvents(id);
    if (events.length === 0) {
      return reply.code(404).send({ error: `no session ${id}` });
    }

    return reply.send({
      sessionId: id,
      state: await getCurrentState(id),
      relay: await getCurrentRelay(id),
      events,
    });
  });
}
