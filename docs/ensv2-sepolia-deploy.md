# ENSv2 Sepolia deployment — DVoD infra

Covers the Phase 1 infra: a subregistry for the parent test name, a shared
`PermissionedResolver` proxy, `WatchdogRevoker`, and (as of Phase 4) three
registered relay operators.
Written per the throwaway test-name decision (`dvod-test.eth`, not the real
`dvod.eth`) — see brief header note on the trademark/domain check that still needs to
happen before committing to a real name.

**This is now live on Sepolia, not just planned.** See "Current deployment" below.

## Address discrepancy — read this before touching anything here

`ensdomains/contracts-v2`'s GitHub repo has **three different Sepolia address sets**
that all disagree with each other:

1. A dated snapshot directory, `sepolia-official-v1-20260525-r2/` — stale.
   `PermissionedResolver.sol` changed on `main` after that snapshot's date; a fork
   dry-run against these addresses reverted on `initialize()` with empty data.
2. A plain `sepolia/` directory in the same repo — what the infra contracts
   (Subregistry, ResolverProxy, WatchdogRevoker) below were actually deployed
   against. A fork dry-run against these succeeded cleanly.
3. **The live `docs.ens.domains` deployments page** — disagreed with *both* of the
   above on `ETHRegistry`, `ETHRegistrar`, `LabelStore`, `PermissionedResolverImpl`,
   and `VerifiableFactory`. Only `UniversalResolverV2`'s proxy address matched
   across all three.

Per the brief's own rule, live docs win. **`ETHRegistry` for any wiring step
(`setSubregistry`/`setResolver`) must be the docs.ens.domains address,
`0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2`** — that's the contract that actually
issued `dvod-test.eth` when it was registered through the matching ENS app. The
`sepolia/` GitHub addresses below were fine to build *our own* contracts against
(LabelStore/VerifiableFactory are just internal plumbing, not a compatibility
requirement for `ETHRegistry` to point at our resolver/subregistry), and that's borne
out in practice — the wiring calls against the docs.ens.domains `ETHRegistry` worked
correctly using our GitHub-`sepolia/`-built Subregistry and ResolverProxy.

If you're revisiting this later: re-verify all of these fresh, from
`contracts/deployments/sepolia/*.json` in the repo *and* the live docs.ens.domains
deployments page, and don't assume they still agree with what's written here.

## Current deployment (Sepolia, real, confirmed on-chain)

Deployer/admin wallet: `0x5ad2237b74e7274CCB018f595c6572555f083657`

| Contract | Address |
|---|---|
| Subregistry (PermissionedRegistry) | `0x44Fe9A419Bb5e6d52A696f555D2E9dBb6ae23A47` |
| ResolverProxy (PermissionedResolver) | `0x0F98C60F734B363Cab6e2B64c74fedC7D9075baF` |
| WatchdogRevoker | `0x4D6DaB1b694D980CaB5AFb4184CB229c28554D87` |
| `dvod-test.eth`'s `ETHRegistry` (docs.ens.domains) | `0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2` |

`dvod-test.eth`'s registry entry has `setSubregistry`/`setResolver` pointed at the two
addresses above (txs `0x860516b6...` and `0xa06a78b1...`).

**Registered operators:**

| Operator | Node (namehash) | Operational key | Payout address | Tiers | Status |
|---|---|---|---|---|---|
| `bob.dvod-test.eth` | `0x6ae42ffccc275cd1d6fc09d379960a2452c614c8f31c574fe0051f1c604b3628` | `0xf0C16Af7eB8c169271968E70741A87885F73Bfd2` | `0x785684c5D66133456E8DB2b31D184952d87Dab34` | lite, standard | **revoked** (Phase 1 live demo) |
| `carol.dvod-test.eth` | `0x266eeed26366229aa73629835e62aa32aca6b06c3dfe36b5ec44ae6c581deb57` | `0x52E6121e74Db83BAeE0685d19E4a6e491804C6ff` | `0xEC590599bE563297686CddA78A3D18d8f47aDDA6` | lite, standard, turbo | active |
| `dave.dvod-test.eth` | `0x0a218655d6f2486bf24acd59f45c8b03ccf5834384d47b950b0a70f17430a5cd` | `0xe17985962085404b481367f0a234D67E6F692eBB` | `0x8F9f402Fa5acCA34d956Ad7c42e20FaCCbeDc816` | lite, standard, turbo | active |

`dave` was added in Phase 4 specifically so the orchestrator's forced-failover demo
has a real second *active* relay to fail over to — see
[`docs/orchestrator-state-machine.md`](orchestrator-state-machine.md).

All three used a **STUB** `attestation_build_hash` at registration
(`keccak256("STUB: no real CRE handler binary yet for <name>")`) — there's still no
real relay build to hash (see docs/chainlink-cre-findings.md). Note carol's has since
been overwritten by the real Phase 3 CRE workflow (a genuinely different STUB value,
computed by real CRE execution rather than this script) — see that doc for the
current value and the tx that set it.

Private keys for the deployer and both operators' wallets live outside this repo, in
`../dvod-wallets/*.json` (relative to the monorepo root), `chmod 600`. Never committed.

## What's deployed and how

**`contracts/ens/script/DeploySepoliaInfra.s.sol`** — one-time infra: subregistry,
resolver proxy (via `VerifiableFactory.deployProxy`, deployer holding root
`SET_TEXT`/`SET_DATA`/`SET_ADDR` admin roles), and `WatchdogRevoker`. Dry run:

```bash
cd contracts/ens
DEPLOYER_PRIVATE_KEY=<any key — nothing is sent without --broadcast> \
  forge script script/DeploySepoliaInfra.s.sol --fork-url <a Sepolia RPC>
```

Broadcast for real: add `--rpc-url <url> --broadcast` in place of `--fork-url`, with a
funded key.

**`packages/identity/ens/scripts/register-operator.ts`** — registers one operator:
subname + capability record + role grants, via `buildRegisterOperatorCalls`. Run with
`RPC_URL`, `ADMIN_PRIVATE_KEY`, `REGISTRY_ADDRESS`, `RESOLVER_ADDRESS`,
`WATCHDOG_ADDRESS`, `OPERATOR_NAME`, `OPERATIONAL_KEY_ADDRESS`, `PAYOUT_ADDRESS`,
`TIERS_SUPPORTED` (comma-separated), `ENDPOINT` set — see the script's own header
comment for exact env var names. No dry-run mode; it sends real transactions
immediately, so only run it with intent.

## Phase 1's Definition of Done — met

`WatchdogRevoker.submitAttestationCheck` was run live against a deliberately
mismatched report, flipping bob's status to `revoked` on-chain with no human admin
transaction — tx `0xef1189e7299c8d60e4c5c971c0cab95fb0d538d70c7aed10c8d297b99a49b7f0`.
See the README's Phase 1 section for the full writeup.
