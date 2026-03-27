'use client';
import React, { useState } from 'react';

export default function BuySellPage() {
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [crypto, setCrypto] = useState('USDC');
    const [method, setMethod] = useState('card');

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Buy & Sell Crypto</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Purchase crypto with card or bank, or sell to fiat</p>
            </div>

            <div className="max-w-lg mx-auto">
                {/* Mode toggle */}
                <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <button onClick={() => setMode('buy')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: mode === 'buy' ? 'var(--agt-mint)' : 'transparent', color: mode === 'buy' ? '#000' : 'var(--pp-text-muted)' }}>
                        💳 Buy
                    </button>
                    <button onClick={() => setMode('sell')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: mode === 'sell' ? 'var(--agt-orange)' : 'transparent', color: mode === 'sell' ? '#000' : 'var(--pp-text-muted)' }}>
                        💸 Sell
                    </button>
                </div>

                <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    {/* Pay with */}
                    <div>
                        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--pp-text-muted)' }}>{mode === 'buy' ? 'You pay' : 'You sell'}</label>
                        <div className="flex gap-2">
                            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            <select value={mode === 'buy' ? currency : crypto} onChange={e => mode === 'buy' ? setCurrency(e.target.value) : setCrypto(e.target.value)}
                                className="px-3 py-3 rounded-xl text-sm outline-none min-w-[100px]" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                {mode === 'buy' ? <><option>USD</option><option>EUR</option><option>GBP</option><option>VND</option></> : <><option>USDC</option><option>ETH</option><option>AlphaUSD</option></>}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-center"><span className="text-lg">↕️</span></div>

                    {/* You receive */}
                    <div>
                        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--pp-text-muted)' }}>{mode === 'buy' ? 'You receive' : 'You get'}</label>
                        <div className="flex gap-2">
                            <input type="text" readOnly value={amount ? (parseFloat(amount) * (mode === 'buy' ? 0.97 : 0.96)).toFixed(2) : ''}
                                className="flex-1 px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--agt-mint)' }} />
                            <select value={mode === 'buy' ? crypto : currency} onChange={e => mode === 'buy' ? setCrypto(e.target.value) : setCurrency(e.target.value)}
                                className="px-3 py-3 rounded-xl text-sm outline-none min-w-[100px]" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                {mode === 'buy' ? <><option>USDC</option><option>ETH</option><option>AlphaUSD</option></> : <><option>USD</option><option>EUR</option><option>GBP</option><option>VND</option></>}
                            </select>
                        </div>
                    </div>

                    {/* Payment method */}
                    <div>
                        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--pp-text-muted)' }}>Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'card', label: 'Card', icon: '💳' },
                                { id: 'bank', label: 'Bank Transfer', icon: '🏦' },
                                { id: 'apple', label: 'Apple Pay', icon: '🍎' },
                            ].map(m => (
                                <button key={m.id} onClick={() => setMethod(m.id)}
                                    className="py-3 rounded-xl text-xs font-medium text-center transition-all"
                                    style={{ background: method === m.id ? 'var(--pp-surface-2)' : 'var(--pp-surface-1)', border: `1px solid ${method === m.id ? 'var(--agt-blue)' : 'var(--pp-border)'}`, color: 'var(--pp-text-primary)' }}>
                                    <span className="text-lg block mb-1">{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fee info */}
                    {amount && (
                        <div className="p-3 rounded-lg space-y-1" style={{ background: 'var(--pp-surface-1)' }}>
                            <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Rate</span><span>1 {mode === 'buy' ? currency : crypto} = {mode === 'buy' ? '0.97' : '0.96'} {mode === 'buy' ? crypto : currency}</span></div>
                            <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Fee</span><span>{mode === 'buy' ? '3%' : '4%'}</span></div>
                            <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Processing</span><span>1-3 minutes</span></div>
                        </div>
                    )}

                    <button className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                        style={{ background: mode === 'buy' ? 'linear-gradient(135deg, var(--agt-mint), var(--agt-blue))' : 'linear-gradient(135deg, var(--agt-orange), var(--agt-pink))' }}>
                        {mode === 'buy' ? `Buy ${crypto}` : `Sell ${crypto}`}
                    </button>

                    <p className="text-center text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>KYC verification may be required for amounts over $1,000</p>
                </div>
            </div>
        </div>
    );
}
