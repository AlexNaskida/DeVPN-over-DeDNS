import { z } from "zod";

export const TierSchema = z.enum(["lite", "standard", "turbo"]);
export type Tier = z.infer<typeof TierSchema>;

export const TIER_RESERVED_MBPS: Record<Tier, number> = {
  lite: 5,
  standard: 25,
  turbo: 100,
};

/** Illustrative flat rate — not an economically modeled rate card, tune before demo. */
export const TIER_BASE_RATE_USDC_PER_HOUR: Record<Tier, number> = {
  lite: 0.1,
  standard: 0.35,
  turbo: 1.0,
};

/** Soft, informational data cap in GB per hour at full reserved throughput. Not enforced via fine-grained accounting in v1. */
export function softDataCapGbPerHour(tier: Tier): number {
  const mbps = TIER_RESERVED_MBPS[tier];
  return (mbps * 3600) / 8 / 1000;
}

export function sessionPriceUsdc(tier: Tier, hours: number): number {
  return TIER_BASE_RATE_USDC_PER_HOUR[tier] * hours;
}
