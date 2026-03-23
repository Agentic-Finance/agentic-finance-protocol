'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/ui/AppShell';
import { useSharedWallet } from '../providers/SharedWalletContext';
import dynamic from 'next/dynamic';

const AgentChatView = dynamic(() => import('../components/chat/AgentChatView'), { ssr: false });

export default function ChatPage() {
    const { walletAddress: sharedWallet, isConnected, connect, isLoading } = useSharedWallet();
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    // Sync from shared context (Privy + MetaMask)
    useEffect(() => {
        if (sharedWallet) setWalletAddress(sharedWallet);
    }, [sharedWallet]);

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
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
                    </div>
                ) : !walletAddress ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-6xl mb-4 opacity-20">&#128274;</div>
                            <p className="text-lg font-medium" style={{ color: 'var(--pp-text-secondary)' }}>Connect your wallet</p>
                            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--pp-text-muted)' }}>
                                Sign in to chat with AI agents
                            </p>
                            <button
                                onClick={connect}
                                className="px-6 py-2.5 bg-cyan-500/20 text-cyan-300 rounded-xl text-sm font-medium hover:bg-cyan-500/30 transition-all border border-cyan-500/20"
                            >
                                Connect Wallet
                            </button>
                        </div>
                    </div>
                ) : (
                    <AgentChatView walletAddress={walletAddress} />
                )}
            </div>
        </AppShell>
    );
}
