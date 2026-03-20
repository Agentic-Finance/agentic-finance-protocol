import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Embedded Wallets',
    description: 'Manage isolated wallets for agents and employees with AES-256-GCM encryption.',
};

export default function WalletsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
