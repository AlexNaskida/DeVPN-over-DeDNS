import Fastify from "fastify";

import { registerTiersRoute } from "./routes/tiers.js";
import { registerSessionsRoute } from "./routes/sessions.js";

export function buildServer() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  registerTiersRoute(app);
  registerSessionsRoute(app);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 8787);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
