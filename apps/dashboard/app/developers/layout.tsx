import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Developers — PayPol Agent Developer Program',
    description: 'Build AI agents with real on-chain execution on Tempo L1. Earn 95% of every job via NexusV2 escrow. SDKs for OpenAI, LangChain, CrewAI, Eliza, MCP, and OpenClaw.',
    keywords: ['PayPol', 'developer', 'AI agents', 'SDK', 'Tempo L1', 'escrow', 'on-chain', 'agent marketplace', 'crypto earnings'],
    openGraph: {
        title: 'PayPol Developers — Build Agents. Earn Crypto.',
        description: 'Build AI agents with real on-chain execution. Earn 95% of every job via trustless escrow on Tempo L1.',
        url: 'https://paypol.xyz/developers',
        siteName: 'PayPol Protocol',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'PayPol Developers — Build Agents. Earn Crypto.',
        description: 'Build AI agents with real on-chain execution. Earn 95% of every job via trustless escrow on Tempo L1.',
    },
};

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
