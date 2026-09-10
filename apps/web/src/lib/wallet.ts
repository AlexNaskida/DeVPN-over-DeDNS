import { createWalletClient, custom } from "viem";
import type { Tier } from "@dvod/session-spec";
import type { EIP1193Provider } from "./eip6963";
import { arcTestnet, purchaseSessionAbi, TIER_INDEX } from "./chain";

/** Adds/switches the wallet to Arc testnet if it isn't already there - most
 * wallets don't have chain 5042002 pre-configured. */
async function ensureArcTestnet(provider: EIP1193Provider): Promise<void> {
  const chainIdHex = `0x${arcTestnet.id.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: arcTestnet.name,
          nativeCurrency: arcTestnet.nativeCurrency,
          rpcUrls: arcTestnet.rpcUrls.default.http,
        },
      ],
    });
  }
}

/**
 * Sends the real `purchaseSession(tier, hours)` transaction with `value` set to
 * the exact quoted price - the actual on-chain payment, signed by the connected
 * wallet. `provider` is the specific EIP-6963 provider the user picked, not a
 * blind `window.ethereum` guess - that's what previously caused "connect wallet"
 * to open whichever extension last overwrote `window.ethereum` (often Phantom)
 * instead of the one the user actually meant. Returns the tx hash once
 * broadcast (not necessarily mined yet).
 */
export async function sendPurchaseTx(
  provider: EIP1193Provider,
  account: `0x${string}`,
  contract: `0x${string}`,
  tier: Tier,
  hours: number,
  valueWei: bigint,
): Promise<`0x${string}`> {
  await ensureArcTestnet(provider);
  const client = createWalletClient({ chain: arcTestnet, transport: custom(provider) });

  return client.writeContract({
    account,
    address: contract,
    abi: purchaseSessionAbi,
    functionName: "purchaseSession",
    args: [TIER_INDEX[tier], BigInt(hours)],
    value: valueWei,
  });
}

/** Parses the orchestrator's `"$0.35"`-style display price into exact wei,
 * matching apps/orchestrator/src/pricing.ts's cents->wei scaling. */
export function usdcPriceToWei(display: string): bigint {
  const dollars = parseFloat(display.replace(/^\$/, ""));
  const cents = Math.round(dollars * 100);
  return BigInt(cents) * 10_000_000_000_000_000n;
}
