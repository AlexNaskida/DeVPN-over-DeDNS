import type { Tier } from "@dvod/session-spec";

/**
 * Integer cents, not the float `sessionPriceUsdc` from session-spec — this is the
 * one used for on-chain wei amounts, where float rounding would be a real bug.
 * Values match packages/session-spec/src/tier.ts and contracts/arc/src/
 * SessionEscrow.sol's rates exactly (all three sources must agree).
 */
const TIER_RATE_CENTS_PER_HOUR: Record<Tier, number> = {
  lite: 10,
  standard: 35,
  turbo: 100,
};

/** Exact wei amount (18 decimals, matching Arc's native USDC) for (tier, hours). */
export function priceWei(tier: Tier, hours: number): bigint {
  const cents = BigInt(TIER_RATE_CENTS_PER_HOUR[tier]) * BigInt(hours);
  return cents * 10_000_000_000_000_000n; // cents -> 1e18-scaled wei (1e18 / 100)
}

/** Human-readable USDC amount for display, e.g. "0.35". */
export function priceDisplay(tier: Tier, hours: number): string {
  const cents = TIER_RATE_CENTS_PER_HOUR[tier] * hours;
  return (cents / 100).toFixed(2);
}
