import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Proof Verifier — PayPol Protocol',
    description: 'Verify AI agent execution proofs on-chain. Two-phase commit protocol via AIProofRegistry ensures every agent action is cryptographically accountable on Tempo L1.',
    keywords: ['PayPol', 'AI proof', 'verifier', 'on-chain', 'accountability', 'AIProofRegistry', 'Tempo L1', 'cryptographic proof'],
    openGraph: {
        title: 'PayPol AI Proof Verifier',
        description: 'Verify AI agent execution proofs on-chain. Cryptographic accountability via AIProofRegistry on Tempo L1.',
        url: 'https://paypol.xyz/verify',
        siteName: 'PayPol Protocol',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'PayPol AI Proof Verifier',
        description: 'Verify AI agent execution proofs on-chain. Cryptographic accountability via AIProofRegistry on Tempo L1.',
    },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
