'use client';
import React, { useState, useEffect } from 'react';
import { useSharedWallet } from '../../providers/SharedWalletContext';

// Transak staging API key (free, no KYB needed for testing)
const TRANSAK_API_KEY = 'e05c35b8-c28d-4a81-bb0a-34a089e3a7ff'; // staging key
const TRANSAK_ENV = 'STAGING'; // Change to PRODUCTION after KYB approval

export default function BuySellPage() {
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const { walletAddress } = useSharedWallet();
    const [transakUrl, setTransakUrl] = useState('');

    useEffect(() => {
        const params = new URLSearchParams({
            apiKey: TRANSAK_API_KEY,
            environment: TRANSAK_ENV,
            cryptoCurrencyCode: 'USDC',
            defaultCryptoCurrency: 'USDC',
            network: 'polygon',
            themeColor: '1BBFEC',
            hideMenu: 'true',
            disableWalletAddressForm: walletAddress ? 'true' : 'false',
            ...(walletAddress ? { walletAddress } : {}),
            ...(mode === 'sell' ? { productsAvailed: 'SELL' } : { productsAvailed: 'BUY' }),
        });
        setTransakUrl(`https://global-stg.transak.com/?${params.toString()}`);
    }, [walletAddress, mode]);

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Buy & Sell Crypto</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Purchase crypto with card or bank transfer — powered by Transak</p>
            </div>

            {/* Mode toggle */}
            <div className="max-w-2xl mx-auto">
                <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <button onClick={() => setMode('buy')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: mode === 'buy' ? 'var(--agt-mint)' : 'transparent', color: mode === 'buy' ? '#000' : 'var(--pp-text-muted)' }}>
                        💳 Buy Crypto
                    </button>
                    <button onClick={() => setMode('sell')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: mode === 'sell' ? 'var(--agt-orange)' : 'transparent', color: mode === 'sell' ? '#000' : 'var(--pp-text-muted)' }}>
                        💸 Sell Crypto
                    </button>
                </div>

                {/* Transak Widget Embed */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--pp-border)', height: '680px' }}>
                    {transakUrl && (
                        <iframe
                            src={transakUrl}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allow="camera;microphone;fullscreen;payment"
                            style={{ border: 'none', borderRadius: '12px' }}
                        />
                    )}
                </div>

                <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--agt-blue)' }}>Supported Methods</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['Visa', 'Mastercard', 'Apple Pay', 'Google Pay', 'Bank Transfer', 'SEPA'].map(m => (
                            <span key={m} className="text-[10px] px-2 py-1 rounded-md" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-muted)' }}>{m}</span>
                        ))}
                    </div>
                    <p className="text-[10px] mt-3" style={{ color: 'var(--pp-text-muted)' }}>
                        Staging environment — test with card 4111 1111 1111 1111. Production requires KYB approval.
                    </p>
                </div>
            </div>
        </div>
    );
}
