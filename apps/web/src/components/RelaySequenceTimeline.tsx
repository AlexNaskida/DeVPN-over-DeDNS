const STEPS = [
  { key: "PAID", label: "Paid" },
  { key: "TOKEN_ISSUED", label: "Authorized" },
  { key: "TUNNEL_OPEN", label: "Tunnel ready" },
  { key: "ACTIVE", label: "Active" },
] as const;

const ORDER: string[] = STEPS.map((s) => s.key);
const TERMINAL_STATES = new Set(["EXPIRED_NORMAL", "RELAY_REVOKED", "SESSION_COMPLETE"]);
const RECONNECTING_STATES = new Set(["RELAY_UNREACHABLE", "FAILOVER_SELECT"]);

type StepStatus = "done" | "current" | "pending";

function stepStatuses(currentState: string): StepStatus[] {
  if (currentState === "ACTIVE" || TERMINAL_STATES.has(currentState)) {
    return ORDER.map(() => "done");
  }
  if (RECONNECTING_STATES.has(currentState)) {
    // Mid-failover: everything up to the tunnel stays done, "Active" pulses
    // again while a new relay is picked - no separate 5th step, stays simple.
    return ORDER.map((_, i) => (i < ORDER.length - 1 ? "done" : "current"));
  }
  const index = ORDER.indexOf(currentState);
  if (index === -1) return ORDER.map(() => "pending");
  return ORDER.map((_, i) => (i < index ? "done" : i === index ? "current" : "pending"));
}

/** A simple, at-a-glance "how far along is this session" strip - each step
 * turns solid with a checkmark once it's done, the current one pulses, the
 * rest stay outlined. Deliberately not the full timestamped event log (that
 * granularity now belongs in the app once a session is running). */
export function RelaySequenceTimeline({ currentState }: { currentState: string }) {
  const statuses = stepStatuses(currentState);
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {STEPS.map((step, i) => {
        const status = statuses[i];
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "flex-start", flex: isLast ? "0 0 auto" : 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: isLast ? "auto" : undefined }}>
              <StepDot status={status} />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  color: status === "pending" ? "var(--muted-foreground)" : "var(--foreground)",
                }}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  marginTop: 14,
                  marginLeft: 6,
                  marginRight: 6,
                  borderRadius: 2,
                  background: status === "done" ? "var(--primary)" : "var(--border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepDot({ status }: { status: StepStatus }) {
  const size = 28;
  if (status === "done") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12.5L9.5 18L20 6.5"
            stroke="var(--primary-foreground)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }
  if (status === "current") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "2px solid var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div className="dvod-step-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--primary)" }} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid var(--border)",
        flexShrink: 0,
      }}
    />
  );
}
