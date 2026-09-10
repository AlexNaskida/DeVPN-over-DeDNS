# Orchestrator session state machine - real, verified

Phase 4's backend half: the session state machine from brief §4/§6, backed by a real
Postgres database, streamed live over `WS /stream`, with the forced-failover demo
control from §9.3.

## What's real

- **Postgres persistence**: `session_events` - every transition is a row (brief §6:
  "the UI is a projection of that log, and so is the audit trail"). Local Homebrew
  Postgres 14, not mocked; `apps/orchestrator/src/session-state.test.ts` runs against
  an actual test database (`dvod_test`), not an in-memory fake.
- **Real transition validation**: every `recordTransition` call is checked against
  `packages/session-spec`'s actual `SESSION_STATE_TRANSITIONS` table - an invalid
  transition is rejected and never persisted, verified by a real test.
- **`WS /stream`**: a real WebSocket endpoint (`@fastify/websocket`); every
  transition broadcasts live to connected clients.
- **A third operator, `dave.dvod-test.eth`**, registered specifically so the
  forced-failover demo has a real second *active* relay to fail over to - `bob` is
  still revoked from Phase 1's demo, so failing over to it wouldn't be honest.

## Verified live end to end (not just unit tests)

1. Purchased a real 1-hour Standard session on Arc testnet (tx
   `0x86a70ee2da95f9c97800cbe338e8e2bf861dde5418d1f94cf166a03e3f8b488d`).
2. Fed it to `POST /sessions/standard/1` with a real WebSocket client listening on
   `/stream` - received, in real time: `PAID → TOKEN_ISSUED → TUNNEL_OPEN → ACTIVE`,
   correct relay (`carol.dvod-test.eth`) and tier on every event.
3. Called `POST /sessions/1/force-relay-failure` - the brief's §9.3 demo centerpiece
   - with the WS client still listening. Received, live:
   `ACTIVE → RELAY_UNREACHABLE → FAILOVER_SELECT → TUNNEL_OPEN(dave) → ACTIVE`.
4. `GET /sessions/1` afterward returned the complete 8-event audit trail matching
   every broadcast, independently confirming the WS stream wasn't showing anything
   that didn't actually get persisted.

## Running it yourself

```bash
brew services start postgresql@14   # if not already running
createdb dvod_dev
cd apps/orchestrator
pnpm migrate
pnpm start
```

`DATABASE_URL` defaults to `postgres://localhost/dvod_dev`; tests default to
`postgres://localhost/dvod_test` (set up the same way) so `pnpm test` never touches
the dev database.

## Known simplification

Pre-payment states (`BROWSING`, `QUOTED`) aren't persisted - there's no durable
session identity before the on-chain `purchaseSession` transaction exists, so the
audit trail starts at `PAID`. This is a scoping choice, not an oversight: the states
that matter for the audit trail and the failover demo are all covered.
