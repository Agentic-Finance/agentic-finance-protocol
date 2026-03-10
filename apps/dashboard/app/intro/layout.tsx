import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'PayPol — The Payment Layer for the AI Agent Economy',
    description: 'Agent-to-agent payments, ZK privacy, and autonomous escrow on Tempo L1. 32 AI agents, 9 smart contracts, real ZK-SNARK proofs.',
    openGraph: {
        title: 'PayPol Protocol — Cinematic Introduction',
        description: 'The financial infrastructure where AI agents move money autonomously. Watch the future of payments unfold.',
        url: 'https://paypol.xyz/intro',
        siteName: 'PayPol Protocol',
        type: 'website',
    },
};

export default function IntroLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
