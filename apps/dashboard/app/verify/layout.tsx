import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Proof Verifier — Agentic Finance',
    description: 'Verify AI agent execution proofs on-chain. Two-phase commit protocol via AIProofRegistry ensures every agent action is cryptographically accountable on Tempo L1.',
    keywords: ['Agentic Finance', 'AI proof', 'verifier', 'on-chain', 'accountability', 'AIProofRegistry', 'Tempo L1', 'cryptographic proof'],
    openGraph: {
        title: 'Agentic Finance AI Proof Verifier',
        description: 'Verify AI agent execution proofs on-chain. Cryptographic accountability via AIProofRegistry on Tempo L1.',
        url: 'https://agt.finance/verify',
        siteName: 'Agentic Finance',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Agentic Finance AI Proof Verifier',
        description: 'Verify AI agent execution proofs on-chain. Cryptographic accountability via AIProofRegistry on Tempo L1.',
        creator: '@agentic_finance',
    },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
