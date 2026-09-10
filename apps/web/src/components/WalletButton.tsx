"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/WalletContext";

function truncate(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { account, connectedProvider, openModal, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!account) {
    return (
      <button
        onClick={openModal}
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          border: "none",
          padding: "9px 18px",
          borderRadius: "var(--radius)",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Connect wallet
      </button>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--muted)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
          padding: "7px 14px",
          borderRadius: "var(--radius)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {connectedProvider?.info.icon && (
          <img src={connectedProvider.info.icon} alt="" width={16} height={16} style={{ borderRadius: 4 }} />
        )}
        {truncate(account)}
      </button>

      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              minWidth: 160,
              zIndex: 20,
              overflow: "hidden",
            }}
          >
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              style={{ display: "block", padding: "10px 14px", fontSize: 13, color: "var(--foreground)", textDecoration: "none" }}
            >
              Account
            </Link>
            <button
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--destructive)",
                background: "none",
                border: "none",
                borderTop: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
