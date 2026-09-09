/**
 * `data(node, key)` / `text(node, key)` record keys for a DVoD operator's ENSv2
 * capability record (brief §7.2). Must exactly match the Solidity constants in
 * contracts/ens/src/CapabilityRecordKeys.sol — the two sides read/write the same
 * on-chain records.
 */
export const CAPABILITY_RECORD_KEYS = {
  endpoint: "dvod.endpoint",
  tiersSupported: "dvod.tiers_supported",
  attestationBuildHash: "dvod.attestation_build_hash",
  payoutAddress: "dvod.payout_address",
  status: "dvod.status",
} as const;

export const STATUS_ACTIVE = "active";
export const STATUS_REVOKED = "revoked";
