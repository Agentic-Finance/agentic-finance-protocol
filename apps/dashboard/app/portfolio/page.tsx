'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '../components/ui/AppShell';
import { useSharedWallet } from '../providers/SharedWalletContext';
import { usePrivy, useWallets } from '@privy-io/react-auth';

type Tab = 'overview' | 'tokens' | 'nfts' | 'defi' | 'history' | 'watch';

const CHAINS = [
    { id: 1, name: 'Ethereum', key: 'ETH', color: '#627EEA', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg' },
    { id: 137, name: 'Polygon', key: 'POL', color: '#8247E5', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/polygon.svg' },
    { id: 8453, name: 'Base', key: 'BAS', color: '#0052FF', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg' },
    { id: 42161, name: 'Arbitrum', key: 'ARB', color: '#12AAFF', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/arbitrum.svg' },
    { id: 10, name: 'Optimism', key: 'OPT', color: '#FF0420', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/optimism.svg' },
    { id: 42431, name: 'Tempo', key: 'TEMPO', color: '#3EDDB9', logo: '/logo-v2.png' },
];

interface TokenBalance {
    symbol: string;
    name: string;
    balance: string;
    valueUSD: number;
    chain: string;
    chainLogo: string;
    chainColor: string;
    change24h: number;
    logo: string;
    address: string;
}

interface WatchedWallet {
    address: string;
    label: string;
    totalValue: number;
}

interface TxHistory {
    hash: string;
    type: string;
    amount: string;
    token: string;
    to: string;
    timestamp: string;
    status: string;
    chain: string;
}

export default function PortfolioPage() {
    const { walletAddress: sharedWallet } = useSharedWallet();
    const { authenticated, user, login } = usePrivy();
    const { wallets } = useWallets();
    const walletAddress = sharedWallet || wallets?.[0]?.address || user?.wallet?.address;

    const [tab, setTab] = useState<Tab>('overview');
    const [tokens, setTokens] = useState<TokenBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalValue, setTotalValue] = useState(0);
    const [watchedWallets, setWatchedWallets] = useState<WatchedWallet[]>([]);
    const [newWatchAddr, setNewWatchAddr] = useState('');
    const [newWatchLabel, setNewWatchLabel] = useState('');
    const [txHistory, setTxHistory] = useState<TxHistory[]>([]);
    const [selectedChain, setSelectedChain] = useState<string>('all');

    const [defiPositions, setDefiPositions] = useState<any[]>([]);
    const [defiTotal, setDefiTotal] = useState(0);

    // Fetch REAL balances from multi-chain API
    const fetchBalances = useCallback(async () => {
        if (!walletAddress) return;
        setLoading(true);

        // 1. Real multi-chain balances (Tempo on-chain + LI.FI for ETH/Polygon/Base/etc.)
        try {
            const res = await fetch(`/api/portfolio/balances?wallet=${walletAddress}`);
            const data = await res.json();
            if (data.tokens) setTokens(data.tokens);
            if (data.totalValue != null) setTotalValue(data.totalValue);
        } catch {}

        // 2. Real DeFi positions (on-chain contract balances)
        try {
            const res = await fetch(`/api/portfolio/defi?wallet=${walletAddress}`);
            const data = await res.json();
            if (data.positions) setDefiPositions(data.positions);
            if (data.totalValue != null) setDefiTotal(data.totalValue);
        } catch {}

        // 3. Transaction history
        try {
            const res = await fetch(`/api/employee-portal?wallet=${walletAddress}`);
            const data = await res.json();
            if (data.history) {
                setTxHistory(data.history.slice(0, 20).map((h: any) => ({
                    hash: h.txHash || h.id,
                    type: h.isShielded ? 'Shield Payment' : 'Transfer',
                    amount: h.amount || '0',
                    token: h.token || 'AlphaUSD',
                    to: h.recipientWallet?.slice(0, 8) + '...' || '',
                    timestamp: h.executedAt || h.createdAt,
                    status: h.status === 'settled' ? 'Confirmed' : 'Pending',
                    chain: 'Tempo',
                })));
            }
        } catch {}

        setLoading(false);
    }, [walletAddress]);

    useEffect(() => { fetchBalances(); }, [fetchBalances]);

    // Load watched wallets from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('agtfi_watched_wallets');
            if (saved) setWatchedWallets(JSON.parse(saved));
        } catch {}
    }, []);

    const addWatchedWallet = () => {
        if (!newWatchAddr.trim()) return;
        const w: WatchedWallet = { address: newWatchAddr.trim(), label: newWatchLabel.trim() || `Wallet ${watchedWallets.length + 1}`, totalValue: 0 };
        const updated = [...watchedWallets, w];
        setWatchedWallets(updated);
        localStorage.setItem('agtfi_watched_wallets', JSON.stringify(updated));
        setNewWatchAddr('');
        setNewWatchLabel('');
    };

    const removeWatchedWallet = (addr: string) => {
        const updated = watchedWallets.filter(w => w.address !== addr);
        setWatchedWallets(updated);
        localStorage.setItem('agtfi_watched_wallets', JSON.stringify(updated));
    };

    const filteredTokens = selectedChain === 'all' ? tokens : tokens.filter(t => t.chain === selectedChain);

    if (!authenticated) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center max-w-sm">
                        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                            <svg className="w-8 h-8" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" /></svg>
                        </div>
                        <p className="text-lg font-bold" style={{ color: 'var(--pp-text-primary)' }}>Sign in to view portfolio</p>
                        <p className="text-sm mt-1 mb-4" style={{ color: 'var(--pp-text-muted)' }}>Track balances, escrows, and reputation across chains</p>
                        <button onClick={() => login()} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>Sign In</button>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell walletAddress={walletAddress || undefined}>
            <div style={{ color: 'var(--pp-text-primary)' }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Portfolio</h1>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>Multi-chain financial overview</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--pp-text-muted)' }}>Net Worth</p>
                        <p className="text-3xl font-bold" style={{ color: 'var(--pp-text-primary)' }}>
                            {loading ? <span className="animate-pulse">...</span> : `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                        <div className="flex items-center gap-2 justify-end mt-1">
                            {CHAINS.slice(0, 5).map(c => (
                                <img key={c.id} src={c.logo} alt={c.name} className="w-4 h-4 rounded-full" title={c.name} />
                            ))}
                            <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>+{CHAINS.length - 5} chains</span>
                        </div>
                    </div>
                </div>

                {/* Wallet address bar */}
                <div className="flex items-center gap-3 p-3 rounded-xl mb-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))', color: '#fff' }}>
                        {walletAddress?.slice(2, 4) || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate" style={{ color: 'var(--pp-text-primary)' }}>{walletAddress}</p>
                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Connected via Privy</p>
                    </div>
                    <button onClick={() => { if (walletAddress) navigator.clipboard.writeText(walletAddress); }}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
                        style={{ background: 'var(--pp-surface-2)', color: 'var(--pp-text-muted)', border: '1px solid var(--pp-border)' }}>
                        Copy
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
                    {([
                        { id: 'overview' as Tab, label: 'Overview', icon: '📊' },
                        { id: 'tokens' as Tab, label: 'Tokens', icon: '🪙' },
                        { id: 'nfts' as Tab, label: 'NFTs', icon: '🖼️' },
                        { id: 'defi' as Tab, label: 'DeFi', icon: '🏦' },
                        { id: 'history' as Tab, label: 'History', icon: '📜' },
                        { id: 'watch' as Tab, label: 'Watch', icon: '👁️' },
                    ]).map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all"
                            style={{ background: tab === t.id ? 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' : 'var(--pp-surface-1)', color: tab === t.id ? '#fff' : 'var(--pp-text-muted)', border: `1px solid ${tab === t.id ? 'transparent' : 'var(--pp-border)'}` }}>
                            <span>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>

                {/* OVERVIEW */}
                {tab === 'overview' && (
                    <div className="space-y-6">
                        {/* Chain breakdown */}
                        <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>Chain Distribution</h3>
                            <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden mb-4" style={{ background: 'var(--pp-surface-1)' }}>
                                {totalValue > 0 ? CHAINS.map(c => {
                                    const chainTotal = tokens.filter(t => t.chain === c.name).reduce((s, t) => s + t.valueUSD, 0);
                                    const pct = (chainTotal / totalValue) * 100;
                                    return pct > 0 ? <div key={c.id} style={{ width: `${pct}%`, background: c.color, minWidth: '4px' }} className="h-full" title={`${c.name}: $${chainTotal.toFixed(2)}`} /> : null;
                                }) : <div className="h-full w-full" style={{ background: 'var(--pp-surface-2)' }} />}
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                {CHAINS.map(c => {
                                    const chainTotal = tokens.filter(t => t.chain === c.name).reduce((s, t) => s + t.valueUSD, 0);
                                    return (
                                        <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                            <img src={c.logo} alt="" className="w-5 h-5 rounded-full" />
                                            <div>
                                                <p className="text-[10px] font-medium" style={{ color: 'var(--pp-text-primary)' }}>{c.name}</p>
                                                <p className="text-[9px] font-mono" style={{ color: chainTotal > 0 ? 'var(--agt-mint)' : 'var(--pp-text-muted)' }}>${chainTotal.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Tokens', value: tokens.length.toString(), icon: '🪙', color: 'var(--agt-blue)' },
                                { label: 'Chains', value: [...new Set(tokens.map(t => t.chain))].length.toString(), icon: '⛓️', color: 'var(--agt-mint)' },
                                { label: 'Transactions', value: txHistory.length.toString(), icon: '📝', color: 'var(--agt-pink)' },
                                { label: 'Watched', value: watchedWallets.length.toString(), icon: '👁️', color: 'var(--agt-orange)' },
                            ].map(s => (
                                <div key={s.label} className="p-4 rounded-xl" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{s.icon}</span>
                                        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</span>
                                    </div>
                                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Top tokens */}
                        <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>Top Holdings</h3>
                            {tokens.filter(t => t.valueUSD > 0).length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>No tokens found. Fund your wallet to get started.</p>
                                </div>
                            ) : (
                                tokens.filter(t => t.valueUSD > 0).sort((a, b) => b.valueUSD - a.valueUSD).slice(0, 5).map(t => (
                                    <div key={t.symbol + t.chain} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                                        <div className="relative">
                                            <img src={t.logo} alt="" className="w-9 h-9 rounded-full" />
                                            <img src={t.chainLogo} alt="" className="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border-2" style={{ borderColor: 'var(--pp-bg-card)' }} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{t.symbol}</p>
                                            <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{t.chain}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-mono font-semibold" style={{ color: 'var(--pp-text-primary)' }}>${t.valueUSD.toFixed(2)}</p>
                                            <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{t.balance} {t.symbol}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* TOKENS */}
                {tab === 'tokens' && (
                    <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>All Tokens</h3>
                            <div className="flex gap-1">
                                <button onClick={() => setSelectedChain('all')} className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                                    style={{ background: selectedChain === 'all' ? 'var(--agt-blue)' : 'var(--pp-surface-1)', color: selectedChain === 'all' ? '#fff' : 'var(--pp-text-muted)' }}>All</button>
                                {CHAINS.map(c => (
                                    <button key={c.id} onClick={() => setSelectedChain(c.name)} className="px-2 py-1 rounded-lg"
                                        style={{ background: selectedChain === c.name ? 'var(--pp-surface-2)' : 'transparent' }}>
                                        <img src={c.logo} alt={c.name} className="w-4 h-4 rounded-full" title={c.name} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Token header */}
                        <div className="grid grid-cols-12 gap-2 pb-2 mb-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--pp-text-muted)', borderBottom: '1px solid var(--pp-border)' }}>
                            <div className="col-span-5">Token</div>
                            <div className="col-span-3 text-right">Balance</div>
                            <div className="col-span-2 text-right">Value</div>
                            <div className="col-span-2 text-right">Chain</div>
                        </div>

                        {filteredTokens.map(t => (
                            <div key={t.symbol + t.chain} className="grid grid-cols-12 gap-2 items-center py-3 transition-all hover:opacity-80" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                                <div className="col-span-5 flex items-center gap-3">
                                    <div className="relative flex-shrink-0">
                                        <img src={t.logo} alt="" className="w-8 h-8 rounded-full" />
                                        <img src={t.chainLogo} alt="" className="w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2" style={{ borderColor: 'var(--pp-bg-card)' }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{t.symbol}</p>
                                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{t.name}</p>
                                    </div>
                                </div>
                                <div className="col-span-3 text-right">
                                    <p className="text-sm font-mono" style={{ color: 'var(--pp-text-primary)' }}>{t.balance}</p>
                                </div>
                                <div className="col-span-2 text-right">
                                    <p className="text-sm font-mono font-semibold" style={{ color: t.valueUSD > 0 ? 'var(--agt-mint)' : 'var(--pp-text-muted)' }}>${t.valueUSD.toFixed(2)}</p>
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: `${t.chainColor}15` }}>
                                        <img src={t.chainLogo} alt="" className="w-3 h-3 rounded-full" />
                                        <span className="text-[9px] font-medium" style={{ color: t.chainColor }}>{t.chain}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* NFTs */}
                {tab === 'nfts' && (
                    <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>NFT Collection</h3>
                        <div className="text-center py-12">
                            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                                <span className="text-2xl">🖼️</span>
                            </div>
                            <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>No NFTs found</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>NFTs on supported chains will appear here automatically</p>
                        </div>
                    </div>
                )}

                {/* DeFi */}
                {tab === 'defi' && (
                    <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>DeFi Positions</h3>
                            <span className="text-sm font-mono font-bold" style={{ color: 'var(--agt-mint)' }}>TVL: ${defiTotal.toFixed(2)}</span>
                        </div>
                        <div className="space-y-3">
                            {defiPositions.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>Loading on-chain positions...</p>
                                </div>
                            ) : defiPositions.map(p => (
                                <div key={p.protocol} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                    <span className="text-2xl">{p.icon}</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{p.protocol}</p>
                                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{p.description}</p>
                                        <p className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{p.address?.slice(0, 10)}...{p.address?.slice(-6)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono font-bold" style={{ color: p.value > 0 ? 'var(--agt-mint)' : 'var(--pp-text-muted)' }}>{p.valueFormatted}</p>
                                        <p className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>{p.type} on {p.chain}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* HISTORY */}
                {tab === 'history' && (
                    <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>Transaction History</h3>
                        {txHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>No transactions yet</p>
                            </div>
                        ) : (
                            txHistory.map((tx, i) => (
                                <div key={tx.hash + i} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: tx.type.includes('Shield') ? 'rgba(62,221,185,0.1)' : 'var(--pp-surface-1)' }}>
                                        <span className="text-sm">{tx.type.includes('Shield') ? '🛡️' : '↗️'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>{tx.type}</p>
                                        <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>to {tx.to}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{tx.amount} {tx.token}</p>
                                        <p className="text-[10px]" style={{ color: tx.status === 'Confirmed' ? 'var(--agt-mint)' : 'var(--agt-orange)' }}>{tx.status}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* WATCH */}
                {tab === 'watch' && (
                    <div className="space-y-4">
                        <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>Watch Wallets</h3>
                            <p className="text-xs mb-4" style={{ color: 'var(--pp-text-muted)' }}>Track other wallets without connecting them. Great for monitoring DAO treasuries, team wallets, or competitor activity.</p>

                            <div className="flex gap-2 mb-4">
                                <input type="text" placeholder="Wallet address (0x...)" value={newWatchAddr} onChange={e => setNewWatchAddr(e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                <input type="text" placeholder="Label" value={newWatchLabel} onChange={e => setNewWatchLabel(e.target.value)}
                                    className="w-28 px-3 py-2 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                <button onClick={addWatchedWallet} disabled={!newWatchAddr.trim()}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40" style={{ background: 'var(--agt-blue)' }}>Watch</button>
                            </div>

                            {watchedWallets.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="text-3xl mb-2 block">👁️</span>
                                    <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>No watched wallets yet</p>
                                </div>
                            ) : (
                                watchedWallets.map(w => (
                                    <div key={w.address} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, var(--agt-mint), var(--agt-blue))', color: '#fff' }}>
                                            {w.address.slice(2, 4)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>{w.label}</p>
                                            <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{w.address.slice(0, 10)}...{w.address.slice(-6)}</p>
                                        </div>
                                        <button onClick={() => removeWatchedWallet(w.address)} className="text-xs px-2 py-1 rounded-lg" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>Remove</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
