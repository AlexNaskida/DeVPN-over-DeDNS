import { z } from "zod";
import { TierSchema } from "./tier.js";

const EvmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "not a valid EVM address");
const HexHashSchema = z.string().regex(/^0x[a-fA-F0-9]+$/, "not a valid hex hash");

export const RelayStatusSchema = z.enum(["active", "revoked"]);
export type RelayStatus = z.infer<typeof RelayStatusSchema>;

/**
 * ENSv2 capability record for a relay operator subname (e.g. bob.dvod.eth).
 *
 * Invariant (test explicitly): the operational key may update endpoint,
 * tiers_supported, and attestation_build_hash, but can never touch
 * payout_address — that is set once at registration and changed only
 * through a separate, more restricted permission path. status is only
 * ever changed by the watchdog contract (or, in the manual fallback, the
 * admin key) — never by the operational key.
 */
export const CapabilityRecordSchema = z.object({
  operator: z.string().min(1), // e.g. "bob.dvod.eth"
  operational_key: EvmAddressSchema,
  payout_address: EvmAddressSchema,
  endpoint: z.string().url(),
  tiers_supported: z.array(TierSchema).min(1),
  status: RelayStatusSchema,
  attestation_build_hash: HexHashSchema,
});
export type CapabilityRecord = z.infer<typeof CapabilityRecordSchema>;
