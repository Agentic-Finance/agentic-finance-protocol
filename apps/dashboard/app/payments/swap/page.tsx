'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

const CHAINS = [
    { id: 1, name: 'Ethereum', key: 'ETH', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg' },
    { id: 137, name: 'Polygon', key: 'POL', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/polygon.svg' },
    { id: 8453, name: 'Base', key: 'BAS', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg' },
    { id: 42161, name: 'Arbitrum', key: 'ARB', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/arbitrum.svg' },
    { id: 10, name: 'Optimism', key: 'OPT', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/optimism.svg' },
    { id: 56, name: 'BNB Chain', key: 'BSC', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/bsc.svg' },
    { id: 43114, name: 'Avalanche', key: 'AVA', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/avalanche.svg' },
];

const TOKENS = [
    { symbol: 'USDC', name: 'USD Coin', logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { symbol: 'USDT', name: 'Tether', logo: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol: 'WBTC', name: 'Wrapped BTC', logo: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
    { symbol: 'DAI', name: 'Dai', logo: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png' },
    { symbol: 'MATIC', name: 'Polygon', logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
];

interface Quote {
    estimate?: { toAmount?: string; toAmountUSD?: string; approvalAddress?: string; executionDuration?: number; gasCosts?: any[] };
    action?: { fromToken?: any; toToken?: any };
    tool?: string;
    toolDetails?: { name?: string; logoURI?: string };
}

export default function SwapPage() {
    const [mode, setMode] = useState<'swap' | 'bridge'>('swap');
    const [fromChain, setFromChain] = useState(CHAINS[0]);
    const [toChain, setToChain] = useState(CHAINS[1]);
    const [fromToken, setFromToken] = useState(TOKENS[0]);
    const [toToken, setToToken] = useState(TOKENS[2]);
    const [fromAmount, setFromAmount] = useState('');
    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(false);
    const [showFromChains, setShowFromChains] = useState(false);
    const [showToChains, setShowToChains] = useState(false);
    const [showFromTokens, setShowFromTokens] = useState(false);
    const [showToTokens, setShowToTokens] = useState(false);

    const fetchQuote = useCallback(async () => {
        if (!fromAmount || parseFloat(fromAmount) <= 0) { setQuote(null); return; }
        setLoading(true);
        try {
            const decimals = fromToken.symbol === 'ETH' || fromToken.symbol === 'WBTC' ? 18 : 6;
            const amount = (parseFloat(fromAmount) * Math.pow(10, decimals)).toFixed(0);
            const fc = mode === 'swap' ? fromChain.key : fromChain.key;
            const tc = mode === 'swap' ? fromChain.key : toChain.key;
            const res = await fetch(`/api/lifi/quote?fromChain=${fc}&toChain=${tc}&fromToken=${fromToken.symbol}&toToken=${toToken.symbol}&fromAmount=${amount}&fromAddress=0x0000000000000000000000000000000000000000`);
            const data = await res.json();
            if (data.estimate) setQuote(data);
            else setQuote(null);
        } catch { setQuote(null); }
        setLoading(false);
    }, [fromAmount, fromChain, toChain, fromToken, toToken, mode]);

    useEffect(() => {
        const t = setTimeout(fetchQuote, 800);
        return () => clearTimeout(t);
    }, [fetchQuote]);

    const swapDirection = () => {
        const tempChain = fromChain; setFromChain(toChain); setToChain(tempChain);
        const tempToken = fromToken; setFromToken(toToken); setToToken(tempToken);
    };

    const toAmountDisplay = quote?.estimate?.toAmount
        ? (parseFloat(quote.estimate.toAmount) / Math.pow(10, toToken.symbol === 'ETH' || toToken.symbol === 'WBTC' ? 18 : 6)).toFixed(6)
        : '0.00';

    const Selector = ({ items, selected, onSelect, show, setShow, type }: any) => (
        <div className="relative">
            <button onClick={() => setShow(!show)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--pp-surface-2)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                {selected.logo && <img src={selected.logo} alt="" className="w-5 h-5 rounded-full" />}
                <span>{type === 'chain' ? selected.name : selected.symbol}</span>
                <svg className="w-3 h-3" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {show && (
                <div className="absolute z-50 mt-1 w-48 rounded-xl py-1 max-h-60 overflow-y-auto"
                    style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                    {items.map((item: any) => (
                        <button key={item.symbol || item.key} onClick={() => { onSelect(item); setShow(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-all hover:opacity-80"
                            style={{ color: 'var(--pp-text-primary)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--pp-surface-1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            {item.logo && <img src={item.logo} alt="" className="w-5 h-5 rounded-full" />}
                            <span>{type === 'chain' ? item.name : `${item.symbol} — ${item.name}`}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Swap & Bridge</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Best rates across 60+ chains — powered by LI.FI</p>
            </div>

            <div className="max-w-md mx-auto">
                {/* Mode toggle */}
                <div className="flex rounded-xl mb-4 p-1" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    {(['swap', 'bridge'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)}
                            className="flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all"
                            style={{ background: mode === m ? 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' : 'transparent', color: mode === m ? '#fff' : 'var(--pp-text-muted)' }}>
                            {m === 'swap' ? '🔄 Swap' : '🌉 Bridge'}
                        </button>
                    ))}
                </div>

                {/* Swap card */}
                <div className="rounded-2xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    {/* FROM */}
                    <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>From</span>
                            {mode === 'bridge' && <Selector items={CHAINS} selected={fromChain} onSelect={setFromChain} show={showFromChains} setShow={setShowFromChains} type="chain" />}
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <input type="number" value={fromAmount} onChange={e => setFromAmount(e.target.value)} placeholder="0.00"
                                className="flex-1 text-2xl font-bold bg-transparent outline-none" style={{ color: 'var(--pp-text-primary)' }} />
                            <Selector items={TOKENS} selected={fromToken} onSelect={setFromToken} show={showFromTokens} setShow={setShowFromTokens} type="token" />
                        </div>
                    </div>

                    {/* Swap direction button */}
                    <div className="flex justify-center -my-1 relative z-10">
                        <button onClick={swapDirection} className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 hover:rotate-180 duration-300"
                            style={{ background: 'var(--pp-bg-card)', border: '2px solid var(--pp-border)', color: 'var(--pp-text-muted)' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                        </button>
                    </div>

                    {/* TO */}
                    <div className="mt-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>To</span>
                            {mode === 'bridge' && <Selector items={CHAINS} selected={toChain} onSelect={setToChain} show={showToChains} setShow={setShowToChains} type="chain" />}
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <div className="flex-1 text-2xl font-bold" style={{ color: loading ? 'var(--pp-text-muted)' : 'var(--pp-text-primary)' }}>
                                {loading ? <span className="animate-pulse">...</span> : toAmountDisplay}
                            </div>
                            <Selector items={TOKENS} selected={toToken} onSelect={setToToken} show={showToTokens} setShow={setShowToTokens} type="token" />
                        </div>
                    </div>

                    {/* Quote details */}
                    {quote && (
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>
                                <span>Rate</span>
                                <span style={{ color: 'var(--pp-text-secondary)' }}>1 {fromToken.symbol} = {(parseFloat(toAmountDisplay) / parseFloat(fromAmount || '1')).toFixed(6)} {toToken.symbol}</span>
                            </div>
                            {quote.estimate?.toAmountUSD && (
                                <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>
                                    <span>Value</span>
                                    <span style={{ color: 'var(--agt-mint)' }}>${parseFloat(quote.estimate.toAmountUSD).toFixed(2)}</span>
                                </div>
                            )}
                            {quote.estimate?.executionDuration && (
                                <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>
                                    <span>Est. time</span>
                                    <span style={{ color: 'var(--pp-text-secondary)' }}>{Math.ceil(quote.estimate.executionDuration / 60)} min</span>
                                </div>
                            )}
                            {quote.toolDetails && (
                                <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>
                                    <span>Route</span>
                                    <div className="flex items-center gap-1">
                                        {quote.toolDetails.logoURI && <img src={quote.toolDetails.logoURI} alt="" className="w-4 h-4 rounded" />}
                                        <span style={{ color: 'var(--pp-text-secondary)' }}>{quote.toolDetails.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action button */}
                    <button disabled={!fromAmount || parseFloat(fromAmount) <= 0 || loading}
                        className="w-full mt-4 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>
                        {loading ? 'Getting best rate...' : !fromAmount ? 'Enter amount' : `${mode === 'swap' ? 'Swap' : 'Bridge'} ${fromToken.symbol} → ${toToken.symbol}`}
                    </button>
                </div>

                {/* Supported chains */}
                <div className="mt-6 text-center">
                    <p className="text-[10px] mb-3 uppercase tracking-wider font-semibold" style={{ color: 'var(--pp-text-muted)' }}>Supported Chains</p>
                    <div className="flex justify-center gap-3 flex-wrap">
                        {CHAINS.map(c => (
                            <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                <img src={c.logo} alt={c.name} className="w-4 h-4 rounded-full" />
                                <span className="text-[10px] font-medium" style={{ color: 'var(--pp-text-secondary)' }}>{c.name}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[9px] mt-3" style={{ color: 'var(--pp-text-muted)' }}>Powered by LI.FI (integrator: agt.finance) — best rate aggregation across 18+ bridges</p>
                </div>
            </div>
        </div>
    );
}
