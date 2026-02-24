// src/app/components/Navbar.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import NotificationBell from './NotificationBell';

// 1. Define the exact data bridge (props) this component needs from page.tsx
interface NavbarProps {
    currentWorkspace: { name: string; type: string; admin_wallet: string } | null | undefined;
    isAdmin: boolean | null | undefined; // ⚡️ FIX: Added 'undefined' to match the state in page.tsx
    isSystemLocked: boolean;
    setIsSystemLocked: (locked: boolean) => void;
    userBalance: string;
    activeVaultToken: { symbol: string; address: string; decimals: number; icon: string };
    walletAddress: string | null;
    connectWallet: () => void;
    disconnectWallet: () => void;
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
    return (
        <nav className="border-b border-white/[0.08] sticky top-0 z-50" style={{ background: 'radial-gradient(ellipse at top, rgba(15,19,25,0.85) 0%, rgba(15,19,25,0.75) 100%)' }}>
            <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">

                <div className="flex items-center gap-4">
                    <Image src="/logo.png" alt="PayPol" width={176} height={44} className="h-9 md:h-11 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" priority />
                    <div className="hidden lg:flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-indigo-400 font-mono text-[10px] bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded-full uppercase">v12.2</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Durable OS for the Agentic Economy • Powered by Tempo & OpenClaw</p>
                    </div>
                    {currentWorkspace && (
                        <>
                            <div className="hidden lg:block w-px h-6 bg-white/[0.1] mx-2"></div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-xl shadow-inner">
                                <span className="text-sm">{currentWorkspace.type === 'Organization' ? '🏢' : '👤'}</span>
                                <span className="text-sm font-bold text-slate-300 tracking-wide">{currentWorkspace.name}</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Streams Nav Link */}
                    {walletAddress && (
                        <Link
                            href="/stream"
                            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-indigo-300 bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/20 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                            </svg>
                            Streams
                        </Link>
                    )}

                    {/* Notification Bell */}
                    <NotificationBell walletAddress={walletAddress} />

                    <button onClick={() => setIsSystemLocked(!isSystemLocked)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 shadow-sm flex items-center gap-2 ${!isAdmin ? 'bg-black/40 border-white/[0.05] text-slate-600 cursor-not-allowed hidden md:flex' : isSystemLocked ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-rose-500/10 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10 hover:bg-emerald-500/20'}`}>
                        <span className={`w-2 h-2 rounded-full ${isSystemLocked ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}></span>
                        {isSystemLocked ? 'System Locked' : 'System Active'}
                    </button>

                    {walletAddress ? (
                        <div className="flex items-center bg-white/[0.04] border border-white/[0.1] rounded-xl overflow-hidden shadow-sm transition-all hover:border-white/[0.2]">
                            <div className="px-4 py-2 border-r border-white/[0.08] bg-black/40">
                                <p className="text-sm font-bold text-white tabular-nums">{Number(userBalance).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-[10px] text-slate-400 font-medium ml-1">{activeVaultToken.symbol}</span></p>
                            </div>
                            <button onClick={disconnectWallet} className="px-4 py-2 text-sm font-mono text-indigo-300 hover:text-white transition-colors flex items-center gap-2 group bg-white/[0.02]">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                {isAdmin && <span className="ml-1 text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">ADMIN</span>}
                            </button>
                        </div>
                    ) : (
                        <button onClick={connectWallet} className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold hover:from-indigo-400 hover:to-purple-500 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.3)]">Connect Wallet</button>
                    )}
                </div>
            </div>
        </nav>
    );
}
export default React.memo(Navbar);
