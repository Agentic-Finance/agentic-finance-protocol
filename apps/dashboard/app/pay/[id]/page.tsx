'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface PaymentLinkData {
    shortId: string;
    amount: number | null;
    token: string;
    note: string | null;
    recipientWallet: string;
    recipientName: string | null;
    status: string;
    useCount: number;
    maxUses: number;
    expiresAt: string | null;
}

export default function PayPage() {
    const params = useParams();
    const id = params?.id as string;
    const [link, setLink] = useState<PaymentLinkData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [payerWallet, setPayerWallet] = useState('');
    const [paying, setPaying] = useState(false);
    const [paid, setPaid] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/payment-link?id=${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setLink(data.link);
                    if (data.link.amount) setPayAmount(data.link.amount.toString());
                } else {
                    setError('Payment link not found or expired.');
                }
            })
            .catch(() => setError('Failed to load payment link.'))
            .finally(() => setLoading(false));
    }, [id]);

    const handlePay = async () => {
        if (!payerWallet || !/^0x[a-fA-F0-9]{40}$/i.test(payerWallet)) {
            setError('Please enter a valid wallet address.');
            return;
        }
        if (!payAmount || parseFloat(payAmount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        setPaying(true);
        setError('');

        try {
            // Create a payment intent via the employees API (queues to Boardroom)
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Wallet-Address': payerWallet },
                body: JSON.stringify({
                    intents: [{
                        name: link?.recipientName || 'Payment Link',
                        wallet: link?.recipientWallet,
                        amount: parseFloat(payAmount),
                        token: link?.token || 'AlphaUSD',
                        note: `Payment via link /${id}${link?.note ? ' — ' + link.note : ''}`,
                    }],
                }),
            });

            if (res.ok) {
                setPaid(true);
                // Increment use count
                await fetch('/api/payment-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'increment', shortId: id }),
                }).catch(() => {});
            } else {
                setError('Payment failed. Please try again.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setPaying(false);
        }
    };

    const isExpired = link?.expiresAt && new Date(link.expiresAt) < new Date();
    const isMaxed = link?.maxUses && link.maxUses > 0 && link.useCount >= link.maxUses;
    const isDisabled = link?.status !== 'active' || isExpired || isMaxed;

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pp-bg-primary)', color: 'var(--pp-text-primary)' }}>
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Agentic Finance
                    </h1>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Secure Payment Link</p>
                {/* QR Code */}
                {!loading && link && !paid && (
                    <div className="mt-4">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&bgcolor=14161E&color=3EDDB9&format=svg`}
                            alt="Payment QR Code"
                            className="mx-auto rounded-xl"
                            width={120} height={120}
                        />
                        <p className="text-[10px] mt-2" style={{ color: 'var(--pp-text-muted)' }}>Scan to pay</p>
                    </div>
                )}
                </div>

                <div className="rounded-2xl border p-6" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--pp-border)', borderTopColor: 'var(--agt-pink)' }} />
                            <p className="text-[12px] mt-3" style={{ color: 'var(--pp-text-muted)' }}>Loading payment link...</p>
                        </div>
                    ) : error && !link ? (
                        <div className="text-center py-12">
                            <p className="text-[14px] font-medium" style={{ color: 'var(--pp-danger)' }}>{error}</p>
                            <p className="text-[12px] mt-2" style={{ color: 'var(--pp-text-muted)' }}>This link may have expired or been removed.</p>
                        </div>
                    ) : paid ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(62,221,185,0.1)' }}>
                                <svg className="w-8 h-8" style={{ color: 'var(--agt-mint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--agt-mint)' }}>Payment Queued!</h2>
                            <p className="text-[12px] mt-2" style={{ color: 'var(--pp-text-muted)' }}>
                                {payAmount} {link?.token} to {link?.recipientName || link?.recipientWallet?.slice(0, 10) + '...'}
                            </p>
                            <p className="text-[11px] mt-4" style={{ color: 'var(--pp-text-muted)' }}>Payment will be processed by the workspace admin.</p>
                        </div>
                    ) : link ? (
                        <>
                            {/* Recipient Info */}
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-lg font-bold" style={{ background: 'linear-gradient(135deg, rgba(255,45,135,0.15), rgba(27,191,236,0.15))', color: 'var(--agt-pink)' }}>
                                    {(link.recipientName || 'P').charAt(0).toUpperCase()}
                                </div>
                                <h2 className="text-base font-bold">{link.recipientName || 'Payment'}</h2>
                                <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--pp-text-muted)' }}>
                                    {link.recipientWallet.slice(0, 10)}...{link.recipientWallet.slice(-6)}
                                </p>
                                {link.note && (
                                    <p className="text-[12px] mt-2 px-4" style={{ color: 'var(--pp-text-secondary)' }}>{link.note}</p>
                                )}
                            </div>

                            {isDisabled ? (
                                <div className="text-center py-4 rounded-xl" style={{ background: 'var(--pp-surface-1)' }}>
                                    <p className="text-[13px] font-medium" style={{ color: 'var(--pp-text-muted)' }}>
                                        {isExpired ? 'This link has expired.' : isMaxed ? 'This link has reached maximum uses.' : 'This link is not active.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Amount */}
                                    <div className="mb-4">
                                        <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Amount ({link.token})</label>
                                        {link.amount ? (
                                            <div className="text-3xl font-bold font-mono text-center py-4" style={{ color: 'var(--pp-text-primary)' }}>
                                                {link.amount.toLocaleString()} <span className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>{link.token}</span>
                                            </div>
                                        ) : (
                                            <input
                                                type="number"
                                                value={payAmount}
                                                onChange={e => setPayAmount(e.target.value)}
                                                placeholder="Enter amount"
                                                className="w-full rounded-xl px-4 py-3 text-lg font-mono text-center outline-none"
                                                style={{ background: 'var(--pp-bg-elevated)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                                            />
                                        )}
                                    </div>

                                    {/* Payer Wallet */}
                                    <div className="mb-5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Your Wallet</label>
                                        <input
                                            type="text"
                                            value={payerWallet}
                                            onChange={e => setPayerWallet(e.target.value)}
                                            placeholder="0x... your wallet address"
                                            className="w-full rounded-xl px-4 py-3 text-[13px] font-mono outline-none"
                                            style={{ background: 'var(--pp-bg-elevated)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                                        />
                                    </div>

                                    {error && <p className="text-[12px] mb-3" style={{ color: 'var(--pp-danger)' }}>{error}</p>}

                                    {/* Pay Button */}
                                    <button
                                        onClick={handlePay}
                                        disabled={paying || !payerWallet || !payAmount}
                                        className="w-full py-4 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                                        style={{
                                            background: paying ? 'var(--pp-surface-2)' : 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))',
                                            color: '#fff',
                                        }}
                                    >
                                        {paying ? 'Processing...' : `Pay ${payAmount || '0'} ${link.token}`}
                                    </button>

                                    <p className="text-[10px] text-center mt-3" style={{ color: 'var(--pp-text-muted)' }}>
                                        Powered by Agentic Finance on Tempo L1
                                    </p>
                                </>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
