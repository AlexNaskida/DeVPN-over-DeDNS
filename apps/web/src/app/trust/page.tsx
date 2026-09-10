interface Item {
  claim: string;
  status: "real" | "simulated" | "partial";
  detail: string;
}

const ITEMS: Item[] = [
  {
    claim: "ENSv2 registry + watchdog revocation (Phase 1)",
    status: "real",
    detail:
      "Deployed live on Sepolia. Two operators registered with real capability records; a mismatched attestation was submitted permissionlessly and WatchdogRevoker flipped the operator's status on-chain itself - no admin transaction.",
  },
  {
    claim: "Attestation content being checked",
    status: "simulated",
    detail:
      "Both operators' attestation_build_hash is a documented STUB (keccak256 of a placeholder string) - there's no real relay handler binary to hash yet. The revocation mechanism is real; what it checks against is not.",
  },
  {
    claim: "Arc/x402 session payment (Phase 2)",
    status: "real",
    detail:
      "SessionEscrow.sol deployed live on Arc testnet. A real 1-hour session was purchased for 0.35 USDC; a wrong-amount attempt was rejected on-chain before broadcast.",
  },
  {
    claim: "Confidential compute inside the relay's tunnel handler (Phase 3)",
    status: "simulated",
    detail:
      "Verified directly against Chainlink's own docs: CRE workflows are event-driven and stateless and cannot run a persistent tunnel-termination/DNS/proxy server. The tunnel server is a real, working HTTP CONNECT proxy - genuinely resolving DNS and proxying traffic - but it runs as a plain process with a visible SIMULATED badge, not inside CRE's confidential compute.",
  },
  {
    claim: "Chainlink CRE attestation-refresher workflow",
    status: "real",
    detail:
      "A real CRE workflow, compiled to WASM and executed via the actual CRE CLI, read live Sepolia state, produced a DON-signed report, and wrote it through the real KeystoneForwarder on-chain - confirmed independently afterward, not just trusted from the CLI's own output.",
  },
  {
    claim: "Orchestrator session state machine + live dashboard (Phase 4)",
    status: "real",
    detail:
      "Every transition is a Postgres row, validated against the real transition table before being written. WS /stream broadcasts each transition live; the forced-failover demo (this site's session page) drives an actual different relay assignment, not a scripted animation.",
  },
];

const STATUS_COLOR: Record<Item["status"], string> = {
  real: "var(--primary)",
  simulated: "var(--destructive)",
  partial: "var(--accent)",
};

export default function TrustPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>What's real vs. simulated</h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 32, maxWidth: 640 }}>
        This project is built to be honest about which claims are genuinely live on-chain or
        executing for real, and which are documented simplifications. Full detail in each
        phase's docs, linked from the{" "}
        <a href="https://github.com/AlexNaskida/DeVPN-over-DeDNS#build-phases" target="_blank" rel="noreferrer">
          repository README
        </a>
        .
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {ITEMS.map((item) => (
          <div
            key={item.claim}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "18px 22px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
              <strong style={{ fontSize: 15 }}>{item.claim}</strong>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: STATUS_COLOR[item.status],
                  whiteSpace: "nowrap",
                }}
              >
                {item.status}
              </span>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
