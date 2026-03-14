import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin — Agentic Finance Command Center',
    description: 'Manage conditional rules, arbitration, transactions, and system health for Agentic Finance on Tempo L1.',
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
