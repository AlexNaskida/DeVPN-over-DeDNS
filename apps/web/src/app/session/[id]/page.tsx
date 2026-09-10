"use client";

import { use, useEffect, useState } from "react";
import { getSessionDetail, forceRelayFailure, type SessionDetail, type SessionEvent } from "@/lib/api";
import { useSessionStream } from "@/lib/useSessionStream";
import { StateBadge } from "@/components/StateBadge";
import { VisibilityPanel } from "@/components/VisibilityPanel";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failoverBusy, setFailoverBusy] = useState(false);
  const liveEvents = useSessionStream(id);

  useEffect(() => {
    getSessionDetail(id)
      .then(setDetail)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  // Merge the initial GET /sessions/:id snapshot with anything the live WS stream
  // has pushed since - by event id, so a reconnect or refresh never double-counts.
  const seenIds = new Set(detail?.events.map((e) => e.id) ?? []);
  const newLiveEvents = liveEvents.filter((e) => !seenIds.has(e.id));
  const allEvents: SessionEvent[] = [...(detail?.events ?? []), ...newLiveEvents];
  const currentState = allEvents.at(-1)?.toState ?? detail?.state ?? "unknown";
  const currentRelay = [...allEvents].reverse().find((e) => e.relay)?.relay ?? detail?.relay;

  async function handleForceFailure() {
    setFailoverBusy(true);
    setError(null);
    try {
      await forceRelayFailure(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFailoverBusy(false);
    }
  }

  if (error && !detail) {
    return <p style={{ color: "var(--destructive)" }}>{error}</p>;
  }
  if (!detail) {
    return <p style={{ color: "var(--muted-foreground)" }}>Loading session {id}...</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Session {id}</h1>
        <StateBadge state={currentState} />
      </div>
      <p style={{ color: "var(--muted-foreground)", marginBottom: 32, fontSize: 14 }}>
        Relay: {currentRelay ?? "unassigned"}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 40 }}>
        <div>
          <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted-foreground)", marginBottom: 14 }}>
            Live event log
          </h2>
          <div style={{ display: "grid", gap: 8 }}>
            {allEvents.map((ev) => (
              <div
                key={ev.id}
                style={{
                  fontSize: 13,
                  padding: "10px 14px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    {ev.fromState ?? "-"} → <strong>{ev.toState}</strong>
                  </span>
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {new Date(ev.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                {ev.detail && (
                  <div style={{ color: "var(--muted-foreground)", marginTop: 4 }}>{ev.detail}</div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleForceFailure}
            disabled={failoverBusy || currentState !== "ACTIVE"}
            title="Demo control per brief §9.3 - a real deployment triggers this from the watchdog contract or a connectivity check, not a button anyone can click."
            style={{
              marginTop: 20,
              background: "transparent",
              color: "var(--destructive)",
              border: "1px solid var(--destructive)",
              padding: "10px 18px",
              borderRadius: "var(--radius)",
              cursor: currentState === "ACTIVE" ? "pointer" : "not-allowed",
              opacity: currentState === "ACTIVE" ? 1 : 0.4,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {failoverBusy ? "Forcing failover..." : "Force relay failure (demo)"}
          </button>
          {error && <p style={{ color: "var(--destructive)", marginTop: 12, fontSize: 13 }}>{error}</p>}
        </div>

        <VisibilityPanel />
      </div>
    </div>
  );
}
