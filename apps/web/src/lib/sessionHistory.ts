import type { Tier } from "@dvod/session-spec";

const KEY = "dvod-session-history";

export interface SessionHistoryEntry {
  sessionId: string;
  tier: Tier;
  hours: number;
  relay: string;
  txHash: string;
  purchasedAt: number; // unix seconds
  expiresAt: number; // unix seconds
}

/**
 * There's no server-side "my sessions" endpoint - a session's only real identity
 * is the on-chain payer address, and the orchestrator doesn't index by payer (see
 * apps/orchestrator/src/config.ts's note on ENSv2 not being cheaply enumerable
 * either). So this is honestly scoped: sessions purchased from this browser, kept
 * in localStorage, not a real account system.
 */
export function recordSessionPurchase(entry: SessionHistoryEntry): void {
  const existing = getSessionHistory();
  localStorage.setItem(KEY, JSON.stringify([entry, ...existing]));
}

export function getSessionHistory(): SessionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionHistoryEntry[]) : [];
  } catch {
    return [];
  }
}
