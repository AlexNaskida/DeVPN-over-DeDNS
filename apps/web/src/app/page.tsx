import Link from "next/link";

const STEPS = [
  {
    title: "1. Pick a tier, pay once",
    body: "One on-chain USDC payment on Arc for a time-boxed session - never per-packet or per-DNS-query billing.",
  },
  {
    title: "2. ENSv2 decides who's eligible",
    body: "Only relay operators with an active capability record in the DVoD ENSv2 registry are offered - revoked operators are filtered out before you ever connect.",
  },
  {
    title: "3. Traffic runs inside the relay's tunnel handler",
    body: "DNS resolution and outbound proxying happen in the relay's own tunnel-termination process, addressed by its ENSv2 record - not visible to your ISP or the destination site.",
  },
  {
    title: "4. A watchdog can revoke instantly",
    body: "Anyone can submit a mismatched attestation to WatchdogRevoker, which flips a misbehaving operator's status on-chain, permissionlessly - no admin required.",
  },
  {
    title: "5. Failover is automatic",
    body: "If your relay goes unreachable mid-session, the orchestrator picks another eligible operator and reopens your tunnel - live, without a new payment.",
  },
];

export default function LandingPage() {
  return (
    <div>
      <section style={{ marginBottom: 56 }}>
        <h1 style={{ fontSize: 34, lineHeight: 1.25, marginBottom: 16 }}>
          Anonymous internet access with{" "}
          <span style={{ color: "var(--primary)" }}>enforceable, revocable</span> permissions.
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 17, maxWidth: 640 }}>
          Pay once in USDC for a time-boxed session. Your traffic tunnels through an ENSv2-authorized
          relay operator - one a permissionless watchdog contract can revoke the moment it
          misbehaves.
        </p>
        <div style={{ marginTop: 28, display: "flex", gap: 16 }}>
          <Link
            href="/purchase"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              padding: "12px 24px",
              borderRadius: "var(--radius)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Get a session
          </Link>
          <Link
            href="/trust"
            style={{
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              padding: "12px 24px",
              borderRadius: "var(--radius)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            What's real vs. simulated
          </Link>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted-foreground)", marginBottom: 20 }}>
          How it works
        </h2>
        <div style={{ display: "grid", gap: 16 }}>
          {STEPS.map((step) => (
            <div
              key={step.title}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "18px 22px",
              }}
            >
              <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{step.title}</h3>
              <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 14 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
