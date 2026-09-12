"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  getSessionDetail,
  endSession,
  macOsConnectUrl,
  type SessionDetail,
  type SessionEvent,
} from "@/lib/api";
import { useSessionStream } from "@/lib/useSessionStream";
import { StateBadge } from "@/components/StateBadge";
import { VisibilityPanel } from "@/components/VisibilityPanel";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RelaySequenceTimeline } from "@/components/RelaySequenceTimeline";

const TERMINAL_STATES = new Set(["EXPIRED_NORMAL", "RELAY_REVOKED", "SESSION_COMPLETE"]);
const READY_STATES = new Set(["ACTIVE", "RELAY_UNREACHABLE", "FAILOVER_SELECT"]);

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [endBusy, setEndBusy] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
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
  const isTerminal = TERMINAL_STATES.has(currentState);
  const isReady = READY_STATES.has(currentState);

  // Read after mount, not during render - sessionStorage doesn't exist during SSR,
  // and reading it inline would mismatch the server-rendered HTML.
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  useEffect(() => {
    setSessionToken(sessionStorage.getItem(`dvod-session-token-${id}`));
  }, [id]);

  async function handleEndSession() {
    setEndBusy(true);
    setError(null);
    try {
      await endSession(id);
      setShowEndConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setEndBusy(false);
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
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <BackLink />

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "26px 28px",
          marginBottom: 24,
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
          <CountdownTimer expiresAt={detail.expiresAt} ended={isTerminal} />
          <StateBadge state={currentState} />
          {currentState === "ACTIVE" && (
            <button
              onClick={() => setShowEndConfirm(true)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
                padding: "8px 14px",
                borderRadius: "var(--radius)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              End session
            </button>
          )}
        </div>
      </div>

      {showEndConfirm && (
        <ConfirmDialog
          title="End this session?"
          body="This ends your session now. Any unused time on this purchase isn't refunded - there's no partial-refund mechanism."
          confirmLabel="End session"
          busy={endBusy}
          onConfirm={handleEndSession}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px 28px",
          marginBottom: 24,
        }}
      >
        <RelaySequenceTimeline currentState={currentState} />

        {isTerminal ? (
          <p style={{ marginTop: 22, marginBottom: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
            This session has ended.
          </p>
        ) : isReady && sessionToken ? (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--muted-foreground)" }}>
              Your session is ready - everything from here happens in the app.
            </p>
            <a
              href={macOsConnectUrl(sessionToken)}
              title="Opens the DVoD macOS app - see docs/SECURITY.md for what this actually connects to today."
              style={{
                display: "inline-block",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                textDecoration: "none",
                padding: "12px 24px",
                borderRadius: "var(--radius)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Open the DVoD app
            </a>
          </div>
        ) : (
          <p style={{ marginTop: 22, marginBottom: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
            Setting up your session...
          </p>
        )}
        {error && <p style={{ color: "var(--destructive)", marginTop: 16, fontSize: 13 }}>{error}</p>}
      </div>

      <VisibilityPanel />
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
