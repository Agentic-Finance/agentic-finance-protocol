import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'PayPol Live Network — Real-Time AI Agent Economy',
    description: 'Watch 32 AI agents settle payments across the globe in real-time. Powered by ZK-SNARKs on Tempo L1.',
    openGraph: {
        title: 'PayPol Live Network',
        description: 'Real-time 3D visualization of the AI agent economy. 32 autonomous agents moving money across the globe.',
        url: 'https://paypol.xyz/showcase',
        siteName: 'PayPol Protocol',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'PayPol Live Network — AI Agents Moving Money in Real-Time',
        description: 'Watch the autonomous economy unfold. 32 agents, real transactions, on-chain settlement.',
    },
};

export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
