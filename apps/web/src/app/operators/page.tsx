"use client";

import { useEffect, useState } from "react";
import { getRelays, getRelayAttestation, type RelayInfo, type RelayAttestation } from "@/lib/api";

function truncateHash(hash: string): string {
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export default function OperatorsPage() {
  const [relays, setRelays] = useState<RelayInfo[]>([]);
  const [attestations, setAttestations] = useState<Record<string, RelayAttestation>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRelays()
      .then(setRelays)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function checkAttestation(operator: string) {
    try {
      const attestation = await getRelayAttestation(operator);
      setAttestations((prev) => ({ ...prev, [operator]: attestation }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function copyHash(hash: string) {
    await navigator.clipboard.writeText(hash);
    setCopied(hash);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Operator console</h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 32 }}>
        Relay operators currently registered in the DVoD ENSv2 registry, live.
      </p>

      {error && <p style={{ color: "var(--destructive)" }}>{error}</p>}

      <div style={{ display: "grid", gap: 14 }}>
        {relays.map((relay) => {
          const status = relay.status.toLowerCase();
          const active = status === "active";
          const attestation = attestations[relay.operator];
          return (
            <div
              key={relay.operator}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 15 }}>{relay.operator}</strong>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    borderRadius: 999,
                    color: active ? "var(--primary)" : "var(--destructive)",
                    background: active ? "rgba(46, 125, 107, 0.12)" : "rgba(192, 71, 63, 0.12)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: active ? "var(--primary)" : "var(--destructive)",
                    }}
                  />
                  {relay.status}
                </span>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
                {relay.endpoint || "no endpoint declared"}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
                Tiers: {relay.tiersSupported.join(", ") || "none"}
              </p>

              {attestation ? (
                <button
                  onClick={() => copyHash(attestation.attestationBuildHash)}
                  title={attestation.attestationBuildHash}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 14,
                    padding: "8px 14px",
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                    color: "var(--foreground)",
                  }}
                >
                  <CheckIcon />
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Attestation</span>
                  <code style={{ fontSize: 12 }}>{truncateHash(attestation.attestationBuildHash)}</code>
                  <span style={{ fontSize: 11, color: "var(--primary)" }}>
                    {copied === attestation.attestationBuildHash ? "Copied" : "Copy"}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => checkAttestation(relay.operator)}
                  style={{
                    marginTop: 14,
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    padding: "8px 16px",
                    borderRadius: "var(--radius)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Check attestation
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.4">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
