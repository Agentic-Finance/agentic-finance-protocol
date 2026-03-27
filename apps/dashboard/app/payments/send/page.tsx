'use client';
import React, { useState, useCallback } from 'react';
import { useSharedWallet } from '../../providers/SharedWalletContext';

const TOKENS = [
    { symbol: 'AlphaUSD', address: '0x20c0000000000000000000000000000000000001', decimals: 6 },
    { symbol: 'pathUSD', address: '0x20c0000000000000000000000000000000000002', decimals: 6 },
    { symbol: 'BetaUSD', address: '0x20c0000000000000000000000000000000000003', decimals: 6 },
];

export default function SendReceivePage() {
    const [tab, setTab] = useState<'send'|'receive'|'request'|'split'>('send');
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [token, setToken] = useState('AlphaUSD');
    const [note, setNote] = useState('');
    const [shielded, setShielded] = useState(false);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{success: boolean; txHash?: string; error?: string}|null>(null);
    const [splitAddresses, setSplitAddresses] = useState('');
    const [splitTotal, setSplitTotal] = useState('');
    const { walletAddress } = useSharedWallet();

    const handleSend = useCallback(async () => {
        if (!recipient || !amount || !walletAddress) return;
        setSending(true); setResult(null);
        try {
            const res = await fetch('/api/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: walletAddress, to: recipient, amount, token, note, shielded }),
            });
            const data = await res.json();
            if (data.txHash) setResult({ success: true, txHash: data.txHash });
            else setResult({ success: false, error: data.error || 'Transfer failed' });
        } catch (e: any) {
            setResult({ success: false, error: e.message });
        } finally { setSending(false); }
    }, [recipient, amount, walletAddress, token, note, shielded]);

    const handleRequest = useCallback(async () => {
        if (!recipient || !amount) return;
        try {
            const res = await fetch('/api/payment-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: walletAddress, requestFrom: recipient, amount, token, reason: note }),
            });
            const data = await res.json();
            if (data.id) setResult({ success: true, txHash: data.id });
            else setResult({ success: false, error: data.error || 'Request failed' });
        } catch (e: any) { setResult({ success: false, error: e.message }); }
    }, [recipient, amount, walletAddress, token, note]);

    const splitCount = splitAddresses.split('\n').filter(a => a.trim().startsWith('0x')).length || 1;
    const perPerson = splitTotal ? (parseFloat(splitTotal) / splitCount).toFixed(2) : '0.00';

    const tabs = [
        { id: 'send' as const, label: 'Send', icon: '↗' },
        { id: 'receive' as const, label: 'Receive', icon: '↙' },
        { id: 'request' as const, label: 'Request', icon: '📩' },
        { id: 'split' as const, label: 'Split', icon: '✂' },
    ];

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Send & Receive</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Transfer tokens on Tempo L1 — real on-chain transactions</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Form */}
                <div className="lg:col-span-3">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => { setTab(t.id); setResult(null); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all"
                                style={{ background: tab === t.id ? 'var(--agt-blue)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--pp-text-muted)' }}>
                                <span className="text-base">{t.icon}</span> {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="rounded-xl p-6" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        {/* SEND */}
                        {tab === 'send' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>RECIPIENT</label>
                                    <input type="text" placeholder="0x... wallet address or ENS name" value={recipient} onChange={e => setRecipient(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-all focus:ring-2 focus:ring-[var(--agt-blue)]" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>AMOUNT</label>
                                    <div className="flex gap-2">
                                        <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                                            className="flex-1 px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                        <select value={token} onChange={e => setToken(e.target.value)}
                                            className="px-4 py-3 rounded-xl text-sm font-medium outline-none min-w-[130px]" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                            {TOKENS.map(t => <option key={t.symbol}>{t.symbol}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>NOTE <span className="font-normal">(optional)</span></label>
                                    <input type="text" placeholder="Payment for..." value={note} onChange={e => setNote(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer py-1">
                                    <input type="checkbox" checked={shielded} onChange={e => setShielded(e.target.checked)} className="rounded" />
                                    <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>🛡 ZK Shield — private transaction (ZK-SNARK proof)</span>
                                </label>

                                {result && (
                                    <div className="p-3 rounded-xl text-sm" style={{ background: result.success ? 'rgba(62,221,185,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.success ? 'rgba(62,221,185,0.2)' : 'rgba(239,68,68,0.2)'}`, color: result.success ? 'var(--agt-mint)' : '#EF4444' }}>
                                        {result.success ? `✅ Sent! TX: ${result.txHash?.slice(0, 16)}...` : `❌ ${result.error}`}
                                    </div>
                                )}

                                <button onClick={handleSend} disabled={!recipient || !amount || sending}
                                    className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                                    style={{ background: shielded ? 'linear-gradient(135deg, #6366f1, #3EDDB9)' : 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>
                                    {sending ? '⏳ Sending...' : shielded ? '🛡 Send Shielded Payment' : '↗ Send Payment'}
                                </button>
                            </div>
                        )}

                        {/* RECEIVE */}
                        {tab === 'receive' && (
                            <div className="text-center space-y-4">
                                <div className="w-52 h-52 mx-auto rounded-xl overflow-hidden" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', padding: 8 }}>
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://agt.finance/pay/${walletAddress || ''}`)}&bgcolor=1A1D28&color=3EDDB9`} alt="QR" className="w-full h-full rounded-lg" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Your Payment QR</p>
                                    <p className="text-xs mt-1 font-mono" style={{ color: 'var(--pp-text-muted)' }}>{walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}</p>
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(`https://agt.finance/pay/${walletAddress || ''}`); }}
                                    className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--agt-blue)' }}>
                                    📋 Copy Payment Link
                                </button>
                            </div>
                        )}

                        {/* REQUEST */}
                        {tab === 'request' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>REQUEST FROM</label>
                                    <input type="text" placeholder="0x... wallet address" value={recipient} onChange={e => setRecipient(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>AMOUNT</label>
                                    <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>REASON</label>
                                    <input type="text" placeholder="For project deliverable..." value={note} onChange={e => setNote(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                </div>
                                {result && (
                                    <div className="p-3 rounded-xl text-sm" style={{ background: result.success ? 'rgba(62,221,185,0.08)' : 'rgba(239,68,68,0.08)', color: result.success ? 'var(--agt-mint)' : '#EF4444' }}>
                                        {result.success ? '✅ Request sent!' : `❌ ${result.error}`}
                                    </div>
                                )}
                                <button onClick={handleRequest} disabled={!recipient || !amount}
                                    className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg, var(--agt-mint), var(--agt-blue))' }}>
                                    📩 Send Payment Request
                                </button>
                            </div>
                        )}

                        {/* SPLIT */}
                        {tab === 'split' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>TOTAL AMOUNT</label>
                                    <input type="number" placeholder="Total bill" value={splitTotal} onChange={e => setSplitTotal(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl text-lg font-mono outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>SPLIT BETWEEN (one wallet per line)</label>
                                    <textarea rows={4} placeholder={'0x...\n0x...\n0x...'} value={splitAddresses} onChange={e => setSplitAddresses(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none resize-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                </div>
                                <div className="p-4 rounded-xl text-center" style={{ background: 'var(--pp-surface-1)' }}>
                                    <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Each person pays</p>
                                    <p className="text-2xl font-bold font-mono" style={{ color: 'var(--agt-mint)' }}>${perPerson}</p>
                                    <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{splitCount} people × ${perPerson} = ${splitTotal || '0'}</p>
                                </div>
                                <button disabled={!splitTotal || splitCount < 2}
                                    className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg, var(--agt-orange), var(--agt-pink))' }}>
                                    ✂ Split & Send Requests
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Info panel */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <h3 className="text-sm font-bold mb-3">Quick Info</h3>
                        <div className="space-y-2">
                            {[
                                { label: 'Network', value: 'Tempo L1 (42431)', color: 'var(--agt-mint)' },
                                { label: 'Gas', value: 'Free (testnet)', color: 'var(--agt-blue)' },
                                { label: 'Settlement', value: 'Instant', color: 'var(--agt-orange)' },
                                { label: 'ZK Shield', value: 'PLONK (15s proof)', color: '#6366f1' },
                            ].map(i => (
                                <div key={i.label} className="flex justify-between text-xs p-2 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                                    <span style={{ color: 'var(--pp-text-muted)' }}>{i.label}</span>
                                    <span className="font-medium" style={{ color: i.color }}>{i.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <h3 className="text-sm font-bold mb-3">Supported Tokens</h3>
                        <div className="space-y-2">
                            {TOKENS.map(t => (
                                <div key={t.symbol} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--pp-surface-2)' }}>$</div>
                                    <div>
                                        <p className="text-xs font-medium">{t.symbol}</p>
                                        <p className="text-[9px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{t.address.slice(0, 10)}...</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
