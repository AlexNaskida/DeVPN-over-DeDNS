"use client";

import { useWallet } from "@/lib/WalletContext";

export function WalletModal() {
  const { providers, isModalOpen, closeModal, connect, connecting } = useWallet();

  if (!isModalOpen) return null;

  return (
    <div
      onClick={closeModal}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 24,
          width: 340,
          maxWidth: "90vw",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Connect a wallet</h2>
          <button
            onClick={closeModal}
            aria-label="Close"
            style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 18 }}
          >
            ×
          </button>
        </div>

        {providers.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            No wallet extensions detected in this browser. Install one (e.g. MetaMask) and reload this page.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {providers.map((p) => (
              <button
                key={p.info.uuid}
                onClick={() => connect(p.info.uuid)}
                disabled={connecting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--muted)",
                  color: "var(--foreground)",
                  cursor: connecting ? "wait" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "left",
                }}
              >
                {/* Icon is a data: URI the wallet itself provides via EIP-6963. */}
                <img src={p.info.icon} alt="" width={24} height={24} style={{ borderRadius: 6 }} />
                {p.info.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
