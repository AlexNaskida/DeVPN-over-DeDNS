"use client";

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 24,
          width: 380,
          maxWidth: "90vw",
        }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>{title}</h2>
        <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", margin: "0 0 20px", lineHeight: 1.5 }}>
          {body}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              padding: "9px 16px",
              borderRadius: "var(--radius)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              background: "var(--destructive)",
              border: "none",
              color: "var(--destructive-foreground)",
              padding: "9px 16px",
              borderRadius: "var(--radius)",
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Ending..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
