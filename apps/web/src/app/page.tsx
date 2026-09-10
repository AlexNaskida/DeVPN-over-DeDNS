import Link from "next/link";
import { HeroPolyhedron } from "@/components/HeroPolyhedron";

const STEPS = [
  {
    title: "Pick a tier, pay once",
    body: "One on-chain USDC payment on Arc for a time-boxed session - never per-packet or per-DNS-query billing.",
  },
  {
    title: "ENSv2 decides who's eligible",
    body: "Only relay operators with an active capability record in the DVoD registry are offered - revoked operators are filtered out before you ever connect.",
  },
  {
    title: "Traffic runs inside the relay's tunnel handler",
    body: "DNS resolution and outbound proxying happen in the relay's own process, addressed by its ENSv2 record.",
  },
  {
    title: "A watchdog can revoke instantly",
    body: "Anyone can submit a mismatched attestation to WatchdogRevoker, which flips a misbehaving operator's status on-chain, permissionlessly.",
  },
  {
    title: "Failover is automatic",
    body: "If your relay goes unreachable mid-session, the orchestrator picks another eligible operator and reopens your tunnel - live, without a new payment.",
  },
];

const FEATURES = [
  {
    icon: <TimerIcon />,
    title: "Time-boxed sessions",
    body: "Pay once for an exact duration. No subscriptions, no lingering access after your session ends.",
  },
  {
    icon: <ShieldIcon />,
    title: "Enforceable, revocable trust",
    body: "A permissionless watchdog contract can revoke a misbehaving relay on-chain - no admin approval needed.",
  },
  {
    icon: <SwapIcon />,
    title: "Automatic failover",
    body: "Lose your relay mid-session and the orchestrator reassigns you to another eligible operator, live.",
  },
  {
    icon: <PulseIcon />,
    title: "Live, streamed state",
    body: "Every transition is a real event, broadcast over WebSocket and backed by an auditable Postgres log.",
  },
];

export default function LandingPage() {
  return (
    <div>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 48,
          alignItems: "center",
          marginBottom: 88,
        }}
      >
        <div className="fade-in-up">
          <div
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: "var(--primary)",
              background: "rgba(46, 125, 107, 0.12)",
              border: "1px solid rgba(46, 125, 107, 0.3)",
              borderRadius: 999,
              padding: "5px 12px",
              marginBottom: 20,
            }}
          >
            Live on Sepolia + Arc testnet
          </div>
          <h1 style={{ fontSize: 40, lineHeight: 1.18, marginBottom: 18, letterSpacing: -0.5 }}>
            Anonymous internet access with{" "}
            <span style={{ color: "var(--primary)" }}>enforceable, revocable</span> permissions.
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 17, maxWidth: 480, marginBottom: 32 }}>
            Pay once in USDC for a time-boxed session. Your traffic tunnels through an
            ENSv2-authorized relay operator - one a permissionless watchdog contract can
            revoke the moment it misbehaves.
          </p>
          <div style={{ display: "flex", gap: 14 }}>
            <Link href="/purchase" style={primaryCta()}>
              Get a session
            </Link>
            <Link href="/operators" style={secondaryCta()}>
              View live operators
            </Link>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <HeroPolyhedron />
          <p
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--muted-foreground)",
              marginTop: -8,
            }}
          >
            Drag to rotate
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 88 }}>
        <SectionLabel>Why DVoD</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="fade-in-up"
              style={{
                animationDelay: `${i * 80}ms`,
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "22px 24px",
              }}
            >
              <div style={{ color: "var(--primary)", marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{f.title}</h3>
              <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 13.5, lineHeight: 1.55 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>How it works</SectionLabel>
        <div style={{ display: "grid", gap: 14 }}>
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              style={{
                display: "flex",
                gap: 18,
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "18px 22px",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--primary-foreground)",
                  background: "var(--primary)",
                }}
              >
                {i + 1}
              </div>
              <div>
                <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{step.title}</h3>
                <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 14 }}>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: "var(--muted-foreground)",
        marginBottom: 20,
      }}
    >
      {children}
    </h2>
  );
}

function primaryCta(): React.CSSProperties {
  return {
    background: "var(--primary)",
    color: "var(--primary-foreground)",
    padding: "12px 24px",
    borderRadius: "var(--radius)",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  };
}

function secondaryCta(): React.CSSProperties {
  return {
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    padding: "12px 24px",
    borderRadius: "var(--radius)",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  };
}

function TimerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2h6" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h13l-3-3M20 16H7l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12h4l2 6 4-12 2 6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
