'use client';
import React, { useState } from 'react';
import { useSharedWallet } from '../../providers/SharedWalletContext';

const PROVIDERS = [
    {
        id: 'moonpay',
        name: 'MoonPay',
        logo: 'https://www.moonpay.com/assets/logo-full-white.svg',
        fees: '1.5-4.5%',
        methods: ['Visa', 'Mastercard', 'Apple Pay', 'Google Pay', 'Bank Transfer'],
        url: (addr: string, crypto: string, mode: string) =>
            `https://buy-sandbox.moonpay.com/?apiKey=pk_test_1&currencyCode=${crypto.toLowerCase()}&walletAddress=${addr}`,
        color: '#7B61FF',
    },
    {
        id: 'transak',
        name: 'Transak',
        logo: 'https://assets.transak.com/images/logo/transak-logo.svg',
        fees: '1-5%',
        methods: ['Visa', 'Mastercard', 'Bank Transfer', 'SEPA'],
        url: (addr: string, crypto: string, mode: string) =>
            `https://global-stg.transak.com/?apiKey=e05c35b8-c28d-4a81-bb0a-34a089e3a7ff&cryptoCurrencyCode=${crypto}&walletAddress=${addr}&productsAvailed=${mode.toUpperCase()}`,
        color: '#0364FF',
    },
    {
        id: 'ramp',
        name: 'Ramp',
        logo: 'https://ramp.network/assets/ramp-logo-light.svg',
        fees: '0.49-2.9%',
        methods: ['Visa', 'Mastercard', 'Apple Pay', 'Bank Transfer'],
        url: (addr: string, crypto: string, mode: string) =>
            `https://app.demo.ramp.network/?hostApiKey=demo&userAddress=${addr}&defaultAsset=${crypto}`,
        color: '#21BF73',
    },
];

