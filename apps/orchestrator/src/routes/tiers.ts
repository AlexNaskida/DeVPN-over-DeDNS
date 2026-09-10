import type { FastifyInstance } from "fastify";
import { TIER_RESERVED_MBPS, type Tier } from "@dvod/session-spec";

import { eligibleOperators } from "../relays.js";
import { priceDisplay } from "../pricing.js";

const TIERS: Tier[] = ["lite", "standard", "turbo"];

/** `GET /tiers` - tier list + live prices + relay availability count per tier. */
export function registerTiersRoute(app: FastifyInstance) {
  app.get("/tiers", async () => {
    const tiers = await Promise.all(
      TIERS.map(async (tier) => ({
        tier,
        reservedMbps: TIER_RESERVED_MBPS[tier],
        pricePerHourUsdc: priceDisplay(tier, 1),
        eligibleRelayCount: (await eligibleOperators(tier)).length,
      })),
    );
    return { tiers };
  });
}
