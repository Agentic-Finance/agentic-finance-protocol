import React, { useCallback, useState } from 'react';
import Image from 'next/image';
import { useLoginWithOAuth, usePrivy } from '@privy-io/react-auth';
import { ThemeSelector } from './ThemeToggle';

interface GatewayProps {
    walletAddress: string | null;
    currentWorkspace: any;
    gatewayMode: string;
    setGatewayMode: (mode: 'Select' | 'Create' | 'Join') => void;
    setupStep: number;
    setSetupStep: (step: number) => void;
    setupType: string;
    setSetupType: (type: 'Organization' | 'Personal') => void;
    setupName: string;
    setSetupName: (name: string) => void;
    joinAdminWallet: string;
    setJoinAdminWallet: (wallet: string) => void;
    ack1: boolean; setAck1: (val: boolean) => void;
    ack2: boolean; setAck2: (val: boolean) => void;
    ack3: boolean; setAck3: (val: boolean) => void;
    isDeployingWorkspace: boolean;
    deployWorkspace: (e: React.FormEvent) => void;
    joinWorkspace: (e: React.FormEvent) => void;
    connectWallet: () => void;
    disconnectWallet: () => void;
    initializeSession?: (wallet: string) => void;
}

function NotificationSetup({ walletAddress, workspaceName, onContinue }: { walletAddress: string | null; workspaceName: string; onContinue: () => void }) {
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (!email || !email.includes('@')) return;
        setSaving(true);
        try {
            // Save email preference
            if (walletAddress) {
                localStorage.setItem(`agtfi_notify_email_${walletAddress.toLowerCase()}`, email);
            }
            // Send welcome email
            await fetch('/api/notifications/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    type: 'workspace_created',
                    workspaceName: workspaceName || 'My Workspace',
                    data: {},
                }),
            });
            setSaved(true);
        } catch { /* ignore */ }
        setSaving(false);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8">
            <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'color-mix(in srgb, var(--agt-blue) 15%, transparent)' }}>
                    <svg className="w-8 h-8" style={{ color: 'var(--agt-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--pp-text-primary)' }}>Stay Informed</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Get notified about payroll events</p>
            </div>

            {/* Email input */}
            <div className="mb-4 p-4 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                <div className="flex items-center gap-3 mb-3">
                    <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--agt-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>Email Notifications</p>
                        <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Payout confirmations, low balance alerts</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        disabled={saved}
                        className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                        style={{
                            background: 'var(--pp-bg-primary)',
                            border: '1px solid var(--pp-border)',
                            color: 'var(--pp-text-primary)',
                        }}
                    />
                    <button
                        onClick={handleSave}
                        disabled={saving || saved || !email.includes('@')}
                        className="px-4 py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                        style={{
                            background: saved ? 'color-mix(in srgb, var(--agt-mint) 15%, transparent)' : 'var(--pp-text-primary)',
                            color: saved ? 'var(--agt-mint)' : 'var(--pp-bg-primary)',
                        }}
                    >
                        {saved ? 'Saved' : saving ? '...' : 'Enable'}
                    </button>
                </div>
            </div>

            {/* Telegram — real bot */}
            <div className="mb-4 p-4 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                <div className="flex items-center gap-3 mb-3">
                    <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--agt-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>Telegram Bot</p>
                        <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Real-time alerts via @AgenticFinance_bot</p>
                    </div>
                </div>
                <a
                    href={`https://t.me/AgenticFinance_bot?start=${walletAddress || ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center text-xs font-bold py-2.5 rounded-lg transition-all"
                    style={{ background: 'color-mix(in srgb, var(--agt-blue) 10%, transparent)', color: 'var(--agt-blue)', border: '1px solid color-mix(in srgb, var(--agt-blue) 20%, transparent)' }}
                >
                    Connect Telegram
                </a>
            </div>

            {/* In-app */}
            <div className="mb-6 p-4 rounded-xl flex items-center justify-between" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>In-App Notifications</p>
                        <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Bell icon in dashboard header</p>
                    </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--agt-mint) 10%, transparent)', color: 'var(--agt-mint)' }}>active</span>
            </div>

            <button onClick={onContinue} className="w-full py-4 text-sm font-bold rounded-xl transition-all" style={{ background: 'var(--pp-text-primary)', color: 'var(--pp-bg-primary)' }}>
                Continue
            </button>
            <button onClick={onContinue} className="w-full py-2 mt-2 text-xs text-center transition-colors" style={{ color: 'var(--pp-text-muted)' }}>
                Skip for now
            </button>
        </div>
    );
}

export default function GatewayScreen(props: GatewayProps) {
    const { initOAuth, loading: oauthLoading } = useLoginWithOAuth();
    const { login: privyLogin } = usePrivy();
    const [oauthProvider, setOauthProvider] = useState<string | null>(null);

    const handleOAuthLogin = useCallback(async (provider: 'google' | 'discord' | 'twitter') => {
        try {
            setOauthProvider(provider);
            sessionStorage.setItem('agtfi_oauth_pending', 'true');
            await initOAuth({ provider });
        } catch (e) {
            console.warn(`[Privy] ${provider} OAuth error:`, e);
            setOauthProvider(null);
        }
    }, [initOAuth]);

    const handleEmailLogin = useCallback(async () => {
        try {
            sessionStorage.setItem('agtfi_oauth_pending', 'true');
            await privyLogin({ loginMethods: ['email'] });
        } catch (e) { console.warn('[Privy] Email login error:', e); }
    }, [privyLogin]);

    // No auto-connect here — wallet connection only happens via explicit user action
    // (clicking Google/Wallet buttons above) or via page.tsx OAuth redirect detection

    // Always show Connect screen first if wallet is not connected
    if (!props.walletAddress) {
        return (
            <div className="min-h-screen bg-[var(--pp-bg-card)] flex flex-col items-center justify-center relative overflow-hidden font-sans">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,_rgba(79,70,229,0.10)_0%,_transparent_70%)] pointer-events-none mix-blend-screen"></div>
                <div className="relative z-10 text-center w-full px-4 sm:px-8 max-w-lg mx-auto">
                    <div className="flex flex-col items-center mb-8 animate-in slide-in-from-bottom-4 duration-700">
                        <Image src="/logo-v2.png" alt="Agentic Finance" width={120} height={120} className="h-20 md:h-24 w-auto object-contain mb-6 drop-shadow-[0_0_50px_rgba(255,255,255,0.4)]" priority />
                        <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>Agentic Finance</span>
                    </div>
                    <p className="text-white/40 text-sm font-medium tracking-wide mb-10 animate-in slide-in-from-bottom-6 duration-1000">The Economy Runs on Trust. We Built It for Machines.</p>
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-8 duration-1000 delay-150">
                        <button onClick={() => handleOAuthLogin('google')} disabled={oauthLoading} className="w-full px-6 py-4 bg-white hover:bg-white/90 text-black text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed">
                            {oauthLoading && oauthProvider === 'google' ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            )}
                            {oauthLoading && oauthProvider === 'google' ? 'Redirecting...' : 'Continue with Google'}
                        </button>
                        <button onClick={handleEmailLogin} disabled={oauthLoading} className="w-full px-6 py-4 bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-bold rounded-xl transition-all border border-white/[0.08] hover:border-white/[0.15] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                            Continue with Email
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleOAuthLogin('discord')} disabled={oauthLoading} className="px-4 py-3 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-white text-sm font-bold rounded-xl transition-all border border-[#5865F2]/20 hover:border-[#5865F2]/40 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                                {oauthLoading && oauthProvider === 'discord' ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
                                )}
                                Discord
                            </button>
                            <button onClick={() => handleOAuthLogin('twitter')} disabled={oauthLoading} className="px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-bold rounded-xl transition-all border border-white/[0.08] hover:border-white/[0.15] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                                {oauthLoading && oauthProvider === 'twitter' ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                )}
                                X (Twitter)
                            </button>
                        </div>
                        <div className="flex items-center gap-3 text-white/20 text-xs my-1"><span className="h-px flex-1 bg-white/[0.06]" /><span>or</span><span className="h-px flex-1 bg-white/[0.06]" /></div>
                        <button onClick={props.connectWallet} className="w-full px-6 py-4 bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-bold rounded-xl transition-all border border-white/[0.08] hover:border-white/[0.15] flex items-center justify-center gap-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" /></svg>
                            Connect Web3 Wallet
                        </button>
                        <button onClick={() => { alert('Passkey authentication coming soon! Uses Face ID / Touch ID via WebAuthn P256 on Tempo L1.'); }} className="w-full px-6 py-3 bg-transparent hover:bg-white/[0.03] text-white/30 hover:text-white/50 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11V7a5 5 0 0110 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" /></svg>
                            Sign in with Passkey
                        </button>
                    </div>
                    <p className="text-[10px] text-white/15 mt-8">By continuing, you agree to the Terms of Service and Privacy Policy</p>
                </div>
            </div>
        );
    }

    if (props.currentWorkspace === null && props.walletAddress) {
        return (
            <div className="min-h-screen bg-[var(--pp-bg-card)] flex flex-col items-center justify-center relative overflow-hidden font-sans">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,_rgba(79,70,229,0.10)_0%,_transparent_70%)] pointer-events-none mix-blend-screen"></div>

                <div className="relative z-10 w-full max-w-2xl px-4 sm:px-8">
                    <div className="text-center mb-8 sm:mb-10">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <Image src="/logo-v2.png" alt="Agentic Finance" width={48} height={48} className="h-12 w-12 object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]" priority />
                            <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight dark:drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>Agentic Finance</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Agentic Finance Gateway</h1>
                        <p className="text-gray-500 dark:text-slate-400 text-sm">Welcome to Agentic Finance. Please select your operational protocol.</p>
                    </div>

                    <div className="rounded-3xl p-5 sm:p-8 shadow-2xl transition-all duration-300" style={{ background: 'color-mix(in srgb, var(--pp-bg-card) 95%, transparent)', border: '1px solid var(--pp-border)' }}>
                        {props.gatewayMode === 'Select' && (
                            <div className="animate-in fade-in zoom-in-95">
                                <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-6">
                                    <button onClick={() => props.setGatewayMode('Create')} className="p-4 sm:p-8 rounded-2xl border bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/20 text-center transition-all group">
                                        <div className="w-16 h-16 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">🏢</div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Create Workspace</h3>
                                    </button>
                                    <button onClick={() => props.setGatewayMode('Join')} className="p-4 sm:p-8 rounded-2xl border bg-fuchsia-500/10 border-fuchsia-500/30 hover:border-fuchsia-500/60 hover:bg-fuchsia-500/20 text-center transition-all group">
                                        <div className="w-16 h-16 mx-auto bg-fuchsia-500/20 rounded-full flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">🤝</div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Join Workspace</h3>
                                    </button>
                                </div>
                                <button onClick={props.disconnectWallet} className="w-full py-4 bg-gray-50 dark:bg-white/[0.02] hover:bg-rose-500/10 text-gray-500 dark:text-slate-400 hover:text-rose-400 text-sm font-bold rounded-xl transition-all border border-gray-200 dark:border-white/[0.05] hover:border-rose-500/30">Cancel & Disconnect</button>
                            </div>
                        )}

                        {props.gatewayMode === 'Join' && (
                            <form onSubmit={props.joinWorkspace} className="animate-in fade-in slide-in-from-right-8">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Join Existing Workspace</h3>
                                <div className="mb-8">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Administrator Wallet Address</label>
                                    <input type="text" required autoFocus value={props.joinAdminWallet} onChange={(e) => props.setJoinAdminWallet(e.target.value)} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/[0.1] rounded-xl px-5 py-4 font-mono text-sm text-fuchsia-600 dark:text-fuchsia-300 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none transition-all placeholder-gray-400 dark:placeholder-slate-600 shadow-inner" placeholder="0x..." />
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => props.setGatewayMode('Select')} className="px-6 py-4 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-all border border-gray-200 dark:border-white/[0.05]">Back</button>
                                    <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(217,70,239,0.4)]">Request Access</button>
                                </div>
                            </form>
                        )}

                        {props.gatewayMode === 'Create' && props.setupStep === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-8">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Workspace Configuration</h3>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <button onClick={() => props.setSetupType('Organization')} className={`p-6 rounded-2xl border text-left transition-all ${props.setupType === 'Organization' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)]' : 'bg-gray-50 dark:bg-black/30 border-gray-200 dark:border-white/[0.05] hover:border-gray-300 dark:hover:border-white/[0.1] hover:bg-gray-100 dark:hover:bg-black/50'}`}>
                                        <span className="text-3xl mb-4 block">🏢</span>
                                        <p className="text-base font-bold text-gray-900 dark:text-white mb-1">Organization</p>
                                    </button>
                                    <button onClick={() => props.setSetupType('Personal')} className={`p-6 rounded-2xl border text-left transition-all ${props.setupType === 'Personal' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)]' : 'bg-gray-50 dark:bg-black/30 border-gray-200 dark:border-white/[0.05] hover:border-gray-300 dark:hover:border-white/[0.1] hover:bg-gray-100 dark:hover:bg-black/50'}`}>
                                        <span className="text-3xl mb-4 block">👤</span>
                                        <p className="text-base font-bold text-gray-900 dark:text-white mb-1">Personal Fund</p>
                                    </button>
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => props.setGatewayMode('Select')} className="px-6 py-4 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-all border border-gray-200 dark:border-white/[0.05]">Back</button>
                                    <button onClick={() => props.setSetupStep(2)} className="flex-1 py-4 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-900 dark:text-white text-sm font-bold rounded-xl transition-all border border-gray-200 dark:border-white/[0.1]">Continue →</button>
                                </div>
                            </div>
                        )}

                        {props.gatewayMode === 'Create' && props.setupStep === 2 && (
                            <form onSubmit={(e) => { e.preventDefault(); if (props.setupName.trim()) props.setSetupStep(3); }} className="animate-in fade-in slide-in-from-right-8">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Workspace Identity</h3>
                                <div className="mb-8">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                                        {props.setupType === 'Organization' ? 'Company / DAO Name' : 'Vault Name'}
                                    </label>
                                    <input type="text" required autoFocus value={props.setupName} onChange={(e) => props.setSetupName(e.target.value)} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/[0.1] rounded-xl px-5 py-4 text-lg text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400 dark:placeholder-slate-600 shadow-inner" placeholder={props.setupType === 'Organization' ? "e.g., Apple Inc." : "e.g., John's Savings"} />
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => props.setSetupStep(1)} className="px-6 py-4 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-all border border-gray-200 dark:border-white/[0.05]">Back</button>
                                    <button type="submit" className="flex-1 py-4 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-900 dark:text-white text-sm font-bold rounded-xl transition-all border border-gray-200 dark:border-white/[0.1]">Continue to Security Setup →</button>
                                </div>
                            </form>
                        )}

                        {/* Step 4: Post-creation Setup (Theme + Welcome) — shown after workspace deployed */}
                        {props.gatewayMode === 'Create' && props.setupStep === 4 && (
                            <div className="animate-in fade-in slide-in-from-right-8">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'color-mix(in srgb, var(--agt-mint) 15%, transparent)' }}>
                                        <svg className="w-8 h-8" style={{ color: 'var(--agt-mint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold" style={{ color: 'var(--pp-text-primary)' }}>Workspace Created</h3>
                                    <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>One more step before you start</p>
                                </div>

                                <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                    <ThemeSelector />
                                </div>

                                <button
                                    onClick={() => props.setSetupStep(5)}
                                    className="w-full py-4 text-sm font-bold rounded-xl transition-all"
                                    style={{ background: 'var(--pp-text-primary)', color: 'var(--pp-bg-primary)' }}
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {/* Step 5: Notifications — real email input */}
                        {props.gatewayMode === 'Create' && props.setupStep === 5 && (
                            <NotificationSetup
                                walletAddress={props.walletAddress}
                                workspaceName={props.setupName}
                                onContinue={() => props.setSetupStep(6)}
                            />
                        )}

                        {/* Step 6: Ready! */}
                        {props.gatewayMode === 'Create' && props.setupStep === 6 && (
                            <div className="animate-in fade-in slide-in-from-right-8 text-center">
                                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6" style={{ background: 'color-mix(in srgb, var(--agt-mint) 15%, transparent)' }}>
                                    <svg className="w-10 h-10" style={{ color: 'var(--agt-mint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>

                                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--pp-text-primary)' }}>You're all set!</h3>
                                <p className="text-sm mb-8" style={{ color: 'var(--pp-text-muted)' }}>
                                    Your workspace is ready. Start managing payroll, deploying agents, and streaming payments.
                                </p>

                                <div className="rounded-xl p-4 mb-6 text-left space-y-3" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Workspace</span>
                                        <span className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>{props.setupName || 'My Workspace'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Admin Wallet</span>
                                        <span className="text-xs font-mono" style={{ color: 'var(--pp-text-secondary)' }}>{props.walletAddress?.slice(0, 10)}...{props.walletAddress?.slice(-6)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Network</span>
                                        <span className="text-xs font-mono" style={{ color: 'var(--agt-mint)' }}>Tempo Moderato (42431)</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (props.walletAddress) {
                                            localStorage.setItem(`agtfi_setup_done_${props.walletAddress.toLowerCase()}`, 'true');
                                        }
                                        window.location.href = '/?app=1';
                                    }}
                                    className="w-full py-4 text-sm font-bold rounded-xl transition-all"
                                    style={{ background: 'var(--agt-mint)', color: '#000' }}
                                >
                                    Enter Dashboard
                                </button>
                            </div>
                        )}

                        {props.gatewayMode === 'Create' && props.setupStep === 3 && (
                            <form onSubmit={props.deployWorkspace} className="animate-in fade-in slide-in-from-right-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                    </span>
                                    <h3 className="text-xl font-bold text-rose-400">Critical Security Notice</h3>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 pl-13 leading-relaxed">
                                    In Web3, there is no "Forgot Password". The wallet currently connected will become the <strong className="text-gray-900 dark:text-white">Irreversible Master Administrator</strong>.
                                </p>

                                <div className="space-y-4 mb-8 bg-rose-500/5 border border-rose-500/20 p-5 rounded-2xl">
                                    <label className="flex items-start gap-4 cursor-pointer group">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input type="checkbox" required checked={props.ack1} onChange={(e) => props.setAck1(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-rose-500/40 rounded bg-gray-100 dark:bg-black/50 checked:bg-rose-500 checked:border-rose-500 transition-all cursor-pointer" />
                                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-xs font-bold">✓</span>
                                        </div>
                                        <span className="text-sm text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">I confirm this is a secure cold/hardware wallet, NOT an exchange wallet.</span>
                                    </label>

                                    <label className="flex items-start gap-4 cursor-pointer group">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input type="checkbox" required checked={props.ack2} onChange={(e) => props.setAck2(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-rose-500/40 rounded bg-gray-100 dark:bg-black/50 checked:bg-rose-500 checked:border-rose-500 transition-all cursor-pointer" />
                                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-xs font-bold">✓</span>
                                        </div>
                                        <span className="text-sm text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">I understand that <strong className="text-rose-400">ONLY</strong> this exact wallet address (<code className="bg-gray-100 dark:bg-black/50 px-1 py-0.5 rounded text-xs">{props.walletAddress?.slice(0, 6)}...{props.walletAddress?.slice(-4)}</code>) can authorize payrolls and extract funds.</span>
                                    </label>

                                    <label className="flex items-start gap-4 cursor-pointer group">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input type="checkbox" required checked={props.ack3} onChange={(e) => props.setAck3(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-rose-500/40 rounded bg-gray-100 dark:bg-black/50 checked:bg-rose-500 checked:border-rose-500 transition-all cursor-pointer" />
                                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-xs font-bold">✓</span>
                                        </div>
                                        <span className="text-sm text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">I have securely backed up my 12/24-word Seed Phrase.</span>
                                    </label>
                                </div>

                                <div className="flex gap-4">
                                    <button type="button" onClick={() => props.setSetupStep(2)} className="px-6 py-4 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-all border border-gray-200 dark:border-white/[0.05]">Back</button>
                                    <button type="submit" disabled={!props.ack1 || !props.ack2 || !props.ack3 || props.isDeployingWorkspace} className="flex-1 py-4 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white text-sm font-bold rounded-xl transition-all duration-300 disabled:opacity-30 disabled:grayscale shadow-[0_0_30px_rgba(225,29,72,0.4)]">
                                        {props.isDeployingWorkspace ? 'Deploying...' : 'Sign & Deploy Workspace'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}