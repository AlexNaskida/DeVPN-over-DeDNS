# Pricing

## Rate card

Defined once, in `packages/session-spec/src/tier.ts`, and mirrored (matched
exactly, not re-derived) in two other places that all have to agree:
`apps/orchestrator/src/pricing.ts` (integer-cents version, used for exact on-chain
wei amounts - float math would be a real bug there) and
`contracts/arc/src/SessionEscrow.sol` (the on-chain rate, checked against the
payment's exact `msg.value`).

| Tier | Reserved throughput | Rate | Soft data cap |
|---|---|---|---|
| Lite | 5 Mbps | $0.10/hr | ~2.25 GB/hr |
| Standard | 25 Mbps | $0.35/hr | ~11.25 GB/hr |
| Turbo | 100 Mbps | $1.00/hr | ~45 GB/hr |

Price for a session is exactly `rate(tier) * hours` - no hidden fees, no per-packet
or per-DNS-query billing (brief §2.1/§2.4's batched-purchase model). Sessions run
1-24 hours (`MAX_HOURS` in `SessionEscrow.sol`, `MAX_SESSION_HOURS` in the
orchestrator).

**Honesty note:** this is an illustrative flat rate for the hackathon build - see the
`tier.ts` comment - not an economically modeled rate card. The "soft data cap" figure
is informational only; nothing in the code enforces it or meters actual usage against
it (there's no traffic-metering path at all yet, since there's no deployed tunnel -
see `docs/SECURITY.md`'s data-plane gap).

## Where the money goes

- Payment is a plain native-value transaction to `SessionEscrow.sol` on Arc (USDC is
  Arc's native gas/value token, not an ERC-20 - see `docs/arc-testnet-deploy.md`).
- Funds sit in the contract's balance until `payoutOperator` (admin-only) disburses to
  an operator's `payout_address` - the address from their ENSv2 capability record,
  which is deliberately never delegated to the same key that controls
  endpoint/tiers/attestation (see `docs/SECURITY.md`'s trust-assumptions section).
  Payout isn't tied 1:1 to any single session; it's a periodic settlement against
  accumulated revenue.
- There's no protocol fee or take-rate implemented - 100% of a session's payment is
  attributable to the assigned operator's future payout. Whether a real deployment
  would want a fee is a product decision, not something the current code encodes
  either way.

## Refunds

- `refundSession` exists on `SessionEscrow.sol` but is **admin-only** - there's no
  self-service or automatic refund path.
- Ending a session early (the web app's "End session" button) or a relay going
  permanently unreachable does **not** trigger a refund for unused time. The
  confirmation dialog says this explicitly before a user commits to ending early.
- A wrong-amount purchase attempt is rejected by the contract *before* it's ever
  accepted (`IncorrectPayment` revert) - verified live on Arc testnet - so there's
  no "overpaid, now needs a refund" case to handle in the first place.
