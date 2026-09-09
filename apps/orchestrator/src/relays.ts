import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import type { CapabilityRecord, Tier } from "@dvod/session-spec";
import { readCapabilityRecord } from "@dvod/identity-ens";

import { ENS_RESOLVER_ADDRESS, ENS_SEPOLIA_RPC_URL, KNOWN_OPERATORS } from "./config.js";

const sepoliaClient: PublicClient = createPublicClient({
  chain: sepolia,
  transport: http(ENS_SEPOLIA_RPC_URL),
});

/** Reads all known operators' current on-chain capability records. */
export async function listOperators(): Promise<CapabilityRecord[]> {
  const records = await Promise.all(
    KNOWN_OPERATORS.map((op) =>
      readCapabilityRecord(sepoliaClient, ENS_RESOLVER_ADDRESS, op.name, op.operationalKeyAddress),
    ),
  );
  return records;
}

/** Active operators declaring support for `tier` — mirrors brief §7.1's lookup. */
export async function eligibleOperators(tier: Tier): Promise<CapabilityRecord[]> {
  const operators = await listOperators();
  return operators.filter((op) => op.status === "active" && op.tiers_supported.includes(tier));
}
