# Arc testnet deployment - SessionEscrow

## Network

- Chain ID **`5042002`**, RPC `https://rpc.testnet.arc.io` (backups:
  `rpc.blockdaemon.testnet.arc.io`, `rpc.drpc.testnet.arc.io`,
  `rpc.quicknode.testnet.arc.io`) - verified from `docs.arc.io/arc/references/connect-to-arc`.
- Explorer: `testnet.arcscan.app`. Faucet: `faucet.circle.com`.
- **USDC is Arc's native gas/value token** (18 decimals) - payment is a plain native
  transaction (`msg.value`), not an ERC-20 `approve`/`transferFrom`. Re-verify this
  before mainnet (launching 2026-09-16): confirm nothing changes about the native-gas
  model at that transition.

## Deployed (real, confirmed on-chain)

Deployer/admin wallet: `0x5ad2237b74e7274CCB018f595c6572555f083657` (same wallet used
for the ENSv2 Sepolia deploy - EVM addresses are chain-agnostic).

| Contract | Address | Deploy tx |
|---|---|---|
| SessionEscrow | `0x44Fe9A419Bb5e6d52A696f555D2E9dBb6ae23A47` | `0xf3af86175f6ea4d9595a1576449407d9b630e27dc89f2a20a3f8b30e0de04a60` |

## Verified live

- **Real purchase:** `purchaseSession(Tier.Standard, 1)` with `0.35 ether` (0.35 USDC)
  - succeeded, session id `0`, tx
  `0x3894f1ae9b6ad472c112cccd441e01aca5d41abe6fd29e99e6a916a7891cbbb7`.
- **Client-side rejection:** the same call with `0.10 ether` (wrong amount) reverted
  with `IncorrectPayment(350000000000000000, 100000000000000000)` - gas estimation
  failed, so nothing was even broadcast.

## Deploying yourself

```bash
cd contracts/arc
DEPLOYER_PRIVATE_KEY=<any key - nothing sent without --broadcast> \
  forge script script/DeploySessionEscrow.s.sol --fork-url https://rpc.testnet.arc.io
```

Add `--rpc-url https://rpc.testnet.arc.io --broadcast` in place of `--fork-url` with a
funded key to deploy for real.

## Architecture note - why `purchaseSession` isn't x402-facilitator-settled directly

x402's real settlement mechanism (verified against `@x402/core`'s actual types) moves
an *asset* to a `payTo` address - it has no generic-calldata path for calling a
specific contract function with arguments. So the orchestrator's `POST
/sessions/:tier/:hours` uses `@x402/fastify` for the 402 quote handshake, but the
actual payment is the client's own `purchaseSession` transaction against this
contract - that's what produces a real, session-specific on-chain event rather than a
bare value transfer with no metadata. The orchestrator watches for that transaction to
confirm payment before issuing a session token.
