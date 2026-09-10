import type { FastifyInstance } from "fastify";
import { registerClient } from "../ws-hub.js";

/** `WS /stream` — live session state, relay status, and failover/revocation
 *  events, per brief §7.4. Push-only: clients just listen. */
export function registerStreamRoute(app: FastifyInstance) {
  app.get("/stream", { websocket: true }, (socket) => {
    registerClient(socket);
  });
}
