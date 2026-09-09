import net from "node:net";
import http from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { issueSessionToken } from "@dvod/session-spec";

import { createTunnelServer } from "./server.js";

const SECRET = "test-secret";
const RELAY_NAME = "carol.dvod-test.eth";

function validToken(overrides: Partial<Parameters<typeof issueSessionToken>[0]> = {}) {
  return issueSessionToken(
    {
      sessionId: 0,
      relay: RELAY_NAME,
      tier: "standard",
      hours: 1,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    },
    SECRET,
  );
}

/** Sends a raw CONNECT request and returns the status line + the connected socket. */
function rawConnect(
  proxyPort: number,
  target: string,
  headers: Record<string, string>,
): Promise<{ statusLine: string; socket: net.Socket }> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(proxyPort, "127.0.0.1", () => {
      const headerLines = Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\r\n");
      socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n${headerLines}\r\n\r\n`);
    });
    socket.once("data", (chunk) => {
      const statusLine = chunk.toString("utf8").split("\r\n")[0]!;
      resolve({ statusLine, socket });
    });
    socket.once("error", reject);
  });
}

describe("tunnel server", () => {
  let echoServer: net.Server;
  let echoPort: number;
  let tunnelServer: http.Server;
  let tunnelPort: number;

  beforeEach(async () => {
    // A plain destination server: echoes back whatever it receives. Stands in
    // for "some real site on the internet" the tunnel proxies traffic to.
    echoServer = net.createServer((socket) => socket.pipe(socket));
    await new Promise<void>((resolve) => echoServer.listen(0, "127.0.0.1", resolve));
    echoPort = (echoServer.address() as net.AddressInfo).port;

    tunnelServer = createTunnelServer({ secret: SECRET, relayName: RELAY_NAME });
    await new Promise<void>((resolve) => tunnelServer.listen(0, "127.0.0.1", resolve));
    tunnelPort = (tunnelServer.address() as net.AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise((resolve) => echoServer.close(resolve));
    await new Promise((resolve) => tunnelServer.close(resolve));
  });

  it("proxies real bidirectional traffic to the destination once the tunnel is open", async () => {
    const { statusLine, socket } = await rawConnect(tunnelPort, `127.0.0.1:${echoPort}`, {
      "X-Session-Token": validToken(),
    });
    expect(statusLine).toContain("200");

    const echoed = await new Promise<string>((resolve) => {
      socket.once("data", (chunk) => resolve(chunk.toString("utf8")));
      socket.write("hello through the tunnel");
    });
    expect(echoed).toBe("hello through the tunnel");

    socket.destroy();
  });

  it("rejects a CONNECT with no session token", async () => {
    const { statusLine } = await rawConnect(tunnelPort, `127.0.0.1:${echoPort}`, {});
    expect(statusLine).toContain("407");
  });

  it("rejects an expired session token", async () => {
    const expired = validToken({ expiresAt: Math.floor(Date.now() / 1000) - 1 });
    const { statusLine } = await rawConnect(tunnelPort, `127.0.0.1:${echoPort}`, {
      "X-Session-Token": expired,
    });
    expect(statusLine).toContain("407");
  });

  it("rejects a token bound to a different relay", async () => {
    const wrongRelay = validToken({ relay: "bob.dvod-test.eth" });
    const { statusLine } = await rawConnect(tunnelPort, `127.0.0.1:${echoPort}`, {
      "X-Session-Token": wrongRelay,
    });
    expect(statusLine).toContain("403");
  });

  it("serves the SIMULATED badge on GET /health", async () => {
    const body = await new Promise<string>((resolve) => {
      http.get(`http://127.0.0.1:${tunnelPort}/health`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });
    });
    const parsed = JSON.parse(body);
    expect(parsed.simulated).toBe(true);
    expect(parsed.reason).toContain("Chainlink CRE");
  });
});
