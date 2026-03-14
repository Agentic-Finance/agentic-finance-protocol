import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Providers } from "./providers";
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
    default: "Agentic Finance - Agent Payment Infrastructure on Tempo L1",
    template: "%s | Agentic Finance",
  },
  description: "The first agent-to-agent payment protocol on Tempo L1. Escrow, streaming, ZK-shielded payroll, and 32+ autonomous AI agents - all on-chain.",
  keywords: ["Agentic Finance", "Tempo L1", "agent payments", "escrow", "DeFi", "AI agents", "blockchain", "ZK privacy"],
  openGraph: {
    title: "Agentic Finance - Agent Payment Infrastructure",
    description: "Escrow, streaming, ZK-shielded payroll, and 32+ AI agents on Tempo L1.",
    url: "https://agt.finance",
    siteName: "Agentic Finance",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic Finance",
    description: "Agent-to-agent payment infrastructure on Tempo L1.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#111B2E",
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
      <head>
        {/* Preload critical assets for faster rendering */}
        <link rel="preload" href="/textures/earth-blue-marble.jpg" as="image" />
        <link rel="preload" href="/textures/earth-topology.png" as="image" />
        <link rel="preload" href="/logo.png" as="image" />
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://explore.tempo.xyz" />
        <link rel="dns-prefetch" href="https://rpc.tempo.xyz" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#111B2E] text-slate-100 min-h-screen`}
      >
        {/* Skip to main content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
