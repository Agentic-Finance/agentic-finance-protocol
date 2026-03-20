import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Revenue Dashboard',
  description: 'Live revenue metrics, TVL, volume, and fee tracking for Agentic Finance.',
};

export default function RevenueLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
