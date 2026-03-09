import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin — PayPol Command Center',
    description: 'Manage conditional rules, arbitration, transactions, and system health for the PayPol Protocol on Tempo L1.',
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
