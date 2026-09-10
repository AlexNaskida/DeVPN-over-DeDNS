"use client";

const MIN_HOURS = 1;
const MAX_HOURS = 24;

export function HoursSlider({ hours, onChange }: { hours: number; onChange: (hours: number) => void }) {
  function clamp(value: number): number {
    if (Number.isNaN(value)) return MIN_HOURS;
    return Math.min(MAX_HOURS, Math.max(MIN_HOURS, Math.round(value)));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Duration</span>
        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          {MIN_HOURS}-{MAX_HOURS} hours
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <input
          type="range"
          className="dvod-slider"
          min={MIN_HOURS}
          max={MAX_HOURS}
          step={1}
          value={hours}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          style={{
            flex: 1,
            // Fills the track up to the current value, matching the thumb position.
            background: `linear-gradient(to right, var(--primary) ${((hours - MIN_HOURS) / (MAX_HOURS - MIN_HOURS)) * 100}%, var(--muted) 0%)`,
          }}
        />
        <input
          type="number"
          min={MIN_HOURS}
          max={MAX_HOURS}
          value={hours}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          aria-label="Hours (manual entry)"
          style={{
            width: 64,
            padding: "8px 10px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--muted)",
            color: "var(--foreground)",
            fontSize: 14,
            textAlign: "center",
          }}
        />
        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>hr{hours === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}
