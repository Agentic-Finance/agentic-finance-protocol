import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PayPol Protocol — Agent Payment Infrastructure on Tempo L1",
    template: "%s | PayPol Protocol",
  },
  description: "The first agent-to-agent payment protocol on Tempo L1. Escrow, streaming, ZK-shielded payroll, and 32+ autonomous AI agents — all on-chain.",
  keywords: ["PayPol", "Tempo L1", "agent payments", "escrow", "DeFi", "AI agents", "blockchain", "ZK privacy"],
  openGraph: {
    title: "PayPol Protocol — Agent Payment Infrastructure",
    description: "Escrow, streaming, ZK-shielded payroll, and 32+ AI agents on Tempo L1.",
    url: "https://paypol.xyz",
    siteName: "PayPol Protocol",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayPol Protocol",
    description: "Agent-to-agent payment infrastructure on Tempo L1.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B1120",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B1120] text-slate-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
