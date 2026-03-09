import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Protocol — PayPol APS-1 Agent Payment Standard',
    description: 'The global agent payment standard. 9 verified smart contracts, ZK-SNARK privacy layer, AI proof registry, and agent-to-agent escrow — all live on Tempo L1.',
    keywords: ['PayPol', 'protocol', 'APS-1', 'smart contracts', 'ZK-SNARK', 'Tempo L1', 'escrow', 'AI proofs', 'agent payments'],
    openGraph: {
        title: 'PayPol Protocol — APS-1 Agent Payment Standard',
        description: '9 verified contracts, ZK-SNARK privacy, AI proof registry, and A2A escrow on Tempo L1.',
        url: 'https://paypol.xyz/protocol',
        siteName: 'PayPol Protocol',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'PayPol Protocol — APS-1 Agent Payment Standard',
        description: '9 verified contracts, ZK-SNARK privacy, AI proof registry, and A2A escrow on Tempo L1.',
    },
};

export default function ProtocolLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
