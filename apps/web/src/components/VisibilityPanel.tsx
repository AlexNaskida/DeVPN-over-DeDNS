interface Row {
  who: string;
  sees: string;
  status: "real" | "simulated";
}

const ROWS: Row[] = [
  {
    who: "Anyone watching Arc testnet",
    sees: "Your payer address, tier, hours, and amount paid for `purchaseSession` - a public transaction.",
    status: "real",
  },
  {
    who: "The orchestrator (this service)",
    sees: "Session state transitions, which relay you're assigned, and timestamps - stored in Postgres. Not your traffic content.",
    status: "real",
  },
  {
    who: "Anyone reading the ENSv2 registry",
    sees: "Which relay operators are currently authorized and their declared endpoint/tiers - a public capability record.",
    status: "real",
  },
  {
    who: "Your assigned relay operator's process",
    sees: "Your DNS queries and proxied traffic, in the clear, inside its own tunnel-termination process - the confidential-compute claim (traffic invisible even to the relay operator) is not real yet. See the Trust page.",
    status: "simulated",
  },
];

export function VisibilityPanel() {
  return (
    <div>
      <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted-foreground)", marginBottom: 14 }}>
        What's visible to whom
      </h2>
      <div style={{ display: "grid", gap: 10 }}>
        {ROWS.map((row) => (
          <div
            key={row.who}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "14px 18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong style={{ fontSize: 14 }}>{row.who}</strong>
              <span
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: row.status === "real" ? "var(--muted)" : "var(--destructive)",
                  color: row.status === "real" ? "var(--muted-foreground)" : "var(--destructive-foreground)",
                }}
              >
                {row.status}
              </span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>{row.sees}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
