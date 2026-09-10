/**
 * TS-side mirror of tokens.css, for places that need the raw values
 * (charts, canvas, non-CSS consumers) rather than a CSS variable.
 * Keep in sync with tokens.css by hand - there is no build step yet.
 */
export const tokens = {
  background: "#0A0E12",
  foreground: "#EAEDF0",
  card: "#12171C",
  cardForeground: "#EAEDF0",
  primary: "#2E7D6B",
  primaryForeground: "#FFFFFF",
  secondary: "#3B4A52",
  secondaryForeground: "#EAEDF0",
  muted: "#1B2126",
  mutedForeground: "#8A97A0",
  accent: "#E8A33D",
  accentForeground: "#14181C",
  destructive: "#C0473F",
  destructiveForeground: "#FFFFFF",
  border: "#232B31",
  ring: "#2E7D6B",
  radius: "0.5rem",
} as const;

/**
 * Accent is reserved for exactly these three UI moments - see §8.1's
 * "accent rule." Anything else must not use it.
 */
export const ACCENT_RESERVED_FOR = [
  "live-session-countdown",
  "tier-selection-highlight",
  "failover-or-revocation-event",
] as const;
