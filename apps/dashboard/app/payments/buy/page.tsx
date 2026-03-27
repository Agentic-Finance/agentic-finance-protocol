'use client';
import React, { useState } from 'react';

type Tab = 'buy' | 'sell' | 'visa' | 'gift';

const CRYPTO_OPTIONS = [
    { symbol: 'USDC', name: 'USD Coin', icon: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { symbol: 'USDT', name: 'Tether', icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
];

const SELL_OPTIONS = [
    { id: 'venmo', name: 'Venmo', icon: 'https://cdn.worldvectorlogo.com/logos/venmo-2.svg', desc: 'Instant transfer to Venmo account', isImg: true },
    { id: 'paypal', name: 'PayPal', icon: 'https://cdn.worldvectorlogo.com/logos/paypal-icon.svg', desc: 'Send to PayPal email', isImg: true },
    { id: 'bank', name: 'Bank Transfer', icon: '', desc: 'ACH/Wire to bank account', isImg: false, emoji: '🏦' },
];

const GIFT_BRANDS = [
    { id: 'amazon', name: 'Amazon', icon: 'https://cdn.worldvectorlogo.com/logos/amazon-icon-1.svg', amounts: [25, 50, 100, 200], isImg: true },
    { id: 'apple', name: 'Apple', icon: 'https://cdn.worldvectorlogo.com/logos/apple-14.svg', amounts: [25, 50, 100], isImg: true },
    { id: 'google', name: 'Google Play', icon: 'https://cdn.worldvectorlogo.com/logos/google-play-5.svg', amounts: [10, 25, 50, 100], isImg: true },
    { id: 'uber', name: 'Uber', icon: 'https://cdn.worldvectorlogo.com/logos/uber-15.svg', amounts: [25, 50], isImg: true },
    { id: 'starbucks', name: 'Starbucks', icon: 'https://cdn.worldvectorlogo.com/logos/starbucks-coffee-3.svg', amounts: [10, 25, 50], isImg: true },
    { id: 'netflix', name: 'Netflix', icon: 'https://cdn.worldvectorlogo.com/logos/netflix-4.svg', amounts: [25, 50, 100], isImg: true },
];

export default function BuySellPage() {
    const [tab, setTab] = useState<Tab>('buy');
    const [amount, setAmount] = useState('');
    const [selectedCrypto, setSelectedCrypto] = useState(CRYPTO_OPTIONS[0]);
    const [selectedSellOption, setSelectedSellOption] = useState(SELL_OPTIONS[0]);
    const [selectedGift, setSelectedGift] = useState(GIFT_BRANDS[0]);
    const [selectedGiftAmount, setSelectedGiftAmount] = useState(50);
    const [email, setEmail] = useState('');
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const handleAction = async () => {
        setProcessing(true);
        setSuccess(null);

        try {
            if (tab === 'buy') {
                const res = await fetch('/api/locus/transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'buy', amount, crypto: selectedCrypto.symbol }),
                });
                const data = await res.json();
                setSuccess(data.message || `Buy order placed: ${amount} USD → ${selectedCrypto.symbol}`);
            } else if (tab === 'sell') {
                const res = await fetch('/api/locus/transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sell', amount, method: selectedSellOption.id, email }),
                });
                const data = await res.json();
                setSuccess(data.message || `Sell order placed: ${amount} ${selectedCrypto.symbol} → ${selectedSellOption.name}`);
            } else if (tab === 'visa') {
                const res = await fetch('/api/locus/transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'visa', amount }),
                });
                const data = await res.json();
                setSuccess(data.message || `Visa card funded: $${amount}`);
            } else if (tab === 'gift') {
                const res = await fetch('/api/locus/transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'gift', brand: selectedGift.id, amount: selectedGiftAmount }),
                });
                const data = await res.json();
                setSuccess(data.message || `${selectedGift.name} gift card: $${selectedGiftAmount}`);
            }
        } catch (e: any) {
            setSuccess(`Error: ${e.message}`);
        }
        setProcessing(false);
    };

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Buy, Sell & Cash Out</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Convert between crypto and fiat — Visa cards, Venmo, PayPal, gift cards</p>
            </div>

            <div className="max-w-md mx-auto">
                {/* Tab selector */}
                <div className="grid grid-cols-4 rounded-xl mb-4 p-1" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    {([
                        { key: 'buy' as Tab, label: '💳 Buy', },
                        { key: 'sell' as Tab, label: '💸 Sell' },
                        { key: 'visa' as Tab, label: '💳 Visa' },
                        { key: 'gift' as Tab, label: '🎁 Gift' },
                    ]).map(t => (
                        <button key={t.key} onClick={() => { setTab(t.key); setSuccess(null); }}
                            className="py-2 rounded-lg text-[11px] font-semibold transition-all"
                            style={{ background: tab === t.key ? 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' : 'transparent', color: tab === t.key ? '#fff' : 'var(--pp-text-muted)' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Card */}
                <div className="rounded-2xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>

                    {/* BUY TAB */}
                    {tab === 'buy' && (
                        <>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>Buy Crypto with USD</p>
                            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                <span className="text-lg" style={{ color: 'var(--pp-text-muted)' }}>$</span>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                                    className="flex-1 text-2xl font-bold bg-transparent outline-none" style={{ color: 'var(--pp-text-primary)' }} />
                                <span className="text-sm font-medium" style={{ color: 'var(--pp-text-muted)' }}>USD</span>
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--pp-text-muted)' }}>Receive</p>
                            <div className="space-y-2 mb-4">
                                {CRYPTO_OPTIONS.map(c => (
                                    <button key={c.symbol} onClick={() => setSelectedCrypto(c)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                                        style={{ background: selectedCrypto.symbol === c.symbol ? 'var(--pp-surface-2)' : 'var(--pp-surface-1)', border: `1px solid ${selectedCrypto.symbol === c.symbol ? 'var(--agt-blue)' : 'var(--pp-border)'}` }}>
                                        <img src={c.icon} alt="" className="w-8 h-8 rounded-full" />
                                        <div className="text-left">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{c.symbol}</p>
                                            <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{c.name}</p>
                                        </div>
                                        {selectedCrypto.symbol === c.symbol && <span className="ml-auto text-sm" style={{ color: 'var(--agt-blue)' }}>✓</span>}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* SELL TAB */}
                    {tab === 'sell' && (
                        <>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>Sell Crypto</p>
                            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                                    className="flex-1 text-2xl font-bold bg-transparent outline-none" style={{ color: 'var(--pp-text-primary)' }} />
                                <span className="text-sm font-medium" style={{ color: 'var(--pp-text-muted)' }}>USDC</span>
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--pp-text-muted)' }}>Cash out to</p>
                            <div className="space-y-2 mb-4">
                                {SELL_OPTIONS.map(o => (
                                    <button key={o.id} onClick={() => setSelectedSellOption(o)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                                        style={{ background: selectedSellOption.id === o.id ? 'var(--pp-surface-2)' : 'var(--pp-surface-1)', border: `1px solid ${selectedSellOption.id === o.id ? 'var(--agt-mint)' : 'var(--pp-border)'}` }}>
                                        {(o as any).isImg ? <img src={o.icon} alt="" className="w-8 h-8 rounded" /> : <span className="text-2xl">{(o as any).emoji || o.icon}</span>}
                                        <div className="text-left">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{o.name}</p>
                                            <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{o.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={`${selectedSellOption.name} email or username`}
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
                                style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                        </>
                    )}

                    {/* VISA TAB */}
                    {tab === 'visa' && (
                        <>
                            <div className="text-center mb-4">
                                <div className="w-48 h-28 mx-auto rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', border: '1px solid var(--pp-border)' }}>
                                    <div>
                                        <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>PREPAID</p>
                                        <p className="text-lg font-bold text-white">Visa Card</p>
                                        <p className="text-[9px]" style={{ color: 'var(--agt-mint)' }}>Funded by USDC</p>
                                    </div>
                                </div>
                                <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>Get a virtual Visa card funded by your crypto balance</p>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                <span className="text-lg" style={{ color: 'var(--pp-text-muted)' }}>$</span>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                                    className="flex-1 text-2xl font-bold bg-transparent outline-none" style={{ color: 'var(--pp-text-primary)' }} />
                                <span className="text-sm font-medium" style={{ color: 'var(--pp-text-muted)' }}>USD</span>
                            </div>
                        </>
                    )}

                    {/* GIFT TAB */}
                    {tab === 'gift' && (
                        <>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>Buy Gift Card with Crypto</p>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {GIFT_BRANDS.map(g => (
                                    <button key={g.id} onClick={() => setSelectedGift(g)}
                                        className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
                                        style={{ background: selectedGift.id === g.id ? 'var(--pp-surface-2)' : 'var(--pp-surface-1)', border: `1px solid ${selectedGift.id === g.id ? 'var(--agt-blue)' : 'var(--pp-border)'}` }}>
                                        {(g as any).isImg ? <img src={g.icon} alt="" className="w-8 h-8 rounded" /> : <span className="text-2xl">{g.icon}</span>}
                                        <span className="text-[10px] font-medium" style={{ color: 'var(--pp-text-primary)' }}>{g.name}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--pp-text-muted)' }}>Amount</p>
                            <div className="flex gap-2 mb-4">
                                {selectedGift.amounts.map(a => (
                                    <button key={a} onClick={() => setSelectedGiftAmount(a)}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                                        style={{ background: selectedGiftAmount === a ? 'var(--agt-blue)' : 'var(--pp-surface-1)', color: selectedGiftAmount === a ? '#fff' : 'var(--pp-text-muted)', border: `1px solid ${selectedGiftAmount === a ? 'var(--agt-blue)' : 'var(--pp-border)'}` }}>
                                        ${a}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Success message */}
                    {success && (
                        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: success.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(62,221,185,0.1)', border: `1px solid ${success.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(62,221,185,0.2)'}`, color: success.startsWith('Error') ? '#EF4444' : 'var(--agt-mint)' }}>
                            {success}
                        </div>
                    )}

                    {/* Action button */}
                    <button onClick={handleAction} disabled={processing || (tab !== 'gift' && (!amount || parseFloat(amount) <= 0))}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>
                        {processing ? 'Processing...' : tab === 'buy' ? `Buy ${selectedCrypto.symbol}` : tab === 'sell' ? `Sell to ${selectedSellOption.name}` : tab === 'visa' ? 'Fund Visa Card' : `Buy $${selectedGiftAmount} ${selectedGift.name} Card`}
                    </button>
                </div>

                <p className="text-center text-[9px] mt-3" style={{ color: 'var(--pp-text-muted)' }}>Powered by Locus API — USDC settlements on supported networks</p>
            </div>
        </div>
    );
}
