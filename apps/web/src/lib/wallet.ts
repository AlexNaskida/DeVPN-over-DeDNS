import { createWalletClient, custom } from "viem";
import type { Tier } from "@dvod/session-spec";
import { arcTestnet, purchaseSessionAbi, TIER_INDEX } from "./chain";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export class NoWalletError extends Error {
  constructor() {
    super("No browser wallet found. Install MetaMask or another EIP-1193 wallet.");
  }
}

function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) throw new NoWalletError();
  return window.ethereum;
}

export async function connectWallet(): Promise<`0x${string}`> {
  const provider = getProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts[0];
  if (!account) throw new Error("wallet returned no accounts");
  return account as `0x${string}`;
}

/** Adds/switches the wallet to Arc testnet if it isn't already there - most
 * wallets don't have chain 5042002 pre-configured. */
async function ensureArcTestnet(): Promise<void> {
  const provider = getProvider();
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
 * wallet. Returns the tx hash once broadcast (not necessarily mined yet); callers
 * should wait for a receipt before calling the orchestrator's confirm step.
 */
export async function sendPurchaseTx(
  account: `0x${string}`,
  contract: `0x${string}`,
  tier: Tier,
  hours: number,
  valueWei: bigint,
): Promise<`0x${string}`> {
  await ensureArcTestnet();
  const provider = getProvider();
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
