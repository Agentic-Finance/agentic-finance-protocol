import EmbeddedWallets from '../components/EmbeddedWallets';
import SubPageNav from '../components/SubPageNav';
import Link from 'next/link';

export const metadata = {
    title: 'Embedded Wallets',
    description: 'Manage isolated wallets for agents and employees with AES-256-GCM encryption.',
};

export default function WalletsPage() {
    return (
        <div className="min-h-screen bg-[#0B1120]">
            <SubPageNav />
            {/* Header */}
            <div className="border-b border-white/[0.08] pp-glass">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Embedded Wallets</h1>
                                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                    Isolated wallets for agents & employees - AES-256-GCM encrypted
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <EmbeddedWallets />
            </div>
        </div>
    );
}
