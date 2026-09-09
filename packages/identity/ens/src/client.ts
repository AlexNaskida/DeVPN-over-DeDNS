import { decodeAbiParameters, hexToString, namehash, type PublicClient } from "viem";
import { CapabilityRecordSchema, type CapabilityRecord } from "@dvod/session-spec";

import { permissionedResolverAbi } from "./abi.js";
import { CAPABILITY_RECORD_KEYS } from "./keys.js";

/**
 * Reads an operator's on-chain capability record fields and validates the result
 * against the shared Zod schema. `operational_key` isn't itself a resolver record —
 * it's whoever the resolver's EAC roles say may write `endpoint`/`tiers_supported`/
 * `attestation_build_hash` for this node — so the caller supplies it (from wherever
 * it tracks which key it delegated), and this function only reads what the resolver
 * actually stores.
 */
export async function readCapabilityRecord(
  publicClient: PublicClient,
  resolverAddress: `0x${string}`,
  operatorName: string,
  operationalKeyAddress: `0x${string}`,
): Promise<CapabilityRecord> {
  const node = namehash(operatorName);

  const [endpoint, tiersSupportedJson, attestationBuildHash, payoutAddressData, statusData] =
    await Promise.all([
      publicClient.readContract({
        address: resolverAddress,
        abi: permissionedResolverAbi,
        functionName: "text",
        args: [node, CAPABILITY_RECORD_KEYS.endpoint],
      }),
      publicClient.readContract({
        address: resolverAddress,
        abi: permissionedResolverAbi,
        functionName: "text",
        args: [node, CAPABILITY_RECORD_KEYS.tiersSupported],
      }),
      publicClient.readContract({
        address: resolverAddress,
        abi: permissionedResolverAbi,
        functionName: "data",
        args: [node, CAPABILITY_RECORD_KEYS.attestationBuildHash],
      }),
      publicClient.readContract({
        address: resolverAddress,
        abi: permissionedResolverAbi,
        functionName: "data",
        args: [node, CAPABILITY_RECORD_KEYS.payoutAddress],
      }),
      publicClient.readContract({
        address: resolverAddress,
        abi: permissionedResolverAbi,
        functionName: "data",
        args: [node, CAPABILITY_RECORD_KEYS.status],
      }),
    ]);

  const [payoutAddress] = decodeAbiParameters([{ type: "address" }], payoutAddressData);
  const status = hexToString(statusData);

  return CapabilityRecordSchema.parse({
    operator: operatorName,
    operational_key: operationalKeyAddress,
    payout_address: payoutAddress,
    endpoint,
    tiers_supported: JSON.parse(tiersSupportedJson),
    status,
    attestation_build_hash: attestationBuildHash,
  });
}
