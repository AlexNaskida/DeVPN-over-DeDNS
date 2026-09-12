# Demo script

A ~5 minute walkthrough of everything genuinely real and live, in an order that
builds the story: authorization → payment → live session → automatic resilience →
user control → honest limits.

Run this against the real deployed stack (Cloudflare Workers web app + Render
orchestrator + Neon), or locally (`pnpm --filter @dvod/orchestrator start` + `pnpm
--filter @dvod/web dev`) - the flow is identical either way, only the URLs differ.

## 1. Operator console - "who's allowed to run a relay, right now" (30s)

Open `/operators`. Point out:

- `bob.dvod-test.eth` shows **REVOKED** - this isn't seeded data, it's the result of
  a real permissionless revocation submitted to `WatchdogRevoker.sol` on Sepolia
  (see `docs/ensv2-sepolia-deploy.md` for the tx hash) - no admin action, anyone can
  trigger it on a genuine attestation mismatch.
- `carol` / `dave` show **ACTIVE**. Click "Check attestation" on one - a real hash
  read live from the ENSv2 capability record on Sepolia.

## 2. Purchase a session - real payment (60s)

`/purchase`. Pick a tier, drag the duration slider, connect a wallet (the picker
lists every installed wallet via EIP-6963 - point out it's not just grabbing
`window.ethereum`). Buy.

This sends a **real transaction** to `SessionEscrow.sol` on Arc testnet. Wait for
the wallet confirmation and the orchestrator's payment verification (it independently
re-reads the tx receipt from the chain - doesn't trust the client's word for it).

You land on `/session/:id`.

## 3. Live session dashboard (30s)

Point out, in order:

- **Time remaining** - a real countdown from the actual purchased duration.
- **Live event log** - `PAID → TOKEN_ISSUED → TUNNEL_OPEN → ACTIVE`, each row a real
  Postgres write, streamed over the page's own WebSocket connection as it happened
  (not polled, not replayed after the fact).
- **What's visible to whom** - the honest transparency panel. Read the last row aloud:
  the relay operator's process can read traffic in the clear today; full confidential
  isolation isn't implemented. This is the moment to be upfront, not to gloss over it.

## 4. The centerpiece: forced failover (45s)

Click **"Force relay failure"**. Narrate while it happens:

> This simulates the relay going unreachable mid-session. Watch the dashboard -
> nothing reloads.

`ACTIVE → RELAY_UNREACHABLE → FAILOVER_SELECT → TUNNEL_OPEN → ACTIVE`, landing on a
genuinely different relay, all live over the same WebSocket connection. This is the
brief's own demo centerpiece (§9.3) and it's driving the real orchestrator state
machine, not a scripted animation - `GET /sessions/:id` afterward shows the identical
sequence in the persisted audit trail, confirming the WS stream didn't show anything
that wasn't actually written.

## 5. User control: ending a session (20s)

Click **"End session"**. Show the confirmation dialog - point out it states plainly
that unused time isn't refunded (`SessionEscrow.sol` has no partial-refund path,
admin-only full refund only). Confirm. The state moves to `EXPIRED_NORMAL` with an
honest `ended by user` detail in the log, and the countdown becomes "Ended" instead
of continuing to tick down purchased-but-abandoned time.

## 6. Closing - what's real vs. not (30s)

State plainly, in this order:

- **Real, live, verified today:** payment, authorization, revocation, the full
  session state machine, live streaming, automatic failover - all just demonstrated
  against the actual deployed stack, not a local mock.
- **Not real yet:** no user traffic is actually tunneled through any of this. The
  tunnel-server code is real and independently tested, but no operator endpoint is
  deployed and reachable, and there's no client that would point a device at it. See
  `docs/SECURITY.md` for the complete list.

Ending on the honest gap, not hiding it, is deliberate - it's the difference between
a demo that survives a skeptical question and one that doesn't.

## If something goes wrong live

- **Orchestrator unreachable:** Render free tier can cold-start after idling - the
  first request after a while can take ~10-30s. Hit `/tiers` once before going on
  stage to warm it up.
- **Wallet won't connect:** the picker only lists wallets actually installed in that
  browser profile - confirm MetaMask (or whichever) is installed and unlocked
  beforehand, not mid-demo.
- **Failover button greyed out:** it's only enabled while state is `ACTIVE` - if a
  previous demo run already ended the session, buy a new one first.
