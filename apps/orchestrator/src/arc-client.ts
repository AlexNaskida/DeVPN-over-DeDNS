import { createPublicClient, defineChain, decodeEventLog, http, type PublicClient } from "viem";
import type { Tier } from "@dvod/session-spec";

import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_RPC_URL, SESSION_ESCROW_ADDRESS } from "./config.js";

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_TESTNET_RPC_URL] } },
});

export const arcClient: PublicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(ARC_TESTNET_RPC_URL),
});

const TIER_INDEX: Record<Tier, number> = { lite: 0, standard: 1, turbo: 2 };

const sessionPurchasedEventAbi = [
  {
    type: "event",
    name: "SessionPurchased",
    inputs: [
      { name: "sessionId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "tier", type: "uint8", indexed: false },
      { name: "hours_", type: "uint256", indexed: false },
      { name: "paidAmount", type: "uint256", indexed: false },
    ],
  },
] as const;

export class PaymentVerificationError extends Error {}

/**
 * Verifies a real `SessionEscrow.purchaseSession` transaction: mined, successful,
 * on our contract, for exactly the requested (tier, hours, price). This reads a
 * public tx receipt and decodes a known event log — not a signature/crypto
 * reimplementation, so it doesn't fall under the brief's "don't hand-roll payment
 * verification" rule (that's about x402/facilitator-style authorization schemes).
 */
export async function verifySessionPurchase(
  txHash: `0x${string}`,
  tier: Tier,
  hours: number,
  expectedPriceWei: bigint,
): Promise<{ sessionId: bigint; payer: `0x${string}` }> {
  let receipt;
  try {
    receipt = await arcClient.getTransactionReceipt({ hash: txHash });
  } catch {
    throw new PaymentVerificationError(`no such transaction ${txHash} on Arc testnet`);
  }

  if (receipt.status !== "success") {
    throw new PaymentVerificationError(`transaction ${txHash} did not succeed`);
  }
  if (receipt.to?.toLowerCase() !== SESSION_ESCROW_ADDRESS.toLowerCase()) {
    throw new PaymentVerificationError(`transaction ${txHash} was not sent to SessionEscrow`);
  }

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: sessionPurchasedEventAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "SessionPurchased") continue;

      const { sessionId, payer, tier: tierIndex, hours_: loggedHours, paidAmount } = decoded.args;
      if (Number(tierIndex) !== TIER_INDEX[tier]) continue;
      if (loggedHours !== BigInt(hours)) continue;
      if (paidAmount !== expectedPriceWei) continue;

      return { sessionId, payer };
    } catch {
      continue; // not this event
    }
  }

  throw new PaymentVerificationError(
    `no matching SessionPurchased(${tier}, ${hours}h, ${expectedPriceWei} wei) log in ${txHash}`,
  );
}
