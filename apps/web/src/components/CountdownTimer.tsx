"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** The one place --accent is used per packages/ui/src/tokens.ts's reserved-use
 * list ("live-session-countdown") - nowhere else in the app should reach for it. */
export function CountdownTimer({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return null;

  const remainingMs = new Date(expiresAt).getTime() - now;
  const expired = remainingMs <= 0;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 8,
        padding: "8px 16px",
        borderRadius: "var(--radius)",
        border: `1px solid ${expired ? "var(--border)" : "var(--accent)"}`,
        background: expired ? "var(--muted)" : "rgba(232, 163, 61, 0.08)",
      }}
    >
      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)" }}>
        {expired ? "Session" : "Time remaining"}
      </span>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          fontSize: 15,
          color: expired ? "var(--muted-foreground)" : "var(--accent)",
        }}
      >
        {formatRemaining(remainingMs)}
      </span>
    </div>
  );
}
