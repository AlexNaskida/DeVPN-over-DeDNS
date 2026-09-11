# DVoD - DeVPN-over-DeDNS

> Anonymous internet access with enforceable, revocable permissions. Users pay for a
> time-boxed session at a chosen bandwidth tier; their traffic tunnels through an
> authorized relay operator whose tunnel-termination, DNS-resolution, and outbound-proxy
> logic runs inside a Chainlink CRE confidential handler, so the operator's own machine
> cannot read or log it. Which operators are authorized lives in an ENSv2 registry,
> revocable by a permissionless watchdog contract. Payment settles in USDC on Arc via
> x402, as a batched per-session purchase.

The paragraph above is the target design. **The payment/authorization/revocation
control plane is real and live today; the traffic-tunneling data plane is not yet
connected end to end** - see `docs/SECURITY.md` for the precise, current line between
the two.

## Architecture

### Current design

![DVoD target architecture](docs/architecture.jpg)

This is the fuller target design - useful for seeing where the pieces are meant to go,
but it draws things that don't exist yet: a separate on-chain "Session Router" (we only
have `SessionEscrow.sol`), the confidential handler actually decrypting tokens, opening
tunnels, and resolving DNS, and private/x402-settled payment. `docs/chainlink-cre-findings.md`
covers why the confidential-handler part can't run as a Chainlink CRE workflow itself
(CRE workflows are event-driven and stateless, not a place to run a persistent
proxy/DNS server) - closing that gap means real confidential compute running outside
CRE, not CRE running longer.

### Current implementation

![DVoD architecture](docs/architecture-2.jpg)

Payment and permission checks (ENSv2 registry lookup, attestation check, x402-shaped
purchase on Arc) all complete **before** any tunnel opens. Once open, the session runs
fully anonymous - DNS + proxy traffic through the relay's tunnel-server - until it
expires or the watchdog contract revokes the relay. Payment is a plain, public
`purchaseSession` transaction (not private, not x402-settled - see "Coming next" below)
and the tunnel-server runs as a standalone process, not inside a confidential handler
yet.

## Status

