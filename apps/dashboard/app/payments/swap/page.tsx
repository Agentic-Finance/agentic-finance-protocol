'use client';
import React, { useState } from 'react';

const CHAINS = [
    { id: 'tempo', name: 'Tempo L1', icon: '⚡', chainId: 42431 },
    { id: 'ethereum', name: 'Ethereum', icon: '🔷', chainId: 1 },
    { id: 'base', name: 'Base', icon: '🔵', chainId: 8453 },
    { id: 'arbitrum', name: 'Arbitrum', icon: '🟦', chainId: 42161 },
    { id: 'polygon', name: 'Polygon', icon: '🟣', chainId: 137 },
];

const TOKENS = [
    { symbol: 'AlphaUSD', name: 'Alpha USD', icon: '💰' },
    { symbol: 'USDC', name: 'USD Coin', icon: '🔵' },
    { symbol: 'ETH', name: 'Ethereum', icon: '🔷' },
    { symbol: 'pathUSD', name: 'Path USD', icon: '💲' },
];

export default function SwapBridgePage() {
    const [mode, setMode] = useState<'swap' | 'bridge'>('swap');
    const [fromToken, setFromToken] = useState('AlphaUSD');
    const [toToken, setToToken] = useState('USDC');
    const [fromChain, setFromChain] = useState('tempo');
    const [toChain, setToChain] = useState('base');
    const [amount, setAmount] = useState('');

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Swap & Bridge</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Swap tokens or bridge across chains — powered by LI.FI aggregator</p>
            </div>

            <div className="max-w-lg mx-auto">
                {/* Mode toggle */}
                <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <button onClick={() => setMode('swap')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: mode === 'swap' ? 'var(--agt-blue)' : 'transparent', color: mode === 'swap' ? '#fff' : 'var(--pp-text-muted)' }}>
                        🔄 Swap
                    </button>
                    <button onClick={() => setMode('bridge')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: mode === 'bridge' ? 'var(--agt-blue)' : 'transparent', color: mode === 'bridge' ? '#fff' : 'var(--pp-text-muted)' }}>
                        🌉 Bridge
                    </button>
                </div>

                <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    {/* From */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium" style={{ color: 'var(--pp-text-muted)' }}>From</label>
                            <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Balance: 10,015.34</span>
                        </div>
                        <div className="flex gap-2">
                            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            <select value={fromToken} onChange={e => setFromToken(e.target.value)}
                                className="px-3 py-3 rounded-xl text-sm outline-none min-w-[120px]" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                {TOKENS.map(t => <option key={t.symbol} value={t.symbol}>{t.icon} {t.symbol}</option>)}
                            </select>
                        </div>
                        {mode === 'bridge' && (
                            <select value={fromChain} onChange={e => setFromChain(e.target.value)}
                                className="mt-2 w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                {CHAINS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Swap arrow */}
                    <div className="flex justify-center">
                        <button onClick={() => { setFromToken(toToken); setToToken(fromToken); if (mode === 'bridge') { setFromChain(toChain); setToChain(fromChain); } }}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: 'var(--pp-surface-2)', border: '1px solid var(--pp-border)' }}>
                            ↕️
                        </button>
                    </div>

                    {/* To */}
                    <div>
                        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--pp-text-muted)' }}>To</label>
                        <div className="flex gap-2">
                            <input type="text" placeholder="0.00" readOnly value={amount ? (parseFloat(amount) * 0.998).toFixed(2) : ''}
                                className="flex-1 px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--agt-mint)' }} />
                            <select value={toToken} onChange={e => setToToken(e.target.value)}
                                className="px-3 py-3 rounded-xl text-sm outline-none min-w-[120px]" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                {TOKENS.map(t => <option key={t.symbol} value={t.symbol}>{t.icon} {t.symbol}</option>)}
                            </select>
                        </div>
                        {mode === 'bridge' && (
                            <select value={toChain} onChange={e => setToChain(e.target.value)}
                                className="mt-2 w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                {CHAINS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Rate info */}
                    {amount && (
                        <div className="p-3 rounded-lg space-y-1" style={{ background: 'var(--pp-surface-1)' }}>
                            <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Rate</span><span>1 {fromToken} = 0.998 {toToken}</span></div>
                            <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Fee</span><span style={{ color: 'var(--agt-mint)' }}>0.2%</span></div>
                            <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Estimated time</span><span>{mode === 'bridge' ? '2-5 min' : '< 10 sec'}</span></div>
                            {mode === 'bridge' && <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Route</span><span style={{ color: 'var(--agt-blue)' }}>LI.FI → Best route</span></div>}
                        </div>
                    )}

                    <button className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>
                        {mode === 'swap' ? `Swap ${fromToken} → ${toToken}` : `Bridge to ${CHAINS.find(c => c.id === toChain)?.name}`}
                    </button>
                </div>

                <p className="text-center text-[10px] mt-4" style={{ color: 'var(--pp-text-muted)' }}>Powered by LI.FI — 60+ chains, 18+ bridges, best rate aggregation</p>
            </div>
        </div>
    );
}
