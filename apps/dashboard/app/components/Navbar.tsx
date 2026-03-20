// src/app/components/Navbar.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';
import { ThemeToggleCompact } from './ThemeToggle';
import {
    BoltIcon, GlobeAltIcon, ShieldIcon, UsersIcon,
    CodeBracketIcon, ChartBarIcon, XMarkIcon, BriefcaseIcon,
} from './icons';

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
    { href: '/stream', label: 'Streams', icon: <ChartBarIcon className="w-3.5 h-3.5" /> },
    { href: '/cortex', label: 'Cortex', icon: <BoltIcon className="w-3.5 h-3.5" /> },
    { href: '/sentinel', label: 'Sentinel', icon: <GlobeAltIcon className="w-3.5 h-3.5" /> },
    { href: '/swarm', label: 'Swarm', icon: <UsersIcon className="w-3.5 h-3.5" /> },
    { href: '/developers', label: 'Dev', icon: <CodeBracketIcon className="w-3.5 h-3.5" /> },
];

function truncateAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function Navbar({
    currentWorkspace, isAdmin, isSystemLocked, setIsSystemLocked,
    userBalance, activeVaultToken, walletAddress, connectWallet, disconnectWallet,
}: NavbarProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (accountOpen) setAccountOpen(false);
            if (mobileMenuOpen) setMobileMenuOpen(false);
        }
    }, [mobileMenuOpen, accountOpen]);

    useEffect(() => {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [handleEscape]);

    // Close account panel on outside click
    useEffect(() => {
        if (!accountOpen) return;
        const handler = (e: MouseEvent) => {
            if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [accountOpen]);

    const copyAddress = () => {
        if (!walletAddress) return;
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const exportPrivateKey = () => {
        // Dispatch event to page.tsx where Privy hooks are available
        window.dispatchEvent(new CustomEvent('privy-export-wallet'));
    };

    return (
        <>
            <nav className="sticky top-0 z-50 pp-glass h-16" style={{ borderBottom: '1px solid var(--pp-border)' }} aria-label="Main navigation">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

                    {/* LEFT: Logo + Workspace */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {walletAddress && (
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/[0.06] transition-colors"
                                aria-label="Toggle navigation menu"
                                aria-expanded={mobileMenuOpen}
                            >
                                {mobileMenuOpen
                                    ? <XMarkIcon className="w-4 h-4" />
                                    : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" /></svg>
                                }
                            </button>
                        )}

                        <Link href="/" className="flex items-center gap-2 group">
                            <Image src="/logo-v2.png" alt="Agentic Finance" width={28} height={28} className="h-7 w-7 object-contain" priority />
                            <span className="text-[17px] font-extrabold text-white tracking-tight hidden sm:inline" style={{ fontFamily: 'var(--agt-font-display)' }}>
                                Agentic Finance
                            </span>
                        </Link>

                        {currentWorkspace && (
                            <div className="agt-badge flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--pp-text-secondary)' }}>
                                {currentWorkspace.type === 'Organization'
                                    ? <BriefcaseIcon className="w-3 h-3" />
                                    : <UsersIcon className="w-3 h-3" />
                                }
                                <span className="max-w-[60px] sm:max-w-[100px] truncate">{currentWorkspace.name}</span>
                            </div>
                        )}
                    </div>

                    {/* CENTER: Desktop Nav */}
                    {walletAddress && (
                        <div className="hidden lg:flex items-center bg-white/[0.03] rounded-xl px-1 py-0.5 gap-0.5" style={{ border: '1px solid var(--pp-border)' }}>
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link key={link.href} href={link.href}
                                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider ${isActive ? 'text-white bg-white/[0.08]' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
                                    >
                                        {link.icon}
                                        {link.label}
                                        {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[2px] rounded-full" style={{ background: 'var(--agt-pink)' }} />}
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* RIGHT: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isAdmin && (
                            <button onClick={() => setIsSystemLocked(!isSystemLocked)}
                                aria-label={isSystemLocked ? 'Unlock system' : 'Lock system'}
                                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isSystemLocked ? 'agt-badge-danger' : 'agt-badge-mint'}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isSystemLocked ? 'var(--pp-danger)' : 'var(--agt-mint)', ...(!isSystemLocked && { animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }) }} />
                                {isSystemLocked ? 'Locked' : 'Active'}
                            </button>
                        )}

                        <ThemeToggleCompact />
                        <NotificationBell walletAddress={walletAddress} />

                        {walletAddress ? (
                            <div className="relative" ref={accountRef}>
                                <div className="flex items-center bg-white/[0.03] rounded-xl overflow-hidden transition-all hover:border-white/[0.12] cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setAccountOpen(!accountOpen)}>
                                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 border-r border-white/[0.06]">
                                        <p className="text-[11px] font-bold text-white tabular-nums leading-none">
                                            {Number(userBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <span className="text-[9px] text-slate-500 font-semibold">{activeVaultToken.symbol}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/[0.04] transition-colors group">
                                        <div className="w-2 h-2 rounded-full" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))', boxShadow: '0 0 6px rgba(255,45,135,0.4)' }} />
                                        <span className="text-xs font-mono text-slate-300 group-hover:text-white transition-colors">{truncateAddress(walletAddress)}</span>
                                        {isAdmin && <span className="agt-badge-pink text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>}
                                    </div>
                                </div>

                                {/* Account Panel Dropdown */}
                                {accountOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl p-4 space-y-3 animate-fade-in-up z-50"
                                        style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>

                                        {/* Wallet Address */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>Wallet Address</label>
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                                <span className="text-xs font-mono flex-1 break-all" style={{ color: 'var(--pp-text-primary)' }}>{walletAddress}</span>
                                                <button onClick={copyAddress} className="flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-80"
                                                    style={{ background: 'var(--pp-surface-2)', color: copied ? 'var(--agt-mint)' : 'var(--pp-text-muted)' }}>
                                                    {copied ? 'Copied!' : 'Copy'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Balance */}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                            <span className="text-xs font-medium" style={{ color: 'var(--pp-text-muted)' }}>Balance</span>
                                            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--pp-text-primary)' }}>
                                                {Number(userBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {activeVaultToken.symbol}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={copyAddress} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                                                style={{ background: 'color-mix(in srgb, var(--agt-blue) 15%, transparent)', color: 'var(--agt-blue)', border: '1px solid color-mix(in srgb, var(--agt-blue) 25%, transparent)' }}>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                Receive
                                            </button>
                                            <button onClick={() => { setAccountOpen(false); window.dispatchEvent(new CustomEvent('open-send-modal')); }}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                                                style={{ background: 'color-mix(in srgb, var(--agt-mint) 15%, transparent)', color: 'var(--agt-mint)', border: '1px solid color-mix(in srgb, var(--agt-mint) 25%, transparent)' }}>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                Send
                                            </button>
                                        </div>

                                        {/* Export Private Key */}
                                        <button onClick={exportPrivateKey}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                                            style={{ background: 'color-mix(in srgb, var(--agt-orange) 12%, transparent)', color: 'var(--agt-orange)', border: '1px solid color-mix(in srgb, var(--agt-orange) 20%, transparent)' }}>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
                                            Export Private Key
                                        </button>

                                        {/* Disconnect */}
                                        <button onClick={() => { setAccountOpen(false); disconnectWallet(); }}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                                            style={{ background: 'color-mix(in srgb, var(--pp-danger) 12%, transparent)', color: 'var(--pp-danger)', border: '1px solid color-mix(in srgb, var(--pp-danger) 20%, transparent)' }}>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                                            Disconnect Wallet
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button onClick={connectWallet}
                                className="px-4 py-2 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90"
                                style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))', boxShadow: '0 0 15px rgba(255,45,135,0.2)' }}
                            >
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Drawer */}
            {walletAddress && mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" onClick={() => setMobileMenuOpen(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="absolute top-16 left-0 right-0 pp-glass animate-fade-in-up" style={{ borderBottom: '1px solid var(--pp-border)' }} onClick={(e) => e.stopPropagation()}>
                        <div className="max-w-[1440px] mx-auto px-4 py-3 space-y-1">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                                        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? 'text-white bg-white/[0.08]' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}
                                    >
                                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full" style={{ background: 'var(--agt-pink)' }} />}
                                        {link.icon}
                                        {link.label}
                                    </Link>
                                );
                            })}
                            <div className="sm:hidden flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] mt-2 pt-3">
                                <span className="text-sm font-bold text-white tabular-nums">{Number(userBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
