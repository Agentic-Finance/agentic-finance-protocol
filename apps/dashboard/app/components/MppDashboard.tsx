'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ChargeIntent {
    intentId: string;
    serviceUrl: string;
    amount: string;
    status: string;
    createdAt: number;
    txHash?: string | null;
    locusTxId?: string;
    locusStatus?: string;
    approvalUrl?: string | null;
}

interface MppSession {
    sessionId: string;
    serviceUrl: string;
    spendingLimit: string;
    spent: string;
    status: string;
    expiresAt: number;
    payments?: { amount: string; locusTxId?: string; timestamp: number }[];
}

type Tab = 'overview' | 'charge' | 'session' | 'laso';

function MppDashboard() {
    const [tab, setTab] = useState<Tab>('overview');
    const [intents, setIntents] = useState<ChargeIntent[]>([]);
    const [sessions, setSessions] = useState<MppSession[]>([]);
    const [walletBalance, setWalletBalance] = useState<string | null>(null);
    const [source, setSource] = useState<string>('local');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Create charge form
    const [chargeService, setChargeService] = useState('');
    const [chargeAmount, setChargeAmount] = useState('');
    const [chargeRecipient, setChargeRecipient] = useState('');
    const [chargeMemo, setChargeMemo] = useState('');

    // Create session form
    const [sessService, setSessService] = useState('');
    const [sessLimit, setSessLimit] = useState('');
    const [sessRecipient, setSessRecipient] = useState('');
    const [sessDuration, setSessDuration] = useState('60');

    // Laso form
    const [lasoAction, setLasoAction] = useState<'card' | 'venmo' | 'paypal'>('card');
    const [lasoAmount, setLasoAmount] = useState('');
    const [lasoRecipient, setLasoRecipient] = useState('');
    const [lasoNote, setLasoNote] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [chargeRes, sessionRes] = await Promise.all([
                fetch('/api/mpp/charge'),
                fetch('/api/mpp/session'),
            ]);
            if (chargeRes.ok) {
                const d = await chargeRes.json();
                setIntents(d.intents || []);
                if (d.source) setSource(d.source);
            }
            if (sessionRes.ok) {
                const d = await sessionRes.json();
                setSessions(d.sessions || []);
                if (d.walletBalance) setWalletBalance(d.walletBalance);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchData();
        const poll = setInterval(fetchData, 15000);
        return () => clearInterval(poll);
    }, [fetchData]);

    const submitCharge = async () => {
        if (!chargeService || !chargeAmount) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/mpp/charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceUrl: chargeService,
                    amount: chargeAmount,
                    recipientAddress: chargeRecipient || undefined,
                    memo: chargeMemo || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) setError(data.error || 'Failed');
            else {
                setChargeService('');
                setChargeAmount('');
                setChargeRecipient('');
                setChargeMemo('');
                fetchData();
            }
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    };

    const submitSession = async () => {
        if (!sessService || !sessLimit) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/mpp/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceUrl: sessService,
                    spendingLimit: sessLimit,
                    recipientAddress: sessRecipient || undefined,
                    durationMs: Number(sessDuration) * 60000,
                }),
            });
            const data = await res.json();
            if (!res.ok) setError(data.error || 'Failed');
            else {
                setSessService('');
                setSessLimit('');
                setSessRecipient('');
                setSessDuration('60');
                fetchData();
            }
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    };

    const submitLaso = async () => {
        if (!lasoAmount) return;
        setLoading(true);
        setError(null);
        try {
            const body: any = { action: lasoAction === 'card' ? 'card' : 'pay' };
            if (lasoAction === 'card') {
                body.amount = Number(lasoAmount);
            } else {
                body.method = lasoAction;
                body.recipient = lasoRecipient;
                body.amount = Number(lasoAmount);
                body.note = lasoNote || undefined;
            }
            const res = await fetch('/api/mpp/laso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) setError(data.error || data.message || 'Failed');
            else {
                setLasoAmount('');
                setLasoRecipient('');
                setLasoNote('');
            }
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    };

    const cancelSess = async (sessionId: string) => {
        try {
            await fetch('/api/mpp/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, cancel: true }),
            });
            fetchData();
        } catch { /* ignore */ }
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'charge', label: 'Charge' },
        { key: 'session', label: 'Session' },
        { key: 'laso', label: 'Laso Finance' },
    ];

    const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-white/20 transition-colors';
    const btnCls = 'text-xs font-medium px-4 py-2 rounded-lg transition-colors';

    return (
        <div className="rounded-xl border p-4" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--pp-text-primary)' }}>
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    MPP Protocol
                </h4>
                <div className="flex items-center gap-2">
                    {walletBalance && (
                        <span className="text-[10px] font-mono text-emerald-400/70 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                            {walletBalance} USDC
                        </span>
                    )}
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        source === 'locus'
                            ? 'text-emerald-400/70 bg-emerald-400/10'
                            : 'text-amber-400/70 bg-amber-400/10'
                    }`}>
                        {source === 'locus' ? 'Live' : 'Local'}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-0.5 rounded-lg" style={{ background: 'var(--pp-bg-elevated)' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => { setTab(t.key); setError(null); }}
                        className={`flex-1 text-[11px] font-medium px-3 py-1.5 rounded-md transition-all ${
                            tab === t.key
                                ? 'bg-blue-400/15 text-blue-400'
                                : 'text-white/40 hover:text-white/60'
                        }`}
                    >{t.label}</button>
                ))}
            </div>

            {error && (
                <div className="mb-3 text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
                <div className="space-y-3">
                    {intents.length === 0 && sessions.length === 0 ? (
                        <div className="text-center py-6 border border-dashed rounded-lg" style={{ borderColor: 'var(--pp-border)' }}>
                            <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>No active MPP intents</p>
                            <p className="text-[10px] mt-1" style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }}>Create a charge or session to get started</p>
                        </div>
                    ) : (
                        <>
                            {intents.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--pp-text-muted)' }}>Charges</p>
                                    {intents.slice(0, 5).map(intent => (
                                        <div key={intent.intentId} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--pp-border)' }}>
                                            <div className="min-w-0">
                                                <p className="text-xs truncate" style={{ color: 'var(--pp-text-secondary)' }}>{intent.serviceUrl}</p>
                                                <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                                                    {intent.intentId.slice(0, 20)}...
                                                    {intent.locusTxId && <span className="text-blue-400/50 ml-1">Locus</span>}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-2">
                                                <p className="text-xs font-bold font-mono" style={{ color: 'var(--pp-text-primary)' }}>{intent.amount} USDC</p>
                                                <span className={`text-[9px] font-mono ${
                                                    intent.status === 'settled' ? 'text-emerald-400/70' :
                                                    intent.status === 'authorized' ? 'text-blue-400/70' :
                                                    intent.status === 'pending' ? 'text-amber-400/70' : 'text-red-400/50'
                                                }`}>{intent.status}</span>
                                                {intent.txHash && (
                                                    <p className="text-[9px] font-mono text-emerald-400/40">{intent.txHash.slice(0, 10)}...</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {sessions.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--pp-text-muted)' }}>Sessions</p>
                                    {sessions.slice(0, 3).map(session => {
                                        const limit = parseFloat(session.spendingLimit) || 1;
                                        const spent = parseFloat(session.spent) || 0;
                                        const pct = Math.min((spent / limit) * 100, 100);
                                        const isExpired = Date.now() > session.expiresAt;
                                        const timeLeft = Math.max(0, session.expiresAt - Date.now());
                                        const minsLeft = Math.floor(timeLeft / 60000);

                                        return (
                                            <div key={session.sessionId} className="py-2 border-b last:border-0" style={{ borderColor: 'var(--pp-border)' }}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-xs truncate" style={{ color: 'var(--pp-text-secondary)' }}>{session.serviceUrl}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-mono ${
                                                            session.status === 'active' && !isExpired ? 'text-emerald-400/70' :
                                                            session.status === 'exhausted' ? 'text-amber-400/70' : 'text-red-400/50'
                                                        }`}>{isExpired ? 'expired' : session.status}</span>
                                                        {session.status === 'active' && !isExpired && (
                                                            <button onClick={() => cancelSess(session.sessionId)}
                                                                className="text-[9px] text-red-400/50 hover:text-red-400 transition-colors">cancel</button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--pp-bg-elevated)' }}>
                                                    <div className="h-full rounded-full bg-blue-400/50 transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{spent.toFixed(2)} / {limit.toFixed(2)} USDC</p>
                                                    {!isExpired && session.status === 'active' && (
                                                        <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{minsLeft}m left</p>
                                                    )}
                                                </div>
                                                {session.payments && session.payments.length > 0 && (
                                                    <p className="text-[9px] font-mono mt-0.5 text-blue-400/40">{session.payments.length} payment(s)</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* CHARGE TAB */}
            {tab === 'charge' && (
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Service URL *</label>
                        <input type="text" value={chargeService} onChange={e => setChargeService(e.target.value)}
                            placeholder="api.openai.com" className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Amount (USDC) *</label>
                            <input type="number" min="0" step="0.01" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)}
                                placeholder="0.00" className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                        </div>
                        <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Recipient Address</label>
                            <input type="text" value={chargeRecipient} onChange={e => setChargeRecipient(e.target.value)}
                                placeholder="0x..." className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Memo</label>
                        <input type="text" value={chargeMemo} onChange={e => setChargeMemo(e.target.value)}
                            placeholder="API usage payment" className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                    </div>
                    <button onClick={submitCharge} disabled={loading || !chargeService || !chargeAmount}
                        className={`${btnCls} w-full ${loading ? 'opacity-50' : ''} bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/20`}>
                        {loading ? 'Processing...' : 'Create Charge Intent'}
                    </button>
                    <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }}>
                        {chargeRecipient ? 'Will send real USDC via Locus' : 'Add recipient address to send real USDC'}
                    </p>
                </div>
            )}

            {/* SESSION TAB */}
            {tab === 'session' && (
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Service URL *</label>
                        <input type="text" value={sessService} onChange={e => setSessService(e.target.value)}
                            placeholder="api.service.com" className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Spending Limit (USDC) *</label>
                            <input type="number" min="0" step="0.01" value={sessLimit} onChange={e => setSessLimit(e.target.value)}
                                placeholder="10.00" className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                        </div>
                        <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Duration (mins)</label>
                            <input type="number" min="1" value={sessDuration} onChange={e => setSessDuration(e.target.value)}
                                placeholder="60" className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Recipient Address</label>
                        <input type="text" value={sessRecipient} onChange={e => setSessRecipient(e.target.value)}
                            placeholder="0x..." className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                    </div>
                    <button onClick={submitSession} disabled={loading || !sessService || !sessLimit}
                        className={`${btnCls} w-full ${loading ? 'opacity-50' : ''} bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20`}>
                        {loading ? 'Creating...' : 'Create Session'}
                    </button>
                    <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }}>
                        Sessions allow agents to stream micropayments up to the spending limit
                    </p>
                </div>
            )}

            {/* LASO FINANCE TAB */}
            {tab === 'laso' && (
                <div className="space-y-3">
                    <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--pp-bg-primary)' }}>
                        {(['card', 'venmo', 'paypal'] as const).map(a => (
                            <button key={a} onClick={() => setLasoAction(a)}
                                className={`flex-1 text-[11px] font-medium px-3 py-1.5 rounded-md transition-all ${
                                    lasoAction === a
                                        ? 'bg-purple-400/15 text-purple-400'
                                        : 'text-white/40 hover:text-white/60'
                                }`}
                            >{a === 'card' ? 'Visa Card' : a === 'venmo' ? 'Venmo' : 'PayPal'}</button>
                        ))}
                    </div>

                    {lasoAction === 'card' && (
                        <>
                            <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                                Order a prepaid Visa card with USDC. $5-$1,000. US only.
                            </p>
                            <div>
                                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Amount (USD) *</label>
                                <input type="number" min="5" max="1000" step="1" value={lasoAmount} onChange={e => setLasoAmount(e.target.value)}
                                    placeholder="25" className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                            </div>
                            <button onClick={submitLaso} disabled={loading || !lasoAmount}
                                className={`${btnCls} w-full ${loading ? 'opacity-50' : ''} bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/20`}>
                                {loading ? 'Processing...' : 'Order Visa Card'}
                            </button>
                        </>
                    )}

                    {(lasoAction === 'venmo' || lasoAction === 'paypal') && (
                        <>
                            <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                                Send payment via {lasoAction === 'venmo' ? 'Venmo' : 'PayPal'}.
                                {lasoAction === 'venmo' ? ' Requires recipient phone number.' : ' Requires recipient email.'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Amount (USD) *</label>
                                    <input type="number" min="5" max="1000" step="1" value={lasoAmount} onChange={e => setLasoAmount(e.target.value)}
                                        placeholder="25" className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>
                                        {lasoAction === 'venmo' ? 'Phone *' : 'Email *'}
                                    </label>
                                    <input type="text" value={lasoRecipient} onChange={e => setLasoRecipient(e.target.value)}
                                        placeholder={lasoAction === 'venmo' ? '+1234567890' : 'user@email.com'}
                                        className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Note</label>
                                <input type="text" value={lasoNote} onChange={e => setLasoNote(e.target.value)}
                                    placeholder="Payment for services" className={inputCls} style={{ color: 'var(--pp-text-primary)' }} />
                            </div>
                            <button onClick={submitLaso} disabled={loading || !lasoAmount || !lasoRecipient}
                                className={`${btnCls} w-full ${loading ? 'opacity-50' : ''} bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/20`}>
                                {loading ? 'Sending...' : `Send via ${lasoAction === 'venmo' ? 'Venmo' : 'PayPal'}`}
                            </button>
                        </>
                    )}

                    <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--pp-border)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }}>
                            Powered by Locus + Laso Finance. No Stripe registration needed.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(MppDashboard);
