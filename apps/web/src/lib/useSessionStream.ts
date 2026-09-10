"use client";

import { useEffect, useState } from "react";
import { ORCHESTRATOR_WS_URL } from "./api";
import type { SessionEvent } from "./api";

interface SessionTransitionMessage extends SessionEvent {
  type: "session_transition";
}

/** Subscribes to the real `WS /stream` (apps/orchestrator/src/routes/stream.ts)
 * and returns just the transitions for one session, live, in arrival order. */
export function useSessionStream(sessionId: string): SessionEvent[] {
  const [events, setEvents] = useState<SessionEvent[]>([]);

  useEffect(() => {
    const socket = new WebSocket(ORCHESTRATOR_WS_URL);
    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data as string) as SessionTransitionMessage;
      if (data.type !== "session_transition" || data.sessionId !== sessionId) return;
      setEvents((prev) => [...prev, data]);
    };
    return () => socket.close();
  }, [sessionId]);

  return events;
}
