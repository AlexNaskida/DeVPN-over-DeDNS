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

## Architecture note - why this isn't real x402, and why real x402 can't work here

**Correction:** an earlier version of this note claimed the orchestrator uses
`@x402/fastify` for the 402 handshake. That was never true - it isn't a dependency
anywhere in the repo. `POST /sessions/:tier/:hours` hand-builds a 402 response that's
*shaped* like x402 (same `accepts`/quote structure), but no `@x402/*` package is
involved in that response at all.

The real reason isn't just "no generic-calldata path" either - it's deeper, checked
directly against `@x402/evm`'s actual code (installed and inspected, not assumed):

- **Arc isn't in `@x402/evm`'s supported network list**, and more fundamentally,
  **every EVM scheme it ships (`exact`, `batch-settlement`, `auth-capture`) is built
  on ERC-20 mechanics** - EIP-3009 `transferWithAuthorization`, Permit2 allowances, or
  an escrow contract's ERC-20 "token collector." Arc's USDC is the chain's *native*
  gas token, not an ERC-20 contract, so none of these methods exist to call.
- `@x402/core` **is** explicitly scheme-pluggable (`x402ClientConfig.schemes` takes a
  custom `SchemeNetworkClient`/`SchemeNetworkServer`/`SchemeNetworkFacilitator` for
  any network identifier), so a custom "native transfer" scheme for Arc is
  architecturally possible. But it wouldn't unlock x402's actual value proposition:
  MetaMask (and browser wallets generally) deliberately don't support
  `eth_signTransaction` - only `eth_sendTransaction`, which signs and broadcasts
  atomically. x402's core idea (client signs a payment authorization off-chain, a
  facilitator settles/broadcasts it later, same as EIP-3009) has no equivalent for a
  native-value payment through a standard wallet: there's no way to get a
  signed-but-unbroadcast transaction to defer. A custom scheme's client side could do
  nothing more than `eth_sendTransaction` and wait for the receipt - which is exactly
  what `purchaseSession` already does today, just not wrapped in x402's official
  types.

So: the orchestrator's `POST /sessions/:tier/:hours` returns an x402-*shaped* 402
quote, but the actual payment is the client's own `purchaseSession` transaction
against this contract, confirmed by the orchestrator independently re-reading the
transaction receipt before issuing a session token. This is a genuine protocol/token-model
incompatibility, not a shortcut - see `docs/SECURITY.md` for how this fits into the
project's broader honesty accounting.
