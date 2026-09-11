import type { Tier } from "@dvod/session-spec";

export const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8787";
export const ORCHESTRATOR_WS_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_WS_URL ?? "ws://localhost:8787/stream";

/** The tunnel-server (relay/handler_cre/tunnel-server) isn't deployed anywhere
 * public yet - see docs/SECURITY.md. These point at wherever a demo instance
 * actually runs; default to a local one for `pnpm --filter @dvod/tunnel-server dev`. */
export const TUNNEL_HOST = process.env.NEXT_PUBLIC_TUNNEL_HOST ?? "127.0.0.1";
export const TUNNEL_PORT = process.env.NEXT_PUBLIC_TUNNEL_PORT ?? "8443";

/** Builds the apps/macos-client `dvod://connect` link for a purchased session's
 * token - see apps/macos-client/README.md for what actually happens when it's
 * clicked (a real local CONNECT-proxy relay, real system-proxy configuration). */
export function macOsConnectUrl(token: string): string {
  return `dvod://connect?token=${encodeURIComponent(token)}&host=${encodeURIComponent(TUNNEL_HOST)}&port=${TUNNEL_PORT}`;
}

export interface TierInfo {
  tier: Tier;
  reservedMbps: number;
  pricePerHourUsdc: string;
  eligibleRelayCount: number;
}

export async function getTiers(): Promise<TierInfo[]> {
  const res = await fetch(`${ORCHESTRATOR_URL}/tiers`);
  if (!res.ok) throw new Error(`GET /tiers failed: ${res.status}`);
  const body = (await res.json()) as { tiers: TierInfo[] };
  return body.tiers;
}

export interface PurchaseQuote {
  price: string;
  network: string;
  payTo: string;
  extra: {
    contract: `0x${string}`;
    function: "purchaseSession";
    args: [Tier, number];
  };
}

/** First call to `POST /sessions/:tier/:hours` (no tx yet) - orchestrator responds
 * 402 with the exact contract call to make. This is the x402-shaped quote step. */
export async function quoteSession(tier: Tier, hours: number): Promise<PurchaseQuote> {
  const res = await fetch(`${ORCHESTRATOR_URL}/sessions/${tier}/${hours}`, { method: "POST" });
  if (res.status !== 402) {
    throw new Error(`expected 402 quote, got ${res.status}`);
  }
  const body = (await res.json()) as { accepts: PurchaseQuote[] };
  const quote = body.accepts[0];
  if (!quote) throw new Error("orchestrator returned no payment options");
  return quote;
}

export interface PurchaseResult {
  token: string;
  relay: string;
  tier: Tier;
  hours: number;
  sessionId: string;
  payer: string;
  txHash: string;
  expiresAt: number;
}

/** Second call, after the browser wallet has sent+mined the purchaseSession tx -
 * retries with `x-session-tx` per brief §7.1's flow (adapted, see routes/sessions.ts). */
export async function confirmSession(
  tier: Tier,
  hours: number,
  txHash: `0x${string}`,
): Promise<PurchaseResult> {
  const res = await fetch(`${ORCHESTRATOR_URL}/sessions/${tier}/${hours}`, {
    method: "POST",
    headers: { "x-session-tx": txHash },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `confirm failed: ${res.status}`);
  }
  return (await res.json()) as PurchaseResult;
}

export interface SessionEvent {
  id: number;
  sessionId: string;
  fromState: string | null;
  toState: string;
  relay: string | null;
  tier: string | null;
  detail: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface SessionDetail {
  sessionId: string;
  state: string;
  relay: string | null;
  expiresAt: string | null;
  events: SessionEvent[];
}

export async function getSessionDetail(id: string): Promise<SessionDetail> {
  const res = await fetch(`${ORCHESTRATOR_URL}/sessions/${id}`);
  if (!res.ok) throw new Error(`no such session ${id}`);
  return (await res.json()) as SessionDetail;
}

export async function forceRelayFailure(
  id: string,
): Promise<{ sessionId: string; previousRelay: string; newRelay: string }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/sessions/${id}/force-relay-failure`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `force-relay-failure failed: ${res.status}`);
  }
  return res.json();
}

export async function endSession(id: string): Promise<{ sessionId: string; state: string }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/sessions/${id}/end`, { method: "POST" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `end session failed: ${res.status}`);
  }
  return res.json();
}

export interface RelayInfo {
  operator: string;
  status: string;
  tiersSupported: string[];
  endpoint: string;
}

export async function getRelays(): Promise<RelayInfo[]> {
  const res = await fetch(`${ORCHESTRATOR_URL}/relays`);
  if (!res.ok) throw new Error(`GET /relays failed: ${res.status}`);
  const body = (await res.json()) as { relays: RelayInfo[] };
  return body.relays;
}

export interface RelayAttestation {
  operator: string;
  status: string;
  attestationBuildHash: string;
  simulated: boolean;
  reason: string;
}

export async function getRelayAttestation(operator: string): Promise<RelayAttestation> {
  const res = await fetch(`${ORCHESTRATOR_URL}/relays/${operator}/attestation`);
  if (!res.ok) throw new Error(`no attestation for ${operator}`);
  return (await res.json()) as RelayAttestation;
}
