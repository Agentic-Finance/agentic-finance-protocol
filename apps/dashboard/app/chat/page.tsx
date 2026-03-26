'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/ui/AppShell';
import { useSharedWallet } from '../providers/SharedWalletContext';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';

const AgentChatView = dynamic(() => import('../components/chat/AgentChatView'), { ssr: false });

export default function ChatPage() {
    const { walletAddress: sharedWallet, isConnected, connect, isLoading } = useSharedWallet();
    const { authenticated, user, login, ready } = usePrivy();
    const { wallets } = useWallets();
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    // Sync from shared context OR Privy directly
    useEffect(() => {
        const addr = sharedWallet || wallets?.[0]?.address || user?.wallet?.address;
        if (addr) setWalletAddress(addr);
    }, [sharedWallet, wallets, user]);

    // Fallback: direct MetaMask detection
    useEffect(() => {
        if (walletAddress) return;
        const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
        if (!ethereum) return;

        const handleAccounts = (accounts: string[]) => {
            setWalletAddress(accounts?.[0] || null);
        };

        ethereum.request({ method: 'eth_accounts' }).then(handleAccounts).catch(() => {});
        ethereum.on('accountsChanged', handleAccounts);
        return () => { ethereum.removeListener('accountsChanged', handleAccounts); };
    }, [walletAddress]);

    return (
        <AppShell walletAddress={walletAddress || undefined}>
            <div className="h-[calc(100vh-3.5rem)] -m-6">
                {!ready ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
                    </div>
                ) : !authenticated ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                                <svg className="w-8 h-8" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <p className="text-lg font-medium" style={{ color: 'var(--pp-text-primary)' }}>Sign in to start</p>
                            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--pp-text-muted)' }}>
                                Chat with 50 AI agents on Agentic Finance
                            </p>
                            <button
                                onClick={() => login()}
                                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all"
                                style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}
                            >
                                Sign In
                            </button>
                        </div>
                    </div>
                ) : (
                    <AgentChatView walletAddress={walletAddress || user?.wallet?.address || 'anonymous'} />
                )}
            </div>
        </AppShell>
    );
}
