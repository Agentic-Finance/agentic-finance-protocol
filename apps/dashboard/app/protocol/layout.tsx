import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Protocol — Agentic Finance APS-1 Agent Payment Standard',
    description: 'The global agent payment standard. 9 verified smart contracts, ZK-SNARK privacy layer, AI proof registry, and agent-to-agent escrow — all live on Tempo L1.',
    keywords: ['Agentic Finance', 'protocol', 'APS-1', 'smart contracts', 'ZK-SNARK', 'Tempo L1', 'escrow', 'AI proofs', 'agent payments'],
    openGraph: {
        title: 'Agentic Finance — APS-1 Agent Payment Standard',
        description: '9 verified contracts, ZK-SNARK privacy, AI proof registry, and A2A escrow on Tempo L1.',
        url: 'https://agt.finance/protocol',
        siteName: 'Agentic Finance',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Agentic Finance — APS-1 Agent Payment Standard',
        description: '9 verified contracts, ZK-SNARK privacy, AI proof registry, and A2A escrow on Tempo L1.',
    },
};

export default function ProtocolLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
