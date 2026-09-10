import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/Nav";
import { WalletProvider } from "@/lib/WalletContext";
import { WalletModal } from "@/components/WalletModal";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "DVoD - DeVPN-over-DeDNS",
  description: "Anonymous, time-boxed internet access with enforceable, revocable permissions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <WalletProvider>
          <Nav />
          <main style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 32px" }}>{children}</main>
          <WalletModal />
        </WalletProvider>
      </body>
    </html>
  );
}
