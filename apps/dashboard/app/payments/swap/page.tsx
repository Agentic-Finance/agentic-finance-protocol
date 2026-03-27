'use client';
import React, { useState, useEffect, useCallback } from 'react';

const CHAINS = [
    { id: 1, name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', color: '#627EEA' },
    { id: 137, name: 'Polygon', logo: 'https://cryptologos.cc/logos/polygon-matic-logo.svg', color: '#8247E5' },
    { id: 8453, name: 'Base', logo: 'https://raw.githubusercontent.com/base-org/brand-kit/main/logo/symbol/Base_Symbol_Blue.svg', color: '#0052FF' },
    { id: 42161, name: 'Arbitrum', logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg', color: '#28A0F0' },
    { id: 10, name: 'Optimism', logo: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg', color: '#FF0420' },
    { id: 56, name: 'BNB Chain', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg', color: '#F0B90B' },
    { id: 43114, name: 'Avalanche', logo: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg', color: '#E84142' },
];

const TOKENS = [
    { symbol: 'USDC', name: 'USD Coin', logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg', decimals: 6, color: '#2775CA' },
    { symbol: 'USDT', name: 'Tether', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg', decimals: 6, color: '#26A17B' },
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', decimals: 18, color: '#627EEA' },
    { symbol: 'WETH', name: 'Wrapped ETH', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', decimals: 18, color: '#627EEA' },
    { symbol: 'DAI', name: 'Dai', logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg', decimals: 18, color: '#F5AC37' },
    { symbol: 'MATIC', name: 'Polygon', logo: 'https://cryptologos.cc/logos/polygon-matic-logo.svg', decimals: 18, color: '#8247E5' },
    { symbol: 'WBTC', name: 'Wrapped BTC', logo: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.svg', decimals: 8, color: '#F09242' },
];

function TokenIcon({ symbol, size = 24 }: { symbol: string; size?: number }) {
    const token = TOKENS.find(t => t.symbol === symbol);
    if (!token) return <div className="rounded-full flex items-center justify-center text-[10px] font-bold" style={{ width: size, height: size, background: 'var(--pp-surface-2)', color: 'var(--pp-text-muted)' }}>{symbol[0]}</div>;
    return <img src={token.logo} alt={symbol} style={{ width: size, height: size }} className="rounded-full" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
}

function ChainIcon({ chainId, size = 20 }: { chainId: number; size?: number }) {
    const chain = CHAINS.find(c => c.id === chainId);
    if (!chain) return null;
    return <img src={chain.logo} alt={chain.name} style={{ width: size, height: size }} className="rounded-full" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
}

export default function SwapPage() {
    const [mode, setMode] = useState<'swap' | 'bridge'>('swap');
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
            const ft = TOKENS.find(t => t.symbol === fromToken);
            const fromAmount = BigInt(Math.floor(parseFloat(amount) * (10 ** (ft?.decimals || 6)))).toString();
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

    const tt = TOKENS.find(t => t.symbol === toToken);
    const toAmt = quote?.estimate?.toAmount ? (parseFloat(quote.estimate.toAmount) / (10 ** (tt?.decimals || 6))).toFixed(6) : '';

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Swap & Bridge</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Real-time quotes from LI.FI — 60+ chains, best rate aggregation</p>
            </div>

            <div className="max-w-lg mx-auto">
                <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <button onClick={() => setMode('swap')} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                        style={{ background: mode === 'swap' ? 'var(--agt-blue)' : 'transparent', color: mode === 'swap' ? '#fff' : 'var(--pp-text-muted)' }}>🔄 Swap</button>
                    <button onClick={() => setMode('bridge')} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                        style={{ background: mode === 'bridge' ? 'var(--agt-blue)' : 'transparent', color: mode === 'bridge' ? '#fff' : 'var(--pp-text-muted)' }}>🌉 Bridge</button>
                </div>

                <div className="rounded-xl p-6 space-y-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    {/* From */}
                    <div>
                        <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--pp-text-muted)' }}>FROM</label>
                        <div className="flex gap-2">
                            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                                className="flex-1 px-4 py-3.5 rounded-xl text-xl font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            <div className="relative">
                                <select value={fromToken} onChange={e => setFromToken(e.target.value)}
                                    className="appearance-none pl-10 pr-6 py-3.5 rounded-xl text-sm font-medium outline-none min-w-[130px]"
                                    style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                    {TOKENS.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><TokenIcon symbol={fromToken} size={20} /></div>
                            </div>
                        </div>
                        {mode === 'bridge' && (
                            <div className="mt-2 relative">
                                <select value={fromChain} onChange={e => setFromChain(Number(e.target.value))}
                                    className="appearance-none w-full pl-10 pr-4 py-2.5 rounded-lg text-xs font-medium outline-none"
                                    style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                    {CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChainIcon chainId={fromChain} size={16} /></div>
                            </div>
                        )}
                    </div>

                    {/* Swap button */}
                    <div className="flex justify-center -my-1">
                        <button onClick={() => { setFromToken(toToken); setToToken(fromToken); if (mode === 'bridge') { setFromChain(toChain); setToChain(fromChain); } }}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 hover:rotate-180"
                            style={{ background: 'var(--pp-surface-2)', border: '2px solid var(--pp-border)' }}>
                            <svg className="w-4 h-4" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                        </button>
                    </div>

                    {/* To */}
                    <div>
                        <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--pp-text-muted)' }}>
                            TO {loading && <span className="ml-1 text-[10px] font-normal animate-pulse" style={{ color: 'var(--agt-blue)' }}>fetching best route...</span>}
                        </label>
                        <div className="flex gap-2">
                            <input readOnly value={toAmt} placeholder="0.00"
                                className="flex-1 px-4 py-3.5 rounded-xl text-xl font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: toAmt ? 'var(--agt-mint)' : 'var(--pp-text-muted)' }} />
                            <div className="relative">
                                <select value={toToken} onChange={e => setToToken(e.target.value)}
                                    className="appearance-none pl-10 pr-6 py-3.5 rounded-xl text-sm font-medium outline-none min-w-[130px]"
                                    style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                    {TOKENS.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><TokenIcon symbol={toToken} size={20} /></div>
                            </div>
                        </div>
                        {mode === 'bridge' && (
                            <div className="mt-2 relative">
                                <select value={toChain} onChange={e => setToChain(Number(e.target.value))}
                                    className="appearance-none w-full pl-10 pr-4 py-2.5 rounded-lg text-xs font-medium outline-none"
                                    style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                    {CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChainIcon chainId={toChain} size={16} /></div>
                            </div>
                        )}
                    </div>

                    {error && <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>{error}</div>}

                    {/* Quote details */}
                    {quote?.estimate && (
                        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--pp-surface-1)' }}>
                            {quote.toolDetails && (
                                <div className="flex items-center justify-between text-xs">
                                    <span style={{ color: 'var(--pp-text-muted)' }}>Best route</span>
                                    <div className="flex items-center gap-1.5">
                                        {quote.toolDetails.logoURI && <img src={quote.toolDetails.logoURI} alt="" className="w-4 h-4 rounded" />}
                                        <span className="font-medium" style={{ color: 'var(--agt-blue)' }}>{quote.toolDetails.name}</span>
                                    </div>
                                </div>
                            )}
                            {quote.estimate.toAmountUSD && <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Value</span><span className="font-mono font-medium" style={{ color: 'var(--agt-mint)' }}>~${parseFloat(quote.estimate.toAmountUSD).toFixed(2)}</span></div>}
                            {quote.estimate.executionDuration && <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Time</span><span>{quote.estimate.executionDuration < 60 ? `${quote.estimate.executionDuration}s` : `~${Math.ceil(quote.estimate.executionDuration / 60)} min`}</span></div>}
                            {quote.estimate.gasCosts?.[0]?.amountUSD && <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Gas</span><span>~${parseFloat(quote.estimate.gasCosts[0].amountUSD).toFixed(4)}</span></div>}
                        </div>
                    )}

                    <button disabled={!quote || loading} className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>
                        {loading ? '⏳ Finding best route...' : mode === 'swap' ? `Swap ${fromToken} → ${toToken}` : `Bridge to ${CHAINS.find(c => c.id === toChain)?.name}`}
                    </button>
                </div>

                {/* Supported chains */}
                <div className="mt-6 rounded-xl p-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--pp-text-muted)' }}>SUPPORTED CHAINS</p>
                    <div className="flex flex-wrap gap-2">
                        {CHAINS.map(c => (
                            <div key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                <img src={c.logo} alt={c.name} className="w-4 h-4 rounded-full" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <span className="text-[11px] font-medium" style={{ color: 'var(--pp-text-secondary)' }}>{c.name}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--pp-text-muted)' }}>Powered by LI.FI (integrator: agt.finance) — 60+ chains, 18+ bridges</p>
                </div>
            </div>
        </div>
    );
}
