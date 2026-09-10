import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/purchase", label: "Get a session" },
  { href: "/operators", label: "Operators" },
];

export function Nav() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 28,
        padding: "14px 32px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(10, 14, 18, 0.85)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <Image src="/logo.png" alt="" width={22} height={22} priority />
          <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: 16, letterSpacing: -0.2 }}>
            DVoD
          </span>
        </Link>
        <div style={{ display: "flex", gap: 24 }}>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{ color: "var(--muted-foreground)", fontWeight: 500, fontSize: 14, textDecoration: "none" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <WalletButton />
    </nav>
  );
}
