# ENSv2 Sepolia deployment — DVoD infra

Covers the one-time Phase 1 infra deploy: a subregistry for the parent test name, a
shared `PermissionedResolver` proxy, and `WatchdogRevoker`. Written per the throwaway
test-name decision (`dvod-test.eth`, not the real `dvod.eth`) — see brief header note
on the trademark/domain check that still needs to happen before committing to a real
name.

## Verified addresses (current, not the stale dated snapshot)

`ensdomains/contracts-v2` keeps two Sepolia deployment directories: a dated snapshot
(`sepolia-official-v1-20260525-r2/`) and a plain `sepolia/` directory that supersedes
it. **Use `sepolia/`.** We hit this the hard way: the dated snapshot's addresses
compiled fine against current `main`-branch source, but a Sepolia-fork dry run of
`PermissionedResolver.initialize` reverted with empty data — `git log` on
`PermissionedResolver.sol` showed a change on 2026-07-03, after that snapshot's date.
Re-verified against `sepolia/` (fetched 2026-09-09) and the dry run succeeded cleanly.

| Contract | Address |
|---|---|
| LabelStore | `0xB03524289C16424f71802A1794c29c7Bd1B9f577` |
| PermissionedResolverImpl | `0x7E4B2d59938930168024201752EE5503df402303` |
| VerifiableFactory | `0x118Bc31A50d559F7015a8Da26d54B3b030CdB70F` |
| ETHRegistry | `0x67b728A792e789A8978B30cf1b3B641f19354b43` |
| ETHRegistrar | `0xa4449A0dD2b83007553d9B1D28B583a46A805A30` |

Re-verify these yourself before broadcasting anything for real — this is exactly the
kind of value that moves; don't trust this table blindly months from now. Pull fresh
from `contracts/deployments/sepolia/*.json` in that repo, not from a doc page summary.

## What `DeploySepoliaInfra.s.sol` does

1. Deploys a fresh `PermissionedRegistry` as the parent test name's subregistry —
   deployer gets `ROLE_REGISTRAR` (+ admin) so it can register operator subnames
   directly, and `ROLE_SET_RESOLVER` (+ admin).
2. Deploys a `PermissionedResolver` proxy via `VerifiableFactory.deployProxy`,
   initialized with the deployer holding root `SET_TEXT`/`SET_DATA`/`SET_ADDR` (+
   admin) roles — the roles it'll later delegate per-operator via
   `packages/identity/ens`'s `buildRegisterOperatorCalls`.
3. Deploys `WatchdogRevoker` pointed at that resolver proxy.

**It does not register the parent test name itself.** Registering a real `.eth` 2LD
goes through `ETHRegistrar`'s stablecoin-payment flow, which the ENS Sepolia app
already implements correctly — do that by hand, with the same wallet as the deploy
script's deployer, then finish the wiring:

```
ETHRegistry.setSubregistry(tokenId, <Subregistry address from step 1>)
ETHRegistry.setResolver(tokenId, <ResolverProxy address from step 2>)
```

## Dry run (safe — never broadcasts)

```bash
cd contracts/ens
DEPLOYER_PRIVATE_KEY=<any key, even a throwaway — nothing is sent> \
  forge script script/DeploySepoliaInfra.s.sol --fork-url <a Sepolia RPC>
```

This is exactly how the script above was verified: simulated against real Sepolia
state via a public RPC, zero funds spent, three clean transactions constructed with no
reverts. `publicnode.com`'s Sepolia RPC worked when this was last run;
`rpc.sepolia.org` did not (404) and `1rpc.io/sepolia` refused to fork from a
non-archive node.

## Actually broadcasting

```bash
DEPLOYER_PRIVATE_KEY=<your real Sepolia deployer key> \
  forge script script/DeploySepoliaInfra.s.sol --rpc-url <a Sepolia RPC> --broadcast
```

Needs a funded Sepolia wallet. Not run by anyone but you — this repo/assistant never
holds or uses a real private key.
