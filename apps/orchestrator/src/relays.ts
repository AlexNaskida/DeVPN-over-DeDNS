import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import type { CapabilityRecord, Tier } from "@dvod/session-spec";
import { readCapabilityRecord } from "@dvod/identity-ens";

import { ENS_RESOLVER_ADDRESS, ENS_SEPOLIA_RPC_URL, KNOWN_OPERATORS } from "./config.js";

const sepoliaClient: PublicClient = createPublicClient({
  chain: sepolia,
  transport: http(ENS_SEPOLIA_RPC_URL),
});

// A real load test (docs/PRICING.md's sibling, docs/SECURITY.md's hardening notes)
// found this: every /tiers or /relays request did a fresh Sepolia RPC read with no
// caching, which exhausted the public RPC's rate limit at just 20 concurrent
// requests and produced 500s + multi-second latency. Relay status changes on the
// order of minutes at most (a human or the watchdog contract triggers it), not
// milliseconds, so a short TTL cache is the right fix - not eventual-consistency
// risk for anything that actually matters here.
const CACHE_TTL_MS = 10_000;
let cache: { records: CapabilityRecord[]; expiresAt: number } | null = null;

/** Reads all known operators' current on-chain capability records, cached for
 * CACHE_TTL_MS to survive real request volume without hammering the public RPC. */
export async function listOperators(): Promise<CapabilityRecord[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.records;

  const records = await Promise.all(
    KNOWN_OPERATORS.map((op) =>
      readCapabilityRecord(sepoliaClient, ENS_RESOLVER_ADDRESS, op.name, op.operationalKeyAddress),
    ),
  );
  cache = { records, expiresAt: Date.now() + CACHE_TTL_MS };
  return records;
}

/** Active operators declaring support for `tier` - mirrors brief §7.1's lookup. */
export async function eligibleOperators(tier: Tier): Promise<CapabilityRecord[]> {
  const operators = await listOperators();
  return operators.filter((op) => op.status === "active" && op.tiers_supported.includes(tier));
}
