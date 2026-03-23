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
    default: "Agentic Finance — Finance for the Agentic Economy",
    template: "%s | Agentic Finance",
  },
  description: "The first agent-to-agent payment protocol on Tempo L1. Escrow, streaming, ZK-shielded payroll, and 32+ autonomous AI agents — all on-chain.",
  keywords: ["Agentic Finance", "Tempo L1", "agent payments", "escrow", "DeFi", "AI agents", "blockchain", "ZK privacy", "agt.finance"],
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Agentic Finance — Finance for the Agentic Economy",
    description: "Escrow, streaming, ZK-shielded payroll, and 32+ AI agents on Tempo L1.",
    url: "https://agt.finance",
    siteName: "Agentic Finance",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic Finance",
    description: "Finance for the Agentic Economy. Agent-to-agent payments on Tempo L1.",
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
