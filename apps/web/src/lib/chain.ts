import { defineChain } from "viem";
import type { Tier } from "@dvod/session-spec";

/** Mirrors apps/orchestrator/src/arc-client.ts's chain definition exactly -
 * must agree, since the orchestrator verifies the tx against this same chain. */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
});

export const TIER_INDEX: Record<Tier, number> = { lite: 0, standard: 1, turbo: 2 };

/** Just the one function the browser needs to call - contracts/arc/src/SessionEscrow.sol. */
export const purchaseSessionAbi = [
  {
    type: "function",
    name: "purchaseSession",
    stateMutability: "payable",
    inputs: [
      { name: "tier", type: "uint8" },
      { name: "hours_", type: "uint256" },
    ],
    outputs: [{ name: "sessionId", type: "uint256" }],
  },
] as const;
