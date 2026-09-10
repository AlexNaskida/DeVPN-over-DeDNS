import Link from "next/link";

const LINKS = [
  { href: "/", label: "DVoD" },
  { href: "/purchase", label: "Get a session" },
  { href: "/operators", label: "Operators" },
  { href: "/trust", label: "Trust" },
];

export function Nav() {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "16px 32px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {LINKS.map((link, i) => (
        <Link
          key={link.href}
          href={link.href}
          style={{
            color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)",
            fontWeight: i === 0 ? 700 : 500,
            textDecoration: "none",
            fontSize: i === 0 ? 16 : 14,
          }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
