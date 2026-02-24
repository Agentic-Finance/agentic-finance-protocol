// src/app/components/Navbar.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
    { href: '/developers', label: 'Developers', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
    )},
];

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
    return (
        <nav className="border-b border-white/[0.08] sticky top-0 z-50" style={{ background: 'rgba(11,17,32,0.90)', backdropFilter: 'blur(24px) saturate(180%)' }}>
            <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">

                {/* ─── LEFT: Logo + Workspace ─── */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <Image src="/logo.png" alt="PayPol" width={140} height={36} className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all" priority />
                    </Link>

                    {currentWorkspace && (
                        <>
                            <div className="hidden md:block w-px h-5 bg-white/[0.08]"></div>
                            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg">
                                <span className="text-xs">{currentWorkspace.type === 'Organization' ? '🏢' : '👤'}</span>
                                <span className="text-xs font-semibold text-slate-300 max-w-[120px] truncate">{currentWorkspace.name}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* ─── CENTER: Navigation Links ─── */}
                {walletAddress && (
                    <div className="hidden lg:flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl px-1.5 py-1 gap-0.5">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all uppercase tracking-wider"
                            >
                                {link.icon}
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}

                {/* ─── RIGHT: Actions ─── */}
                <div className="flex items-center gap-2 flex-shrink-0">

                    {/* System Status — Admin only */}
                    {isAdmin && (
                        <button
                            onClick={() => setIsSystemLocked(!isSystemLocked)}
                            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-300 ${
                                isSystemLocked
                                    ? 'bg-rose-500/8 text-rose-400 border-rose-500/20 hover:bg-rose-500/15'
                                    : 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${isSystemLocked ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}></span>
                            {isSystemLocked ? 'Locked' : 'Active'}
                        </button>
                    )}

                    {/* Notifications */}
                    <NotificationBell walletAddress={walletAddress} />

                    {/* Wallet / Connect */}
                    {walletAddress ? (
                        <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden transition-all hover:border-white/[0.15]">
                            {/* Balance */}
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 border-r border-white/[0.06]">
                                <span className="text-[10px] font-bold text-emerald-400">{activeVaultToken.icon || '$'}</span>
                                <p className="text-xs font-bold text-white tabular-nums leading-none">
                                    {Number(userBalance).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </p>
                                <span className="text-[9px] text-slate-500 font-semibold">{activeVaultToken.symbol}</span>
                            </div>
                            {/* Address */}
                            <button onClick={disconnectWallet} className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors group">
                                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 shadow-[0_0_8px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_12px_rgba(99,102,241,0.6)] transition-shadow"></div>
                                <span className="text-xs font-mono text-slate-300 group-hover:text-white transition-colors">
                                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                </span>
                                {isAdmin && (
                                    <span className="text-[8px] font-bold bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/25 uppercase tracking-wider">Admin</span>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button onClick={connectWallet} className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold hover:from-indigo-400 hover:to-purple-500 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                            Connect Wallet
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
export default React.memo(Navbar);
