"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPublicClient, http } from "viem";
import type { Tier } from "@dvod/session-spec";
import { getTiers, quoteSession, confirmSession, type TierInfo } from "@/lib/api";
import { sendPurchaseTx, usdcPriceToWei } from "@/lib/wallet";
import { arcTestnet } from "@/lib/chain";
import { useWallet } from "@/lib/WalletContext";
import { recordSessionPurchase } from "@/lib/sessionHistory";

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

type Step = "idle" | "quoting" | "paying" | "confirming" | "done";

export default function PurchasePage() {
  const router = useRouter();
  const { account, connectedProvider, openModal } = useWallet();
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [selectedTier, setSelectedTier] = useState<Tier>("standard");
  const [hours, setHours] = useState(1);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    getTiers()
      .then(setTiers)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function handleBuy() {
    if (!account || !connectedProvider) return;
    setError(null);
    try {
      setStep("quoting");
      const quote = await quoteSession(selectedTier, hours);

      setStep("paying");
      const hash = await sendPurchaseTx(
        connectedProvider.provider,
        account,
        quote.extra.contract,
        selectedTier,
        hours,
        usdcPriceToWei(quote.price),
      );
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });

      setStep("confirming");
      const result = await confirmSession(selectedTier, hours, hash);
      sessionStorage.setItem(`dvod-session-token-${result.sessionId}`, result.token);
      recordSessionPurchase({
        sessionId: result.sessionId,
        tier: result.tier,
        hours: result.hours,
        relay: result.relay,
        txHash: result.txHash,
        purchasedAt: Math.floor(Date.now() / 1000),
        expiresAt: result.expiresAt,
      });

      setStep("done");
      router.push(`/session/${result.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("idle");
    }
  }

  const selected = tiers.find((t) => t.tier === selectedTier);
  const busy = step !== "idle" && step !== "done";

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Get a session</h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 28 }}>
        One on-chain USDC payment on Arc testnet for a time-boxed session.
      </p>

      <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
        {tiers.map((t) => (
          <button
            key={t.tier}
            onClick={() => setSelectedTier(t.tier)}
            disabled={t.eligibleRelayCount === 0}
            style={{
              textAlign: "left",
              padding: "16px 20px",
              borderRadius: "var(--radius)",
              border: selectedTier === t.tier ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              cursor: t.eligibleRelayCount === 0 ? "not-allowed" : "pointer",
              opacity: t.eligibleRelayCount === 0 ? 0.5 : 1,
              transition: "border-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
              <span style={{ textTransform: "capitalize" }}>{t.tier}</span>
              <span>${t.pricePerHourUsdc}/hr</span>
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>
              {t.reservedMbps} Mbps reserved · {t.eligibleRelayCount} relay
              {t.eligibleRelayCount === 1 ? "" : "s"} eligible
            </div>
          </button>
        ))}
      </div>

      <label style={{ display: "block", marginBottom: 24, fontSize: 14 }}>
        Hours
        <input
          type="number"
          min={1}
          max={24}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          style={{
            display: "block",
            marginTop: 6,
            width: 100,
            padding: "8px 10px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--muted)",
            color: "var(--foreground)",
          }}
        />
      </label>

      {selected && (
        <p style={{ color: "var(--muted-foreground)", marginBottom: 24 }}>
          Total: <strong style={{ color: "var(--foreground)" }}>
            ${(parseFloat(selected.pricePerHourUsdc) * hours).toFixed(2)}
          </strong>{" "}
          USDC on Arc testnet
        </p>
      )}

      {!account ? (
        <button onClick={openModal} style={buttonStyle()}>
          Connect wallet
        </button>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12 }}>
            Connected: {account}
          </p>
          <button onClick={handleBuy} disabled={busy || !selected} style={buttonStyle()}>
            {step === "idle" && "Buy session"}
            {step === "quoting" && "Getting quote..."}
            {step === "paying" && "Confirm in wallet..."}
            {step === "confirming" && "Verifying payment..."}
            {step === "done" && "Done"}
          </button>
        </div>
      )}

      {txHash && <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 16 }}>tx: {txHash}</p>}
      {error && <p style={{ color: "var(--destructive)", marginTop: 16, fontSize: 14 }}>{error}</p>}
    </div>
  );
}

function buttonStyle(): React.CSSProperties {
  return {
    background: "var(--primary)",
    color: "var(--primary-foreground)",
    padding: "12px 24px",
    borderRadius: "var(--radius)",
    border: "none",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  };
}
