import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import corsPlugin from "@fastify/cors";

import { registerTiersRoute } from "./routes/tiers.js";
import { registerSessionsRoute } from "./routes/sessions.js";
import { registerSessionDetailRoute } from "./routes/session-detail.js";
import { registerFailoverRoute } from "./routes/failover.js";
import { registerEndSessionRoute } from "./routes/end-session.js";
import { registerRelaysRoute } from "./routes/relays.js";
import { registerStreamRoute } from "./routes/stream.js";

export async function buildServer() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  // The web app (apps/web, a separate origin in dev and likely in prod) calls this
  // API directly from the browser - x-session-tx is a custom request header, so it
  // must be explicitly allowed or the browser's preflight blocks it.
  await app.register(corsPlugin, {
    origin: true,
    allowedHeaders: ["Content-Type", "x-session-tx"],
  });
  await app.register(websocketPlugin);

  registerTiersRoute(app);
  registerSessionsRoute(app);
  registerSessionDetailRoute(app);
  registerFailoverRoute(app);
  registerEndSessionRoute(app);
  registerRelaysRoute(app);
  registerStreamRoute(app);

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { migrate } = await import("./db/migrate.js");
  await migrate();

  const app = await buildServer();
  const port = Number(process.env.PORT ?? 8787);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
