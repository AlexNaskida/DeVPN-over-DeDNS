import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "DVoD - DeVPN-over-DeDNS",
  description: "Anonymous, time-boxed internet access with enforceable, revocable permissions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 32px" }}>{children}</main>
      </body>
    </html>
  );
}
