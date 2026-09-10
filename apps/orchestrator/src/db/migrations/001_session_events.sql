-- Every session state transition is an event row, per brief §6 Phase 4: "Every state
-- transition is an event row — the UI is a projection of that log, and so is the
-- audit trail." session_id is the on-chain SessionEscrow session id (uint256),
-- recorded from PAID onward — pre-payment BROWSING/QUOTED states are client-local
-- and not persisted, since there's no durable session identity before payment.
CREATE TABLE IF NOT EXISTS session_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  relay TEXT,
  tier TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_events_session_id_idx ON session_events (session_id);
