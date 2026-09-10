"use client";

import { useEffect, useState } from "react";
import { getRelays, getRelayAttestation, type RelayInfo, type RelayAttestation } from "@/lib/api";

export default function OperatorsPage() {
  const [relays, setRelays] = useState<RelayInfo[]>([]);
  const [attestations, setAttestations] = useState<Record<string, RelayAttestation>>({});
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

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Operator console</h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 28 }}>
        Relay operators currently registered in the DVoD ENSv2 registry, live.
      </p>

      {error && <p style={{ color: "var(--destructive)" }}>{error}</p>}

      <div style={{ display: "grid", gap: 14 }}>
        {relays.map((relay) => {
          const status = relay.status.toLowerCase();
          const attestation = attestations[relay.operator];
          return (
            <div
              key={relay.operator}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "18px 22px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong>{relay.operator}</strong>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: status === "active" ? "var(--primary)" : "var(--destructive)",
                    textTransform: "uppercase",
                  }}
                >
                  {relay.status}
                </span>
              </div>
              <p style={{ margin: "8px 0", fontSize: 13, color: "var(--muted-foreground)" }}>
                Endpoint: {relay.endpoint || "-"} · Tiers: {relay.tiersSupported.join(", ") || "none"}
              </p>

              {attestation ? (
                <div style={{ fontSize: 12, marginTop: 10, padding: "10px 14px", background: "var(--muted)", borderRadius: "var(--radius)" }}>
                  <div>Hash: <code>{attestation.attestationBuildHash}</code></div>
                  {attestation.simulated && (
                    <div style={{ color: "var(--destructive)", marginTop: 4 }}>
                      SIMULATED - {attestation.reason}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => checkAttestation(relay.operator)}
                  style={{
                    marginTop: 6,
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    padding: "6px 14px",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
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
