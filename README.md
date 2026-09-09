# DVoD — DeVPN-over-DeDNS

> Anonymous internet access with enforceable, revocable permissions. Users pay for a
> time-boxed session at a chosen bandwidth tier; their traffic tunnels through an
> authorized relay operator whose tunnel-termination, DNS-resolution, and outbound-proxy
> logic runs inside a Chainlink CRE confidential handler, so the operator's own machine
> cannot read or log it. Which operators are authorized lives in an ENSv2 registry,
> revocable by a permissionless watchdog contract. Payment settles in USDC on Arc via
> x402, as a batched per-session purchase.

## Architecture

![DVoD architecture](docs/architecture.jpg)

Payment and permission checks (ENSv2 registry lookup, attestation check, x402 purchase
on Arc) all complete **before** any tunnel opens. Once open, the session runs fully
anonymous — DNS + proxy traffic inside the relay's attested confidential handler — until
it expires or the watchdog contract revokes the relay.

## Status

Phases 0, 1, and 2 are complete — see the [build phases](#build-phases) below. This
section will grow into a proper quickstart, threat model summary, and "what's real vs.
simulated" breakdown as later phases land (tracked in `docs/SECURITY.md` once written).

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Monorepo scaffold, session-spec, ui tokens, CI | ✅ done (`v0.1-phase0`) |
| 1 | ENSv2 registry + watchdog contract | ✅ done (`v0.2-phase1`) |
| 2 | Arc + x402 session purchase | ✅ done (`v0.3-phase2`) |
| 3 | Chainlink CRE relay handler | not started |
| 4 | Orchestrator + web app | not started |
| 5 | Hardening, docs, demo | not started |

**Phase 2 — what's real, on Arc testnet, right now:**

- `contracts/arc/src/SessionEscrow.sol` deployed live (see
  [`docs/arc-testnet-deploy.md`](docs/arc-testnet-deploy.md)) — USDC is Arc's native
  gas/value token, so `purchaseSession` is a plain payable transaction, not an
  ERC-20 flow.
- A real 1-hour Standard session was purchased for real (0.35 USDC), and a
  wrong-amount attempt was rejected before broadcasting — both verifiable on-chain.
- `apps/orchestrator` serves `GET /tiers` (live ENSv2 eligibility counts — correctly
  excludes `bob`, revoked in Phase 1) and `POST /sessions/:tier/:hours` (a 402 quote,
  then a signed session token once a real `purchaseSession` tx is verified against
  the chain). Tested end-to-end against the actual live deployment, not mocks.
- **Architecture note:** x402 v2's real settlement moves an asset to `payTo`, with no
  generic-calldata path for calling a specific contract function — so the quote
  points the client at `purchaseSession` directly rather than routing through an
  x402 facilitator. See `docs/arc-testnet-deploy.md` for the full reasoning.

**Phase 1 — what's real, on Sepolia, right now:**

- `contracts/ens/src/WatchdogRevoker.sol`, a shared `PermissionedResolver` proxy, and
  a subregistry are deployed live on Sepolia (see
  [`docs/ensv2-sepolia-deploy.md`](docs/ensv2-sepolia-deploy.md) for every address and
  tx hash).
- Two relay operators, `bob.dvod-test.eth` and `carol.dvod-test.eth`, are registered
  on-chain with real capability records — operational key holds only
  endpoint/tiers/attestation-hash roles, `WatchdogRevoker` alone holds the status
  role, payout address is never delegated to the operational key.
- The automatic revoke was run live: a deliberately mismatched attestation report was
  submitted permissionlessly to `WatchdogRevoker`, which itself flipped bob's status
  from `active` to `revoked` on-chain (tx
  `0xef1189e7299c8d60e4c5c971c0cab95fb0d538d70c7aed10c8d297b99a49b7f0`) — no human
  admin transaction involved.
- **Honesty note:** both operators' `attestation_build_hash` is a documented **STUB**
  (`keccak256("STUB: no real CRE handler binary yet for <name>")`) — Phase 3's actual
  Chainlink CRE handler doesn't exist yet, so there's no genuine build to hash. The
  revoke logic above is real; what it's checking against is not, yet.

## Repo layout

```
/apps            web app + orchestrator service
/packages        session-spec, ui, chain-adapters, identity
/relay           Chainlink CRE confidential handler + relay node image
/contracts       SessionEscrow.sol (Arc), WatchdogRevoker.sol (ENS)
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
