'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/ui/AppShell';
import dynamic from 'next/dynamic';

const AgentChatView = dynamic(() => import('../components/chat/AgentChatView'), { ssr: false });

export default function ChatPage() {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    useEffect(() => {
        const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
        if (!ethereum) return;

        const handleAccounts = (accounts: string[]) => {
            setWalletAddress(accounts?.[0] || null);
        };

        ethereum.request({ method: 'eth_accounts' }).then(handleAccounts).catch(() => {});
        ethereum.on('accountsChanged', handleAccounts);
        return () => { ethereum.removeListener('accountsChanged', handleAccounts); };
    }, []);

    return (
        <AppShell walletAddress={walletAddress || undefined}>
            <div className="h-[calc(100vh-3.5rem)] -m-6">
                {!walletAddress ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-6xl mb-4 opacity-20">&#128274;</div>
                            <p className="text-slate-400 text-lg font-medium">Connect your wallet</p>
                            <p className="text-slate-600 text-sm mt-1 mb-4">
                                Connect MetaMask to chat with AI agents
                            </p>
                            <button
                                onClick={async () => {
                                    try {
                                        const ethereum = (window as any).ethereum;
                                        if (!ethereum) {
                                            alert('MetaMask not found');
                                            return;
                                        }
                                        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                                        if (accounts?.[0]) setWalletAddress(accounts[0]);
                                    } catch (err) {
                                        console.error('Wallet connect error:', err);
                                    }
                                }}
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