const CRYPTOS = [
    { symbol: 'USDC', name: 'USD Coin', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg', color: '#2775CA' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', color: '#627EEA' },
    { symbol: 'USDT', name: 'Tether', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.svg', color: '#26A17B' },
    { symbol: 'BTC', name: 'Bitcoin', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg', color: '#F7931A' },
    { symbol: 'MATIC', name: 'Polygon', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg', color: '#8247E5' },
];

export default function BuySellPage() {
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const [selectedCrypto, setSelectedCrypto] = useState('USDC');
    const [selectedProvider, setSelectedProvider] = useState('moonpay');
    const [amount, setAmount] = useState('');
    const { walletAddress } = useSharedWallet();

    const provider = PROVIDERS.find(p => p.id === selectedProvider)!;
    const crypto = CRYPTOS.find(c => c.symbol === selectedCrypto)!;

    const handleBuy = () => {
        const url = provider.url(walletAddress || '', selectedCrypto, mode);
        window.open(url, '_blank', 'width=500,height=700');
    };

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Buy & Sell Crypto</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Purchase crypto with card or bank — compare providers for best rates</p>
            </div>

            <div className="max-w-2xl mx-auto">
                {/* Mode */}
                <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <button onClick={() => setMode('buy')} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                        style={{ background: mode === 'buy' ? 'var(--agt-mint)' : 'transparent', color: mode === 'buy' ? '#000' : 'var(--pp-text-muted)' }}>Buy Crypto</button>
                    <button onClick={() => setMode('sell')} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                        style={{ background: mode === 'sell' ? 'var(--agt-orange)' : 'transparent', color: mode === 'sell' ? '#000' : 'var(--pp-text-muted)' }}>Sell Crypto</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left: Form */}
                    <div className="lg:col-span-3 rounded-xl p-6" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        {/* Amount */}
                        <div className="mb-4">
                            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>{mode === 'buy' ? 'YOU PAY' : 'YOU SELL'}</label>
                            <div className="flex gap-2">
                                <input type="number" placeholder="100" value={amount} onChange={e => setAmount(e.target.value)}
                                    className="flex-1 px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                <span className="flex items-center px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-muted)' }}>USD</span>
                            </div>
                        </div>

                        {/* Crypto selector */}
                        <div className="mb-4">
                            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>{mode === 'buy' ? 'YOU RECEIVE' : 'TOKEN'}</label>
                            <div className="grid grid-cols-5 gap-2">
                                {CRYPTOS.map(c => (
                                    <button key={c.symbol} onClick={() => setSelectedCrypto(c.symbol)}
                                        className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                                        style={{ background: selectedCrypto === c.symbol ? `${c.color}15` : 'var(--pp-surface-1)', border: `1px solid ${selectedCrypto === c.symbol ? c.color + '40' : 'var(--pp-border)'}` }}>
                                        <img src={c.icon} alt={c.symbol} className="w-6 h-6" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        <span className="text-[10px] font-semibold" style={{ color: selectedCrypto === c.symbol ? c.color : 'var(--pp-text-muted)' }}>{c.symbol}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Provider selector */}
                        <div className="mb-4">
                            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>PROVIDER</label>
                            <div className="space-y-2">
                                {PROVIDERS.map(p => (
                                    <button key={p.id} onClick={() => setSelectedProvider(p.id)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                                        style={{ background: selectedProvider === p.id ? `${p.color}10` : 'var(--pp-surface-1)', border: `1px solid ${selectedProvider === p.id ? p.color + '40' : 'var(--pp-border)'}` }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: `${p.color}20`, color: p.color }}>{p.name[0]}</div>
                                            <div className="text-left">
                                                <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>{p.name}</p>
                                                <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{p.methods.slice(0, 3).join(', ')}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono" style={{ color: p.color }}>{p.fees}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Estimate */}
                        {amount && (
                            <div className="p-3 rounded-xl mb-4 space-y-1" style={{ background: 'var(--pp-surface-1)' }}>
                                <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>You {mode === 'buy' ? 'pay' : 'sell'}</span><span>${amount} USD</span></div>
                                <div className="flex justify-between text-xs"><span style={{ color: 'var(--pp-text-muted)' }}>Fee (~{provider.fees.split('-')[0]})</span><span>~${(parseFloat(amount) * 0.02).toFixed(2)}</span></div>
                                <div className="flex justify-between text-xs font-semibold"><span style={{ color: 'var(--pp-text-muted)' }}>You receive</span><span style={{ color: 'var(--agt-mint)' }}>~{(parseFloat(amount) * 0.97).toFixed(2)} {selectedCrypto}</span></div>
                            </div>
                        )}

                        <button onClick={handleBuy} disabled={!amount}
                            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                            style={{ background: mode === 'buy' ? `linear-gradient(135deg, ${crypto.color}, var(--agt-mint))` : `linear-gradient(135deg, var(--agt-orange), var(--agt-pink))` }}>
                            {mode === 'buy' ? `Buy ${selectedCrypto} via ${provider.name}` : `Sell ${selectedCrypto} via ${provider.name}`}
                        </button>

                        <p className="text-[10px] text-center mt-3" style={{ color: 'var(--pp-text-muted)' }}>Opens {provider.name} in a new window. Sandbox/demo mode for testing.</p>
                    </div>

                    {/* Right: Info */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                            <h3 className="text-sm font-bold mb-3">Supported Payment Methods</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {['💳 Visa', '💳 Mastercard', '🍎 Apple Pay', '📱 Google Pay', '🏦 Bank Transfer', '🇪🇺 SEPA'].map(m => (
                                    <div key={m} className="flex items-center gap-2 p-2 rounded-lg text-xs" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-secondary)' }}>{m}</div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                            <h3 className="text-sm font-bold mb-3">How It Works</h3>
                            <div className="space-y-3">
                                {[
                                    { step: '1', text: 'Choose amount and crypto' },
                                    { step: '2', text: 'Select payment provider' },
                                    { step: '3', text: 'Complete payment in provider window' },
                                    { step: '4', text: 'Crypto sent to your wallet' },
                                ].map(s => (
                                    <div key={s.step} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'var(--pp-surface-2)', color: 'var(--agt-blue)' }}>{s.step}</div>
                                        <p className="text-xs" style={{ color: 'var(--pp-text-secondary)' }}>{s.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
