// src/app/components/Navbar.tsx
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';

interface NavbarProps {
    currentWorkspace: { name: string; type: string; admin_wallet: string } | null | undefined;
    isAdmin: boolean | null | undefined;
    isSystemLocked: boolean;
    setIsSystemLocked: (locked: boolean) => void;
    userBalance: string;
    activeVaultToken: { symbol: string; address: string; decimals: number; icon: string };
    walletAddress: string | null;
    connectWallet: () => void;
    disconnectWallet: () => void;
}

const navLinks = [
    { href: '/stream', label: 'Streams', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
    )},
    { href: '/shield', label: 'Shield', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
    )},
    { href: '/live', label: 'Live', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
    )},
    { href: '/developers', label: 'Dev', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
    )},
    { href: '/revenue', label: 'Revenue', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
    )},
    { href: '/wallets', label: 'Wallets', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
        </svg>
    )},
];

function truncateAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function Navbar({
    currentWorkspace,
    isAdmin,
    isSystemLocked,
    setIsSystemLocked,
    userBalance,
    activeVaultToken,
    walletAddress,
    connectWallet,
    disconnectWallet
}: NavbarProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    return (
        <>
            <nav className="border-b border-white/[0.08] sticky top-0 z-50 pp-glass">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

                    {/* ─── LEFT: Logo + Mobile Menu Toggle ─── */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Mobile hamburger */}
                        {walletAddress && (
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/[0.06] transition-colors"
                                aria-label="Toggle navigation menu"
                            >
                                {mobileMenuOpen ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-300">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-300">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                                    </svg>
                                )}
                            </button>
                        )}

                        <Link href="/" className="flex items-center gap-2.5 group">
                            <Image src="/logo.png" alt="PayPol" width={140} height={36} className="h-7 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_18px_rgba(255,255,255,0.2)] transition-all" priority />
                        </Link>

                        {currentWorkspace && (
                            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg">
                                <span className="text-xs">{currentWorkspace.type === 'Organization' ? '🏢' : '👤'}</span>
                                <span className="text-xs font-semibold text-slate-300 max-w-[100px] truncate">{currentWorkspace.name}</span>
                            </div>
                        )}
                    </div>

                    {/* ─── CENTER: Desktop Navigation ─── */}
                    {walletAddress && (
                        <div className="hidden lg:flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl px-1 py-0.5 gap-0.5">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider ${
                                            isActive
                                                ? 'text-white bg-white/[0.08]'
                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                                        }`}
                                    >
                                        {link.icon}
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* ─── RIGHT: Actions ─── */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* System Status */}
                        {isAdmin && (
                            <button
                                onClick={() => setIsSystemLocked(!isSystemLocked)}
                                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                    isSystemLocked
                                        ? 'bg-rose-500/8 text-rose-400 border-rose-500/20 hover:bg-rose-500/15'
                                        : 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${isSystemLocked ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}></span>
                                {isSystemLocked ? 'Locked' : 'Active'}
                            </button>
                        )}

                        <NotificationBell walletAddress={walletAddress} />

                        {/* Wallet */}
                        {walletAddress ? (
                            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden transition-all hover:border-white/[0.15]">
                                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 border-r border-white/[0.06]">
                                    <span className="text-[10px] font-bold text-emerald-400">{activeVaultToken.icon || '$'}</span>
                                    <p className="text-xs font-bold text-white tabular-nums leading-none">
                                        {Number(userBalance).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </p>
                                    <span className="text-[9px] text-slate-500 font-semibold">{activeVaultToken.symbol}</span>
                                </div>
                                <button onClick={disconnectWallet} className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/[0.04] transition-colors group">
                                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]"></div>
                                    <span className="text-xs font-mono text-slate-300 group-hover:text-white transition-colors">
                                        {truncateAddress(walletAddress)}
                                    </span>
                                    {isAdmin && (
                                        <span className="text-[8px] font-bold bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/25 uppercase tracking-wider">Admin</span>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <button onClick={connectWallet} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold hover:from-indigo-400 hover:to-purple-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.35)]">
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* ─── Mobile Navigation Drawer ─── */}
            {walletAddress && mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)}>
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    {/* Menu */}
                    <div
                        className="absolute top-14 left-0 right-0 border-b border-white/[0.08] pp-glass animate-fade-in-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="max-w-[1440px] mx-auto px-4 py-3 space-y-1">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                            isActive
                                                ? 'text-white bg-white/[0.08]'
                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                                        }`}
                                    >
                                        {link.icon}
                                        {link.label}
                                    </Link>
                                );
                            })}

                            {/* Mobile-only balance */}
                            <div className="sm:hidden flex items-center gap-2 px-4 py-2.5 border-t border-white/[0.06] mt-2 pt-3">
                                <span className="text-xs text-emerald-400 font-bold">{activeVaultToken.icon || '$'}</span>
                                <span className="text-sm font-bold text-white tabular-nums">
                                    {Number(userBalance).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </span>
                                <span className="text-xs text-slate-500">{activeVaultToken.symbol}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
export default React.memo(Navbar);
