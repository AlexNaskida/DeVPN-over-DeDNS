interface Row {
  who: string;
  sees: string;
}

const ROWS: Row[] = [
  {
    who: "Anyone watching Arc testnet",
    sees: "Your payer address, tier, hours, and amount paid for `purchaseSession` - a public transaction.",
  },
  {
    who: "The orchestrator (this service)",
    sees: "Session state transitions, which relay you're assigned, and timestamps - stored in Postgres. Not your traffic content.",
  },
  {
    who: "Anyone reading the ENSv2 registry",
    sees: "Which relay operators are currently authorized and their declared endpoint/tiers - a public capability record.",
  },
  {
    who: "Your assigned relay operator's process",
    sees: "Your DNS queries and proxied traffic pass through this process in the clear - the operator's own machine can read it. Full confidential-compute isolation, where even the operator can't see it, isn't implemented yet.",
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
            <strong style={{ fontSize: 14 }}>{row.who}</strong>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>{row.sees}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