Phases 0-5 are complete and the full stack is deployed live (not just runnable
locally) - see [Live deployment](#live-deployment) and the [build phases](#build-phases)
below. Phase 5's docs are real, not placeholders: `docs/SECURITY.md` (honest scope/
threat model), `docs/PRICING.md`, `docs/demo-script.md`, and `docs/load-test.md` (a
real load test that found and fixed a genuine bug - an uncached RPC call that
exhausted a public RPC's rate limit under trivial concurrency).

## Live deployment

The whole stack runs on real infrastructure, not just `localhost`:

- **Web app** (`apps/web`) - deployed to Cloudflare Workers via the OpenNext adapter,
  with CI-gated auto-deploy on every push to `main` (see
  `.github/workflows/deploy-web.yml`).
- **Orchestrator** (`apps/orchestrator`) - deployed as a Render web service (always-on,
  doesn't depend on any single machine staying awake).
- **Database** - a real Neon Postgres instance, not a local dev database.
- **Contracts** - live on Sepolia (ENSv2 registry/watchdog) and Arc testnet
  (`SessionEscrow`), as documented per-phase below.

Verified end to end against this exact live stack (not local mocks): a real
`purchaseSession` transaction, through the deployed orchestrator, into Neon,
rendered live on the deployed web app, including the forced-failover demo running
over the deployed site's own WebSocket connection with no page reload.

**Honest limitation:** this proves the control plane (payment → authorization → live
state → revocation/failover) is real, end to end, live. It does not mean user traffic
is actually tunneled anywhere yet - see `docs/SECURITY.md`'s scope note for exactly
what's real vs. not in the data plane.

## Pricing model — pay-as-you-go, not a subscription

There's no account, no card on file, and no recurring charge. Every session is a
one-off purchase: pick a tier, pick how many hours (1-24), pay exactly
`rate(tier) * hours` in USDC up front, get a time-boxed session that expires on its
own. See [`docs/PRICING.md`](docs/PRICING.md) for the full rate card and where the
payment actually goes; the honesty notes there (illustrative flat rate, no
protocol fee yet, admin-only refunds) are worth reading before quoting a number.

| Tier | Reserved throughput | Rate |
|---|---|---|
| Lite | 5 Mbps | $0.10/hr |
| Standard | 25 Mbps | $0.35/hr |
| Turbo | 100 Mbps | $1.00/hr |

**Note on x402:** the quote step (`GET /tiers`, `POST /sessions/:tier/:hours`) follows
x402's request-a-price-then-pay shape, but the payment itself is a direct
`purchaseSession` call, not real x402 settlement - Arc's USDC is a native gas token,
not an ERC-20, so none of `@x402/evm`'s existing schemes apply. See Phase 2's
architecture note below for the full investigation.

### Coming next - private payments

Every `purchaseSession` payment today is a plain, public transaction: amount, tier,
and wallet are all visible on-chain. Arc has announced a native confidential-
transactions feature ("Arc Privacy" - encrypt a standard EVM transaction, submit
the ciphertext as calldata to a privacy precompile) that would fit
`purchaseSession(tier, hours)` without a redesign - but per Arc's own docs
(`docs.arc.io/arc/concepts/opt-in-privacy`), it isn't available yet. Wiring it in,
along with a genuine `@x402/core` custom settlement scheme once the constraints
documented above are workable, is next up once both ship. See `docs/SECURITY.md`
for the current honest scope.

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Monorepo scaffold, session-spec, ui tokens, CI | ✅ done (`v0.1-phase0`) |
| 1 | ENSv2 registry + watchdog contract | ✅ done (`v0.2-phase1`) |
| 2 | Arc + x402 session purchase | ✅ done (`v0.3-phase2`) |
| 3 | Chainlink CRE relay handler | ✅ done - real tunnel + real CRE attestation job |
| 4 | Orchestrator + web app | ✅ done (`v0.5-phase4`), deployed live |
| 5 | Hardening, docs, demo | ✅ done (`v0.6-phase5`) |

**Phase 5 - what's real:**

- `docs/SECURITY.md` - a consolidated, honest threat model: what's actually
  protected (payment can't be faked, revocation is permissionless, payout keys are
  never delegated to operational keys) versus the real gaps (no deployed tunnel, no
  confidential compute, stub attestation content, no partial refunds).
- `docs/PRICING.md` - the real rate card (`packages/session-spec/src/tier.ts`,
  mirrored exactly in the orchestrator and the contract) and where payment actually
  goes.
- `docs/demo-script.md` - a ~5 minute walkthrough script, written to end on the
  honest limitation rather than hide it.
- `docs/load-test.md` - a real `autocannon` run against `GET /tiers` found a genuine
  bug: every request re-read every operator's ENSv2 record from Sepolia live, with no
  caching, which exhausted the public RPC's rate limit at just 20 concurrent
  connections (`p50` latency 4.8s, real `500`s). Fixed with a 10s cache
  (`apps/orchestrator/src/relays.ts`) and re-measured, not assumed: `p50` latency
  dropped to 0ms and throughput went from ~4.6 req/s (with errors) to ~14,600 req/s
  clean.

**Phase 4 - what's real, verified live, not just unit-tested:**

- Real Postgres persistence (`session_events`) - every state transition is a row,
  validated against `packages/session-spec`'s actual transition table before being
  written, not asserted.
- Real `WS /stream` - verified with an actual WebSocket client watching live: a real
  Arc-testnet purchase fed through the orchestrator produced
  `PAID → TOKEN_ISSUED → TUNNEL_OPEN → ACTIVE` in real time.
- The brief's own demo centerpiece (§9.3), triggered live: `POST /sessions/:id/
  force-relay-failure` produced `ACTIVE → RELAY_UNREACHABLE → FAILOVER_SELECT →
  TUNNEL_OPEN → ACTIVE` on a genuinely different relay, broadcast over the same WS
  connection, then independently confirmed via `GET /sessions/:id`'s full 8-event
  audit trail.
- Added a third registered operator, `dave.dvod-test.eth`, specifically so that
  failover demo has a real second active relay (`bob` is still revoked from Phase
  1's demo). See [`docs/orchestrator-state-machine.md`](docs/orchestrator-state-machine.md).
- `apps/web` (Next.js 15) - landing page (interactive 3D hero, `@react-three/fiber`),
  tier selection/purchase (real EIP-6963 multi-wallet flow - a proper picker, not a
  blind `window.ethereum` guess - sends the actual `purchaseSession` tx, confirms with
  the orchestrator), a live session dashboard (`WS /stream`-driven event log, "what's
  visible to whom" panel, the forced-failover demo button, and a real user-facing "end
  session early" control with a confirmation dialog), an account page, and an operator
  console (live ENSv2 registry state + attestation lookup). Verified end to end in a
  real browser against real purchases: the dashboard received full live failover
  sequences over its own WebSocket connection with no page reload.
- Real bugs found and fixed by actually deploying rather than assuming it would work:
  a `pg`/Turbo strict-env-mode interaction that broke CI's database tests, a wallet
  `this`-binding bug that crashed on real MetaMask (destructuring `provider.on` off
  its object), and `db/pool.ts` silently dropping `sslmode` from `DATABASE_URL` (broke
  Neon, which requires SSL). Each is a one-line fix once found, but none of them would
  have surfaced without exercising the real path.

**Phase 3 - the honesty-critical phase, resolved with a real finding:**

Verified directly against `docs.chain.link/cre` (see
[`docs/chainlink-cre-findings.md`](docs/chainlink-cre-findings.md)): CRE workflows
are event-driven and stateless and categorically cannot run a persistent
tunnel-termination/DNS/proxy server - not "not in the time available," a real
platform-shape mismatch the brief itself didn't anticipate this sharply. So:

- `relay/handler_cre/tunnel-server` is a **real, working HTTP CONNECT proxy** - real
  DNS resolution, real bidirectional proxying, verified with an actual live fetch of
  `https://example.com` through it - running standalone as a plain process
  (`GET /health` reports this), because CRE can't run it.
- `relay/handler_cre/attestation-refresher` is a **real Chainlink CRE workflow**
  (Chainlink's own `keeper-bot-ts` template, adapted), genuinely executed via the
  real CRE CLI: compiled to actual WASM, read live Sepolia state, produced a
  DON-signed report, and wrote through the real KeystoneForwarder to
  `contracts/ens/src/AttestationRefresherReceiver.sol` - confirmed independently
  on-chain afterward, not just trusted from the CLI's own output.
- **Honesty note:** the hash being attested is still a documented STUB - there's no
  real relay build artifact to hash yet. What's real is the full pipeline (CRE
  execution → DON consensus → signed report → on-chain write); what's not yet real is
  the input.

**Phase 2 - what's real, on Arc testnet, right now:**

- `contracts/arc/src/SessionEscrow.sol` deployed live (see
  [`docs/arc-testnet-deploy.md`](docs/arc-testnet-deploy.md)) - USDC is Arc's native
  gas/value token, so `purchaseSession` is a plain payable transaction, not an
  ERC-20 flow.
- A real 1-hour Standard session was purchased for real (0.35 USDC), and a
  wrong-amount attempt was rejected before broadcasting - both verifiable on-chain.
- `apps/orchestrator` serves `GET /tiers` (live ENSv2 eligibility counts - correctly
  excludes `bob`, revoked in Phase 1) and `POST /sessions/:tier/:hours` (a 402 quote,
  then a signed session token once a real `purchaseSession` tx is verified against
  the chain). Tested end-to-end against the actual live deployment, not mocks.
- **Architecture note:** real x402 can't settle this payment, for reasons deeper than
  "no generic calldata" - checked directly against `@x402/evm`'s actual code: every
  scheme it ships is built on ERC-20 mechanics (EIP-3009, Permit2), and Arc's USDC is
  the chain's native gas token, not an ERC-20 contract, so none of those methods exist
  to call. `@x402/core` *is* scheme-pluggable, so a custom scheme is architecturally
  possible - but it wouldn't add real capability, since standard wallets (MetaMask
  included) deliberately don't support signing a transaction without also
  broadcasting it, which is what x402's deferred-settlement model depends on. So the
  quote points the client at `purchaseSession` directly - a real, verified
  transaction, just not x402-settled. See `docs/arc-testnet-deploy.md` for the full
  investigation.

**Phase 1 - what's real, on Sepolia, right now:**

- `contracts/ens/src/WatchdogRevoker.sol`, a shared `PermissionedResolver` proxy, and
  a subregistry are deployed live on Sepolia (see
  [`docs/ensv2-sepolia-deploy.md`](docs/ensv2-sepolia-deploy.md) for every address and
  tx hash).
- Two relay operators, `bob.dvod-test.eth` and `carol.dvod-test.eth`, are registered
  on-chain with real capability records - operational key holds only
  endpoint/tiers/attestation-hash roles, `WatchdogRevoker` alone holds the status
  role, payout address is never delegated to the operational key.
- The automatic revoke was run live: a deliberately mismatched attestation report was
  submitted permissionlessly to `WatchdogRevoker`, which itself flipped bob's status
  from `active` to `revoked` on-chain (tx
  `0xef1189e7299c8d60e4c5c971c0cab95fb0d538d70c7aed10c8d297b99a49b7f0`) - no human
  admin transaction involved.
- **Honesty note:** both operators' `attestation_build_hash` is a documented **STUB**
  (`keccak256("STUB: no real CRE handler binary yet for <name>")`) - Phase 3's actual
  Chainlink CRE handler doesn't exist yet, so there's no genuine build to hash. The
  revoke logic above is real; what it's checking against is not, yet.

## Repo layout

```
/apps            web app + orchestrator service
/packages        session-spec, ui, chain-adapters, identity
/relay/handler_cre/tunnel-server         real tunnel/DNS/proxy, runs standalone (outside CRE)
/relay/handler_cre/attestation-refresher real Chainlink CRE workflow (Bun/CRE CLI project)
/contracts       SessionEscrow.sol (Arc), WatchdogRevoker.sol + AttestationRefresherReceiver.sol (ENS)
/docs            architecture diagram, security/pricing docs, demo script
```

## Developing

```bash
git submodule update --init --recursive  # contracts/ens/lib/contracts-v2
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```

Solidity contracts (`contracts/ens`) are a separate Foundry project:

```bash
cd contracts/ens
forge test
```

See [`docs/ensv2-sepolia-deploy.md`](docs/ensv2-sepolia-deploy.md) for deploying the
ENSv2 registry/resolver/watchdog infra to Sepolia.
