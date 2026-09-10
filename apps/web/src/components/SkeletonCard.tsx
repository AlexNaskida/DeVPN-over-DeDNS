export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px 24px",
      }}
    >
      <div className="skeleton" style={{ height: 16, width: "40%", marginBottom: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 12, width: i === lines - 1 ? "55%" : "75%", marginTop: 8 }}
        />
      ))}
    </div>
  );
}
