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
import { SkeletonCard } from "@/components/SkeletonCard";
import { HoursSlider } from "@/components/HoursSlider";

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

type Step = "idle" | "quoting" | "paying" | "confirming" | "done";

/** Never show a raw viem/wallet error dump (full ABI-decoded call, docs link, request
 * args, etc.) - a rejected transaction is an expected user action, not a bug.
 * viem wraps the wallet's actual rejection inside nested `.cause`s rather than the
 * top-level message/shortMessage, so this walks the whole chain rather than just
 * checking the outermost error. */
function isUserRejection(e: unknown, depth = 0): boolean {
  if (!e || depth > 6) return false;
  const err = e as { code?: number; message?: string; cause?: unknown };
  if (err.code === 4001) return true;
  if (typeof err.message === "string" && /user rejected|user denied/i.test(err.message)) return true;
  return isUserRejection(err.cause, depth + 1);
}

function friendlyError(e: unknown): string {
  if (isUserRejection(e)) return "Transaction cancelled.";
  const shortMessage = (e as { shortMessage?: string } | undefined)?.shortMessage;
  return shortMessage ?? (e instanceof Error ? e.message : String(e));
}

export default function PurchasePage() {
  const router = useRouter();
  const { account, connectedProvider, openModal } = useWallet();
  const [tiers, setTiers] = useState<TierInfo[] | null>(null);
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
      setError(friendlyError(e));
      setStep("idle");
    }
  }

  const selected = tiers?.find((t) => t.tier === selectedTier);
  const busy = step !== "idle" && step !== "done";
  const hourlyRate = selected ? parseFloat(selected.pricePerHourUsdc) : 0;
  const total = hourlyRate * hours;

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Get a session</h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: 15, marginBottom: 36 }}>
        One on-chain USDC payment on Arc testnet for a time-boxed session.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 40, alignItems: "start" }}>
        <div>
          <h2 style={sectionLabel()}>Choose a tier</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 36 }}>
            {tiers === null
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)
              : tiers.map((t) => {
                  const disabled = t.eligibleRelayCount === 0;
                  const isSelected = selectedTier === t.tier;
                  return (
                    <button
                      key={t.tier}
                      onClick={() => setSelectedTier(t.tier)}
                      disabled={disabled}
                      style={{
                        textAlign: "left",
                        padding: "18px 18px",
                        borderRadius: "var(--radius)",
                        border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: isSelected ? "rgba(232, 163, 61, 0.06)" : "var(--card)",
                        color: "var(--foreground)",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.5 : 1,
                        transition: "border-color 0.15s ease, background 0.15s ease",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize", marginBottom: 4 }}>
                        {t.tier}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
                        ${t.pricePerHourUsdc}
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)" }}>/hr</span>
                      </div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: 12.5, lineHeight: 1.5 }}>
                        {t.reservedMbps} Mbps reserved
                        <br />
                        {t.eligibleRelayCount} relay{t.eligibleRelayCount === 1 ? "" : "s"} eligible
                      </div>
                    </button>
                  );
                })}
          </div>

          <h2 style={sectionLabel()}>Duration</h2>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "20px 22px",
            }}
          >
            <HoursSlider hours={hours} onChange={setHours} />
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            top: 88,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "24px 26px",
          }}
        >
          <h2 style={sectionLabel()}>Order summary</h2>

          {selected ? (
            <div style={{ display: "grid", gap: 8, fontSize: 14, marginBottom: 18 }}>
              <Row label="Tier" value={<span style={{ textTransform: "capitalize" }}>{selected.tier}</span>} />
              <Row label="Rate" value={`$${selected.pricePerHourUsdc}/hr`} />
              <Row label="Duration" value={`${hours} hour${hours === 1 ? "" : "s"}`} />
              <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
              <Row
                label="Total"
                value={
                  <span style={{ fontSize: 20, fontWeight: 700 }}>
                    ${total.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)" }}>USDC</span>
                  </span>
                }
              />
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
              <div className="skeleton" style={{ height: 14, width: "100%" }} />
              <div className="skeleton" style={{ height: 14, width: "80%" }} />
              <div className="skeleton" style={{ height: 22, width: "60%", marginTop: 6 }} />
            </div>
          )}

          {!account ? (
            <button onClick={openModal} style={buttonStyle()}>
              Connect wallet
            </button>
          ) : (
            <div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  marginBottom: 12,
                  wordBreak: "break-all",
                }}
              >
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

          {txHash && (
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 14, wordBreak: "break-all" }}>
              tx: {txHash}
            </p>
          )}
          {error && <p style={{ color: "var(--destructive)", marginTop: 14, fontSize: 13 }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "var(--muted-foreground)",
    marginBottom: 14,
  };
}

function buttonStyle(): React.CSSProperties {
  return {
    width: "100%",
    background: "var(--primary)",
    color: "var(--primary-foreground)",
    padding: "13px 24px",
    borderRadius: "var(--radius)",
    border: "none",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  };
}
