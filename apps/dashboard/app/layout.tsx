import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { WalletProvider } from "./providers/WalletProvider";
import PrivyProvider from "./providers/PrivyProvider";
import { SharedWalletProvider } from "./providers/SharedWalletContext";
import { ToastProvider } from "./components/ui/Toast";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Agentic Finance — The Economy Runs on Trust. We Built It for Machines.",
    template: "%s | Agentic Finance",
  },
  description: "Privacy-preserving compliance, verifiable reputation, and autonomous payments for AI agents. 21 smart contracts, ZK-SNARK proofs, 50 production agents on Tempo L1.",
  keywords: ["Agentic Finance", "Tempo L1", "agent payments", "ZK compliance", "agent reputation", "MCP payments", "x402", "MPP", "AI agents", "zero-knowledge proofs", "autonomous commerce", "agt.finance"],
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Agentic Finance — The Economy Runs on Trust. We Built It for Machines.",
    description: "ZK compliance proofs, verifiable agent reputation, and multi-protocol payments. The trust infrastructure for autonomous commerce.",
    url: "https://agt.finance",
    siteName: "Agentic Finance",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic Finance",
    description: "The economy runs on trust. We built it for machines. ZK compliance, agent reputation, autonomous payments.",
    creator: "@agenticfinance",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
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
        {/* Brand fonts: Bricolage Grotesque (display) loaded via Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&display=swap" rel="stylesheet" />
        {/* Preload critical assets for faster rendering */}
        <link rel="preload" href="/textures/earth-blue-marble.jpg" as="image" />
        <link rel="preload" href="/textures/earth-topology.png" as="image" />
        <link rel="preload" href="/logo.png" as="image" />
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://explore.moderato.tempo.xyz" />
        <link rel="dns-prefetch" href="https://rpc.tempo.xyz" />
      </head>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} antialiased min-h-screen`}
        style={{ background: 'var(--pp-bg-primary)', color: 'var(--pp-text-primary)' }}
      >
        {/* Skip to main content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ErrorBoundary>
          <PrivyProvider>
            <SharedWalletProvider>
              <WalletProvider>
                <ToastProvider>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </ToastProvider>
              </WalletProvider>
            </SharedWalletProvider>
          </PrivyProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
