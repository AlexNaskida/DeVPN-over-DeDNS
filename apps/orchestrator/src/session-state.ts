import { isValidTransition, type SessionState, type Tier } from "@dvod/session-spec";
import { pool } from "./db/pool.js";

export interface SessionEventRow {
  id: number;
  sessionId: string;
  fromState: SessionState | null;
  toState: SessionState;
  relay: string | null;
  tier: Tier | null;
  detail: string | null;
  createdAt: string;
}

export class InvalidTransitionError extends Error {}

/**
 * Records one state transition as an event row - per brief §6 Phase 4, the UI and
 * audit trail are both just projections of this log. `PAID` is the first persisted
 * state (see migration comment); any later transition is checked against
 * session-spec's real transition table, not asserted.
 */
export async function recordTransition(
  sessionId: string,
  toState: SessionState,
  options: { relay?: string; tier?: Tier; detail?: string } = {},
): Promise<SessionEventRow> {
  const current = await getCurrentState(sessionId);

  if (current === null) {
    if (toState !== "PAID") {
      throw new InvalidTransitionError(
        `session ${sessionId} has no prior state; first recorded transition must be to PAID, not ${toState}`,
      );
    }
  } else if (!isValidTransition(current, toState)) {
    throw new InvalidTransitionError(`cannot transition session ${sessionId} from ${current} to ${toState}`);
  }

  const tier = options.tier ?? (await getTier(sessionId));

  const { rows } = await pool.query(
    `INSERT INTO session_events (session_id, from_state, to_state, relay, tier, detail)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, session_id, from_state, to_state, relay, tier, detail, created_at`,
    [sessionId, current, toState, options.relay ?? null, tier ?? null, options.detail ?? null],
  );
  return toRow(rows[0]);
}

export async function getTier(sessionId: string): Promise<Tier | null> {
  const { rows } = await pool.query(
    `SELECT tier FROM session_events WHERE session_id = $1 AND tier IS NOT NULL ORDER BY id DESC LIMIT 1`,
    [sessionId],
  );
  return rows[0]?.tier ?? null;
}

export async function getSessionEvents(sessionId: string): Promise<SessionEventRow[]> {
  const { rows } = await pool.query(
    `SELECT id, session_id, from_state, to_state, relay, tier, detail, created_at
     FROM session_events WHERE session_id = $1 ORDER BY id ASC`,
    [sessionId],
  );
  return rows.map(toRow);
}

export async function getCurrentState(sessionId: string): Promise<SessionState | null> {
  const { rows } = await pool.query(
    `SELECT to_state FROM session_events WHERE session_id = $1 ORDER BY id DESC LIMIT 1`,
    [sessionId],
  );
  return rows[0]?.to_state ?? null;
}

export async function getCurrentRelay(sessionId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT relay FROM session_events WHERE session_id = $1 AND relay IS NOT NULL ORDER BY id DESC LIMIT 1`,
    [sessionId],
  );
  return rows[0]?.relay ?? null;
}

function toRow(row: {
  id: number;
  session_id: string;
  from_state: string | null;
  to_state: string;
  relay: string | null;
  tier: string | null;
  detail: string | null;
  created_at: Date;
}): SessionEventRow {
  return {
    id: row.id,
    sessionId: row.session_id,
    fromState: row.from_state as SessionState | null,
    toState: row.to_state as SessionState,
    relay: row.relay,
    tier: row.tier as Tier | null,
    detail: row.detail,
    createdAt: row.created_at.toISOString(),
  };
}
