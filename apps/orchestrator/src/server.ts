import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";

import { registerTiersRoute } from "./routes/tiers.js";
import { registerSessionsRoute } from "./routes/sessions.js";
import { registerSessionDetailRoute } from "./routes/session-detail.js";
import { registerFailoverRoute } from "./routes/failover.js";
import { registerRelaysRoute } from "./routes/relays.js";
import { registerStreamRoute } from "./routes/stream.js";

export async function buildServer() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  await app.register(websocketPlugin);

  registerTiersRoute(app);
  registerSessionsRoute(app);
  registerSessionDetailRoute(app);
  registerFailoverRoute(app);
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
