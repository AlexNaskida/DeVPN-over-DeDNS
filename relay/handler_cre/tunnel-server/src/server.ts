import http from "node:http";
import net from "node:net";
import { verifySessionToken } from "@dvod/session-spec";

import { RELAY_NAME, SESSION_TOKEN_SECRET, SIMULATED_BADGE, TUNNEL_PORT } from "./config.js";

export interface TunnelEvent {
  event: "open" | "close" | "rejected";
  targetHost: string;
  targetPort: number;
  reason?: string;
}

export interface CreateTunnelServerOptions {
  secret: string;
  relayName: string;
  /** Called on every tunnel lifecycle event — the seam Phase 4's "what's visible to
   *  whom" panel will subscribe to, using real captured metadata per brief §9.3. */
  onEvent?: (event: TunnelEvent) => void;
}

/**
 * A real HTTP CONNECT proxy: tunnel termination (accepts the client's CONNECT),
 * DNS resolution + outbound connection (`net.connect` resolves and dials the
 * target), and bidirectional proxying (`pipe` both ways) — all genuinely
 * functioning. What's SIMULATED is *where* it runs: a plain process, not a
 * Chainlink CRE confidential handler. See config.ts.
 */
export function createTunnelServer(options: CreateTunnelServerOptions): http.Server {
  const { secret, relayName, onEvent } = options;

  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(SIMULATED_BADGE));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.on("connect", (req, clientSocket, head) => {
    const [targetHost, targetPortStr] = (req.url ?? "").split(":");
    const targetPort = Number(targetPortStr);

    const reject = (status: string, reason: string) => {
      onEvent?.({ event: "rejected", targetHost: targetHost ?? "", targetPort: targetPort || 0, reason });
      clientSocket.write(`HTTP/1.1 ${status}\r\n\r\n`);
      clientSocket.end();
    };

    if (!targetHost || !Number.isInteger(targetPort) || targetPort <= 0 || targetPort > 65535) {
      reject("400 Bad Request", "malformed CONNECT target");
      return;
    }

    const token = req.headers["x-session-token"];
    if (typeof token !== "string") {
      reject("407 Proxy Authentication Required", "missing x-session-token");
      return;
    }

    const payload = verifySessionToken(token, secret);
    if (!payload) {
      reject("407 Proxy Authentication Required", "invalid or expired session token");
      return;
    }

    if (payload.relay !== relayName) {
      reject("403 Forbidden", `token is bound to relay "${payload.relay}", not "${relayName}"`);
      return;
    }

    // Real DNS resolution + outbound connection — net.connect resolves targetHost.
    const targetSocket = net.connect(targetPort, targetHost, () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      targetSocket.write(head);
      onEvent?.({ event: "open", targetHost, targetPort });

      // Bidirectional proxy — the actual tunnel.
      targetSocket.pipe(clientSocket);
      clientSocket.pipe(targetSocket);
    });

    const closeBoth = () => {
      onEvent?.({ event: "close", targetHost, targetPort });
      targetSocket.destroy();
      clientSocket.destroy();
    };
    targetSocket.on("error", closeBoth);
    clientSocket.on("error", closeBoth);
    targetSocket.on("close", closeBoth);
    clientSocket.on("close", closeBoth);
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createTunnelServer({
    secret: SESSION_TOKEN_SECRET,
    relayName: RELAY_NAME,
    onEvent: (e) => console.log(`[tunnel] ${e.event} ${e.targetHost}:${e.targetPort}${e.reason ? ` (${e.reason})` : ""}`),
  });
  server.listen(TUNNEL_PORT, () => {
    console.log(`SIMULATED tunnel server (${RELAY_NAME}) listening on :${TUNNEL_PORT}`);
    console.log(SIMULATED_BADGE.reason);
  });
}
