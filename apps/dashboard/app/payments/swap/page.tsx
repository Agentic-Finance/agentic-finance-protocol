'use client';
import React, { useState, useEffect, useCallback } from 'react';

const CHAINS = [
    { id: 1, name: 'Ethereum', icon: '🔷' },
    { id: 137, name: 'Polygon', icon: '🟣' },
    { id: 8453, name: 'Base', icon: '🔵' },
    { id: 42161, name: 'Arbitrum', icon: '🟦' },
    { id: 10, name: 'Optimism', icon: '🔴' },
    { id: 56, name: 'BNB Chain', icon: '🟡' },
];
const TOKENS = ['USDC', 'USDT', 'ETH', 'WETH', 'DAI', 'MATIC', 'WBTC'];

export default function SwapPage() {
    const [mode, setMode] = useState<'swap'|'bridge'>('swap');
    const [fromChain, setFromChain] = useState(137);
    const [toChain, setToChain] = useState(1);
    const [fromToken, setFromToken] = useState('USDC');
    const [toToken, setToToken] = useState('ETH');
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchQuote = useCallback(async () => {
        if (!amount || parseFloat(amount) <= 0) { setQuote(null); return; }
        setLoading(true); setError('');
        try {
            const decimals = ['ETH','WETH','MATIC'].includes(fromToken) ? 18 : 6;
            const fromAmount = BigInt(Math.floor(parseFloat(amount) * (10 ** decimals))).toString();
            const fc = mode === 'swap' ? fromChain : fromChain;
            const tc = mode === 'swap' ? fromChain : toChain;
            const res = await fetch(`/api/lifi/quote?fromChain=${fc}&toChain=${tc}&fromToken=${fromToken}&toToken=${toToken}&fromAmount=${fromAmount}&fromAddress=0x0000000000000000000000000000000000000000`);
            const data = await res.json();
            if (data.message || data.error) { setError(data.message || data.error); setQuote(null); }
            else setQuote(data);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [amount, fromChain, toChain, fromToken, toToken, mode]);

    useEffect(() => { const t = setTimeout(fetchQuote, 800); return () => clearTimeout(t); }, [fetchQuote]);

    const toAmt = quote?.estimate?.toAmount ? (parseFloat(quote.estimate.toAmount) / (10 ** (['ETH','WETH','MATIC'].includes(toToken) ? 18 : 6))).toFixed(6) : '';

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Swap & Bridge</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Real-time quotes from LI.FI — 60+ chains, best rate aggregation</p>
            </div>
            <div className="max-w-lg mx-auto">
                <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <button onClick={() => setMode('swap')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all" style={{ background: mode==='swap'?'var(--agt-blue)':'transparent', color: mode==='swap'?'#fff':'var(--pp-text-muted)' }}>🔄 Swap</button>
                    <button onClick={() => setMode('bridge')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all" style={{ background: mode==='bridge'?'var(--agt-blue)':'transparent', color: mode==='bridge'?'#fff':'var(--pp-text-muted)' }}>🌉 Bridge</button>
                </div>
                <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    <div>
                        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--pp-text-muted)' }}>From</label>
                        <div className="flex gap-2">
                            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            <select value={fromToken} onChange={e => setFromToken(e.target.value)} className="px-3 py-3 rounded-xl text-sm outline-none min-w-[100px]" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>{TOKENS.map(t => <option key={t}>{t}</option>)}</select>
                        </div>
                        {mode==='bridge' && <select value={fromChain} onChange={e => setFromChain(Number(e.target.value))} className="mt-2 w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>{CHAINS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>}
                    </div>
                    <div className="flex justify-center">
                        <button onClick={() => { setFromToken(toToken); setToToken(fromToken); }} className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all" style={{ background: 'var(--pp-surface-2)', border: '1px solid var(--pp-border)' }}>↕️</button>
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--pp-text-muted)' }}>To {loading && <span className="ml-1 text-[10px]" style={{ color: 'var(--agt-blue)' }}>fetching...</span>}</label>
                        <div className="flex gap-2">
                            <input readOnly value={toAmt} className="flex-1 px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--agt-mint)' }} />
                            <select value={toToken} onChange={e => setToToken(e.target.value)} className="px-3 py-3 rounded-xl text-sm outline-none min-w-[100px]" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>{TOKENS.map(t => <option key={t}>{t}</option>)}</select>
                        </div>
                        {mode==='bridge' && <select value={toChain} onChange={e => setToChain(Number(e.target.value))} className="mt-2 w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>{CHAINS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>}
                    </div>
                    {error && <p className="text-xs p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>{error}</p>}
                    {quote?.estimate && (
                        <div className="p-3 rounded-lg space-y-1" style={{ background: 'var(--pp-surface-1)' }}>
                            {quote.toolDetails && <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Route</span><span style={{ color: 'var(--agt-blue)' }}>{quote.toolDetails.name}</span></div>}
                            {quote.estimate.toAmountUSD && <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Value</span><span style={{ color: 'var(--agt-mint)' }}>~${parseFloat(quote.estimate.toAmountUSD).toFixed(2)}</span></div>}
                            {quote.estimate.executionDuration && <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Time</span><span>{quote.estimate.executionDuration < 60 ? `${quote.estimate.executionDuration}s` : `${Math.ceil(quote.estimate.executionDuration/60)} min`}</span></div>}
                            {quote.estimate.gasCosts?.[0]?.amountUSD && <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Gas</span><span>~${parseFloat(quote.estimate.gasCosts[0].amountUSD).toFixed(4)}</span></div>}
                        </div>
                    )}
                    <button disabled={!quote||loading} className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>
                        {loading ? 'Finding best route...' : mode==='swap' ? `Swap ${fromToken} → ${toToken}` : `Bridge to ${CHAINS.find(c => c.id===toChain)?.name}`}
                    </button>
                </div>
                <p className="text-center text-[10px] mt-4" style={{ color: 'var(--pp-text-muted)' }}>Powered by LI.FI (integrator: agt.finance) — real-time quotes, best rate aggregation</p>
            </div>
        </div>
    );
}
