'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';

const navLinks = [
    { href: '/?app=1', label: 'Dashboard', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
        </svg>
    )},
    { href: '/stream', label: 'Streams', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
    )},
    { href: '/cortex', label: 'Cortex', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
    )},
    { href: '/sentinel', label: 'Sentinel', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
    )},
    { href: '/swarm', label: 'Swarm', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
    )},
    { href: '/developers', label: 'Dev', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
    )},
];

export default function SubPageNav() {
    const pathname = usePathname();
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    // Auto-detect wallet from MetaMask
    useEffect(() => {
        const checkWallet = async () => {
            if (typeof window !== 'undefined' && (window as any).ethereum) {
                try {
                    const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
                    if (accounts?.[0]) setWalletAddress(accounts[0]);
                } catch { /* silent */ }
            }
        };
        checkWallet();

        // Listen for account changes
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            (window as any).ethereum.on?.('accountsChanged', (accs: string[]) => {
                setWalletAddress(accs?.[0] || null);
            });
        }
    }, []);

    return (
        <nav className="border-b border-white/[0.08] pp-glass sticky top-0 z-50" aria-label="Sub-page navigation">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
                {/* Logo → back to Dashboard */}
                <Link href="/?app=1" className="flex items-center gap-2 flex-shrink-0 group">
                    <span className="text-[15px] font-extrabold text-white tracking-tight opacity-80 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>Agentic Finance</span>
                </Link>

                {/* Nav Links */}
                <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl px-1 py-0.5 gap-0.5 overflow-x-auto scrollbar-hide">
                    {navLinks.map((link) => {
                        const isActive = link.href === '/?app=1' ? pathname === '/' : pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
                                    isActive
                                        ? 'text-white bg-white/[0.08]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                                }`}
                            >
                                <span className="hidden sm:inline-flex">{link.icon}</span>
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Notification Bell + Wallet indicator */}
                <div className="flex items-center gap-2 min-w-[120px] justify-end">
                    <NotificationBell walletAddress={walletAddress} />
                    {walletAddress && (
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]"></div>
                            <span className="text-[10px] font-mono text-slate-400">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
