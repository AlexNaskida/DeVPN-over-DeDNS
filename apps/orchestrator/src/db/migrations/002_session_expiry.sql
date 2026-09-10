-- Stamped on the PAID event (the only transition where hours is known) so the
-- dashboard can show a real countdown without depending on the purchasing
-- browser's local storage - see apps/web/src/components/CountdownTimer.tsx.
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
