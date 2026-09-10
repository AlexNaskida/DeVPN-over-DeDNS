"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/WalletContext";
import { getSessionHistory, type SessionHistoryEntry } from "@/lib/sessionHistory";
import { CountdownTimer } from "@/components/CountdownTimer";

export default function AccountPage() {
  const { account, connectedProvider, openModal, disconnect } = useWallet();
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getSessionHistory());
  }, []);

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 26, marginBottom: 28 }}>Account</h1>

      <section
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "22px 24px",
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted-foreground)", marginBottom: 16 }}>
          Wallet
        </h2>

        {!account ? (
          <div>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 14 }}>
              No wallet connected.
            </p>
            <button
              onClick={openModal}
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "var(--radius)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Connect wallet
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {connectedProvider?.info.icon && (
                  <img src={connectedProvider.info.icon} alt="" width={18} height={18} style={{ borderRadius: 4 }} />
                )}
                <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  {connectedProvider?.info.name ?? "Wallet"}
                </span>
              </div>
              <code style={{ fontSize: 14 }}>{account}</code>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={openModal} style={secondaryButtonStyle()}>
                Switch
              </button>
              <button onClick={disconnect} style={{ ...secondaryButtonStyle(), color: "var(--destructive)" }}>
                Disconnect
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted-foreground)", marginBottom: 16 }}>
          Sessions from this browser
        </h2>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
          There's no server-side account system - sessions are identified on-chain by
          payer address, so this list is just what you've purchased from this browser.
        </p>

        {history.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
            No sessions yet.{" "}
            <Link href="/purchase" style={{ color: "var(--primary)" }}>
              Get one
            </Link>
            .
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {history.map((entry) => (
              <Link
                key={entry.sessionId}
                href={`/session/${entry.sessionId}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  textDecoration: "none",
                  color: "var(--foreground)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>
                    Session {entry.sessionId} · {entry.tier}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                    {entry.hours}h via {entry.relay}
                  </div>
                </div>
                <CountdownTimer expiresAt={new Date(entry.expiresAt * 1000).toISOString()} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    padding: "8px 14px",
    borderRadius: "var(--radius)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}
