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

Phase 0 (foundations) is complete — see the [build phases](#build-phases) below. This
section will grow into a proper quickstart, threat model summary, and "what's real vs.
simulated" breakdown as later phases land (tracked in `docs/SECURITY.md` once written).

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Monorepo scaffold, session-spec, ui tokens, CI | ✅ done (`v0.1-phase0`) |
| 1 | ENSv2 registry + watchdog contract | 🟡 code + tests done, **not yet deployed** — see below |
| 2 | Arc + x402 session purchase | not started |
| 3 | Chainlink CRE relay handler | not started |
| 4 | Orchestrator + web app | not started |
| 5 | Hardening, docs, demo | not started |

**Phase 1 detail — what's real vs. what's still pending:**

- `contracts/ens/src/WatchdogRevoker.sol` — implemented, 6 passing Foundry tests
  (valid attestation passes, tampered attestation revokes, double-revoke is a no-op,
  submitting is permissionless but only the watchdog's own address can execute the
  revoke, admin fallback, honestly-stubbed misbehavior-proof).
- `packages/identity/ens` — ENSv2 registration/capability-record client, built and
  tested against the real `ensdomains/contracts-v2` source.
- `contracts/ens/script/DeploySepoliaInfra.s.sol` — the one-time infra deploy,
  verified via a **Sepolia fork dry-run** (no funds spent, nothing broadcast).
- **Not done:** nothing has actually been deployed to Sepolia. No operator has been
  registered on-chain. The "tampered attestation → automatic revoke" flow has not
  been run live. Phase 1's Definition of Done requires this to be real and demoable
  on camera — that still needs a funded wallet to run the deploy script for real; see
  [`docs/ensv2-sepolia-deploy.md`](docs/ensv2-sepolia-deploy.md).

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
