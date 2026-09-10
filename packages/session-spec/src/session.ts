import { z } from "zod";
import { TierSchema } from "./tier.js";

/**
 * Session state machine per the build brief §4. Every transition is
 * timestamped and streamed to the UI; the transition log is both the
 * live-dashboard projection and the audit trail.
 */
export const SessionStateSchema = z.enum([
  "BROWSING",
  "QUOTED",
  "PAID",
  "TOKEN_ISSUED",
  "TUNNEL_OPEN",
  "ACTIVE",
  "EXPIRED_NORMAL",
  "RELAY_REVOKED",
  "RELAY_UNREACHABLE",
  "FAILOVER_SELECT",
  "SESSION_COMPLETE",
]);
export type SessionState = z.infer<typeof SessionStateSchema>;

/** Valid transitions out of each state - enforced by the orchestrator, not just documentation. */
export const SESSION_STATE_TRANSITIONS: Record<SessionState, SessionState[]> = {
  BROWSING: ["QUOTED"],
  QUOTED: ["PAID"],
  PAID: ["TOKEN_ISSUED"],
  TOKEN_ISSUED: ["TUNNEL_OPEN"],
  TUNNEL_OPEN: ["ACTIVE"],
  ACTIVE: ["EXPIRED_NORMAL", "RELAY_REVOKED", "RELAY_UNREACHABLE"],
  RELAY_REVOKED: ["FAILOVER_SELECT"],
  RELAY_UNREACHABLE: ["FAILOVER_SELECT"],
  FAILOVER_SELECT: ["TUNNEL_OPEN"],
  EXPIRED_NORMAL: ["SESSION_COMPLETE"],
  SESSION_COMPLETE: [],
};

export const SessionTransitionEventSchema = z.object({
  session_id: z.string().uuid(),
  from: SessionStateSchema,
  to: SessionStateSchema,
  at: z.string().datetime(),
  relay: z.string().min(1).optional(),
  detail: z.string().optional(),
});
export type SessionTransitionEvent = z.infer<typeof SessionTransitionEventSchema>;

export const SessionSchema = z.object({
  id: z.string().uuid(),
  tier: TierSchema,
  hours: z.number().positive().max(24), // max session length so a single purchase can't be indefinitely valid
  relay: z.string().min(1), // ENS name of the assigned relay, e.g. "bob.dvod.eth"
  state: SessionStateSchema,
  price_usdc: z.number().nonnegative(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
  token: z.string().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export function isValidTransition(from: SessionState, to: SessionState): boolean {
  return SESSION_STATE_TRANSITIONS[from].includes(to);
}
