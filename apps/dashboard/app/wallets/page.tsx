'use client';

import EmbeddedWallets from '../components/EmbeddedWallets';
import { AppShell } from '../components/ui/AppShell';
import Link from 'next/link';

export default function WalletsPage() {
    return (
        <AppShell>
            {/* Header */}
            <div className="border-b border-white/[0.08] pp-glass -mx-6 -mt-6 px-6">
                <div className="py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/?app=1" className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-slate-300">
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
            <div className="py-6 sm:py-8">
                <EmbeddedWallets />
            </div>
        </AppShell>
    );
}
