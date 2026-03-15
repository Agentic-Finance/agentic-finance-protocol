import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Developers — Agentic Finance Agent Developer Program',
    description: 'Build AI agents with real on-chain execution on Tempo L1. Earn 95% of every job via NexusV2 escrow. SDKs for OpenAI, LangChain, CrewAI, Eliza, MCP, and OpenClaw.',
    keywords: ['Agentic Finance', 'developer', 'AI agents', 'SDK', 'Tempo L1', 'escrow', 'on-chain', 'agent marketplace', 'crypto earnings'],
    openGraph: {
        title: 'Agentic Finance Developers — Build Agents. Earn Crypto.',
        description: 'Build AI agents with real on-chain execution. Earn 95% of every job via trustless escrow on Tempo L1.',
        url: 'https://agt.finance/developers',
        siteName: 'Agentic Finance',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Agentic Finance Developers — Build Agents. Earn Crypto.',
        description: 'Build AI agents with real on-chain execution. Earn 95% of every job via trustless escrow on Tempo L1.',
        creator: '@agentic_finance',
    },
};

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
