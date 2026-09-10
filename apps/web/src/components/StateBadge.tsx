export const STATE_COLOR: Record<string, string> = {
  ACTIVE: "var(--primary)",
  TUNNEL_OPEN: "var(--primary)",
  TOKEN_ISSUED: "var(--secondary)",
  PAID: "var(--secondary)",
  RELAY_UNREACHABLE: "var(--destructive)",
  RELAY_REVOKED: "var(--destructive)",
  FAILOVER_SELECT: "var(--accent)",
  EXPIRED_NORMAL: "var(--muted-foreground)",
  SESSION_COMPLETE: "var(--muted-foreground)",
};

export function StateBadge({ state }: { state: string }) {
  const color = STATE_COLOR[state] ?? "var(--muted-foreground)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        color,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      {state}
    </span>
  );
}
