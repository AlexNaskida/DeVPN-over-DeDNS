import { createHmac, timingSafeEqual } from "node:crypto";
import type { Tier } from "./tier.js";

export interface SessionTokenPayload {
  sessionId: number;
  relay: string;
  tier: Tier;
  hours: number;
  expiresAt: number; // unix seconds
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * `{relay, tier, expires}` signed and time-boxed, per brief §2.4 step 5. Shared
 * between the orchestrator (issues) and the relay tunnel handler (verifies), so
 * both sides always agree on format — pass the same `secret` to both.
 */
export function issueSessionToken(payload: SessionTokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifySessionToken(token: string, secret: string): SessionTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionTokenPayload;
  if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
