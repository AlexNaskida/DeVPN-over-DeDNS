"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getSessionDetail, forceRelayFailure, type SessionDetail, type SessionEvent } from "@/lib/api";
import { useSessionStream } from "@/lib/useSessionStream";
import { StateBadge, STATE_COLOR } from "@/components/StateBadge";
import { VisibilityPanel } from "@/components/VisibilityPanel";
import { CountdownTimer } from "@/components/CountdownTimer";

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
  const currentTier = [...allEvents].reverse().find((e) => e.tier)?.tier;

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
    return (
      <div>
        <BackLink />
        <p style={{ color: "var(--destructive)" }}>{error}</p>
      </div>
    );
  }
  if (!detail) {
    return (
      <div>
        <BackLink />
        <p style={{ color: "var(--muted-foreground)" }}>Loading session {id}...</p>
      </div>
    );
  }

  return (
    <div>
      <BackLink />

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "26px 28px",
          marginBottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 24, margin: 0 }}>Session {id}</h1>
            {currentTier && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
              >
                {currentTier}
              </span>
            )}
          </div>
          <p style={{ color: "var(--muted-foreground)", margin: 0, fontSize: 14 }}>
            Relay: <strong style={{ color: "var(--foreground)" }}>{currentRelay ?? "unassigned"}</strong>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <CountdownTimer expiresAt={detail.expiresAt} />
          <StateBadge state={currentState} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 32 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h2
              style={{
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "var(--muted-foreground)",
                margin: 0,
              }}
            >
              Live event log
            </h2>
            <button
              onClick={handleForceFailure}
              disabled={failoverBusy || currentState !== "ACTIVE"}
              title="Demo control per brief §9.3 - a real deployment triggers this from the watchdog contract or a connectivity check, not a button anyone can click."
              style={{
                background: "transparent",
                color: "var(--destructive)",
                border: "1px solid var(--destructive)",
                padding: "6px 14px",
                borderRadius: "var(--radius)",
                cursor: currentState === "ACTIVE" ? "pointer" : "not-allowed",
                opacity: currentState === "ACTIVE" ? 1 : 0.4,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {failoverBusy ? "Forcing failover..." : "Force relay failure (demo)"}
            </button>
          </div>

          <EventTimeline events={allEvents} />
          {error && <p style={{ color: "var(--destructive)", marginTop: 12, fontSize: 13 }}>{error}</p>}
        </div>

        <VisibilityPanel />
      </div>
    </div>
  );
}

function EventTimeline({ events }: { events: SessionEvent[] }) {
  return (
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 1, background: "var(--border)" }} />
      <div style={{ display: "grid", gap: 4 }}>
        {events.map((ev, i) => {
          const color = STATE_COLOR[ev.toState] ?? "var(--muted-foreground)";
          const isLast = i === events.length - 1;
          return (
            <div key={ev.id} style={{ position: "relative", paddingBottom: 16 }}>
              <span
                style={{
                  position: "absolute",
                  left: -22,
                  top: 5,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: isLast ? color : "var(--card)",
                  border: `2px solid ${color}`,
                }}
              />
              <div
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
                    {ev.fromState ?? "start"} <span style={{ color: "var(--muted-foreground)" }}>→</span>{" "}
                    <strong style={{ color }}>{ev.toState}</strong>
                  </span>
                  <span style={{ color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                    {new Date(ev.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                {ev.detail && (
                  <div style={{ color: "var(--muted-foreground)", marginTop: 4 }}>{ev.detail}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/account"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--muted-foreground)",
        fontSize: 13,
        textDecoration: "none",
        marginBottom: 20,
      }}
    >
      ← Back to account
    </Link>
  );
}
