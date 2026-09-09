import { createHmac, timingSafeEqual } from "node:crypto";
import type { Tier } from "@dvod/session-spec";

import { SESSION_TOKEN_SECRET } from "./config.js";

export interface SessionTokenPayload {
  sessionId: number;
  relay: string;
  tier: Tier;
  hours: number;
  expiresAt: number; // unix seconds
}

function sign(payload: string): string {
  return createHmac("sha256", SESSION_TOKEN_SECRET).update(payload).digest("base64url");
}

/** `{relay, tier, expires}` signed and time-boxed, per brief §2.4 step 5. */
export function issueSessionToken(payload: SessionTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionTokenPayload;
  if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
