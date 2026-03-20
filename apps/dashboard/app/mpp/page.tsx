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

export default function MppPage() {
  const [intents, setIntents] = useState<ChargeIntent[]>([]);
  const [sessions, setSessions] = useState<MppSession[]>([]);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [source, setSource] = useState<string>('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'charges' | 'sessions'>('charges');

  // Charge form
  const [chargeService, setChargeService] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeRecipient, setChargeRecipient] = useState('');
  const [chargeMemo, setChargeMemo] = useState('');
  const [payMethod, setPayMethod] = useState<'stablecoin' | 'card'>('stablecoin');

  // Session form
  const [sessService, setSessService] = useState('');
  const [sessLimit, setSessLimit] = useState('');
  const [sessRecipient, setSessRecipient] = useState('');
  const [sessDuration, setSessDuration] = useState('60');

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
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/mpp/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceUrl: chargeService, amount: chargeAmount,
          recipientAddress: chargeRecipient || undefined,
          memo: chargeMemo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed');
      else { setChargeService(''); setChargeAmount(''); setChargeRecipient(''); setChargeMemo(''); fetchData(); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const submitSession = async () => {
    if (!sessService || !sessLimit) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/mpp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceUrl: sessService, spendingLimit: sessLimit,
          recipientAddress: sessRecipient || undefined,
          durationMs: Number(sessDuration) * 60000,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed');
      else { setSessService(''); setSessLimit(''); setSessRecipient(''); setSessDuration('60'); fetchData(); }
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

  const statusColor = (s: string) =>
    s === 'settled' || s === 'active' ? 'text-emerald-400 bg-emerald-400/10' :
    s === 'authorized' || s === 'processing' ? 'text-blue-400 bg-blue-400/10' :
    s === 'pending' ? 'text-amber-400 bg-amber-400/10' : 'text-red-400 bg-red-400/10';

  const totalCharges = intents.reduce((s, i) => s + parseFloat(i.amount || '0'), 0);
  const settledCount = intents.filter(i => i.status === 'settled').length;
  const activeSessions = sessions.filter(s => s.status === 'active' && Date.now() < s.expiresAt).length;
  const totalStreamed = sessions.reduce((s, sess) => s + parseFloat(sess.spent || '0'), 0);

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: 'var(--pp-bg-primary)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--pp-text-primary)', fontFamily: 'var(--agt-font-display)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </div>
              MPP Protocol
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Machine Payments Protocol — HTTP 402 payments for AI agents</p>
          </div>
          <div className="flex items-center gap-3">
            {walletBalance && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-mono font-bold" style={{ color: 'var(--pp-text-primary)' }}>{walletBalance} USDC</span>
              </div>
            )}
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              source === 'locus'
                ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                : 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
            }`}>
              {source === 'locus' ? 'Live Mode' : 'Local Mode'}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Charges', value: `$${totalCharges.toFixed(2)}`, sub: `${intents.length} intents`, color: 'var(--agt-blue)' },
            { label: 'Settled', value: String(settledCount), sub: `of ${intents.length} total`, color: 'var(--agt-mint)' },
            { label: 'Active Sessions', value: String(activeSessions), sub: `${sessions.length} total`, color: 'var(--agt-pink)' },
            { label: 'Total Streamed', value: `$${totalStreamed.toFixed(2)}`, sub: 'micropayments', color: 'var(--agt-orange)' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border p-4" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
              <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--pp-text-muted)' }}>{stat.label}</p>
              <p className="text-xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Create Form */}
          <div className="lg:col-span-1 space-y-4">
            {/* Payment Method Toggle */}
            <div className="rounded-xl border p-4" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>Payment Method</p>
              <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--pp-bg-elevated)' }}>
                {(['stablecoin', 'card'] as const).map(m => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                      payMethod === m ? 'shadow-sm' : ''
                    }`}
                    style={{
                      background: payMethod === m ? 'var(--pp-bg-card)' : 'transparent',
                      color: payMethod === m ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)',
                    }}
                  >
                    <span>{m === 'stablecoin' ? '💎' : '💳'}</span>
                    {m === 'stablecoin' ? 'USDC' : 'Card (Stripe)'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-2" style={{ color: 'var(--pp-text-muted)' }}>
                {payMethod === 'stablecoin'
                  ? 'Pay with USDC stablecoins on Base network'
                  : 'Pay with credit/debit card via Stripe through MPP'}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
              <div className="flex border-b" style={{ borderColor: 'var(--pp-border)' }}>
                {(['charges', 'sessions'] as const).map(t => (
                  <button key={t} onClick={() => { setActiveTab(t); setError(null); }}
                    className="flex-1 text-xs font-medium px-4 py-3 transition-all"
                    style={{
                      color: activeTab === t ? 'var(--agt-blue)' : 'var(--pp-text-muted)',
                      borderBottom: activeTab === t ? '2px solid var(--agt-blue)' : '2px solid transparent',
                      background: activeTab === t ? 'var(--pp-bg-elevated)' : 'transparent',
                    }}
                  >
                    {t === 'charges' ? 'Charge Intent' : 'Pay-as-you-go Session'}
                  </button>
                ))}
              </div>

              <div className="p-4 space-y-3">
                {error && (
                  <div className="text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
                )}

                {activeTab === 'charges' && (
                  <>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Service / API Endpoint *</label>
                      <input type="text" value={chargeService} onChange={e => setChargeService(e.target.value)}
                        placeholder="api.openai.com/v1/chat" className="mpp-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Amount (USDC) *</label>
                        <input type="number" min="0" step="0.01" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)}
                          placeholder="0.00" className="mpp-input" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Recipient</label>
                        <input type="text" value={chargeRecipient} onChange={e => setChargeRecipient(e.target.value)}
                          placeholder="0x..." className="mpp-input" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Memo</label>
                      <input type="text" value={chargeMemo} onChange={e => setChargeMemo(e.target.value)}
                        placeholder="API usage payment" className="mpp-input" />
                    </div>
                    <button onClick={submitCharge} disabled={loading || !chargeService || !chargeAmount}
                      className="mpp-btn-primary w-full">
                      {loading ? 'Processing...' : 'Create Charge Intent'}
                    </button>
                  </>
                )}

                {activeTab === 'sessions' && (
                  <>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Service / API Endpoint *</label>
                      <input type="text" value={sessService} onChange={e => setSessService(e.target.value)}
                        placeholder="api.service.com" className="mpp-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Spending Limit (USDC) *</label>
                        <input type="number" min="0" step="0.01" value={sessLimit} onChange={e => setSessLimit(e.target.value)}
                          placeholder="10.00" className="mpp-input" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Duration (mins)</label>
                        <input type="number" min="1" value={sessDuration} onChange={e => setSessDuration(e.target.value)}
                          placeholder="60" className="mpp-input" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Recipient Address</label>
                      <input type="text" value={sessRecipient} onChange={e => setSessRecipient(e.target.value)}
                        placeholder="0x..." className="mpp-input" />
                    </div>
                    <button onClick={submitSession} disabled={loading || !sessService || !sessLimit}
                      className="mpp-btn-secondary w-full">
                      {loading ? 'Creating...' : 'Create Session'}
                    </button>
                    <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                      Sessions let agents stream micropayments up to the spending limit
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Activity Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Recent Charges */}
            <div className="rounded-xl border" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--pp-border)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>Recent Charge Intents</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: 'var(--pp-text-muted)', background: 'var(--pp-bg-elevated)' }}>
                  {intents.length} total
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--pp-border)' }}>
                {intents.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>No charge intents yet</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }}>Create your first charge intent to get started</p>
                  </div>
                ) : intents.slice(0, 10).map(intent => (
                  <div key={intent.intentId} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--pp-border)' }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--pp-text-primary)' }}>{intent.serviceUrl}</p>
                        {intent.locusTxId && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 flex-shrink-0">Locus</span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                        {intent.intentId.slice(0, 24)}...
                        {intent.txHash && <span className="ml-2 text-emerald-400/50">tx: {intent.txHash.slice(0, 10)}...</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--pp-text-primary)' }}>{intent.amount} USDC</p>
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${statusColor(intent.status)}`}>
                        {intent.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Sessions */}
            <div className="rounded-xl border" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--pp-border)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>Sessions</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: 'var(--pp-text-muted)', background: 'var(--pp-bg-elevated)' }}>
                  {activeSessions} active
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--pp-border)' }}>
                {sessions.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="text-3xl mb-2">⏱️</div>
                    <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>No active sessions</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }}>Create a session for pay-as-you-go streaming</p>
                  </div>
                ) : sessions.slice(0, 5).map(session => {
                  const limit = parseFloat(session.spendingLimit) || 1;
                  const spent = parseFloat(session.spent) || 0;
                  const pct = Math.min((spent / limit) * 100, 100);
                  const isExpired = Date.now() > session.expiresAt;
                  const minsLeft = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 60000));

                  return (
                    <div key={session.sessionId} className="px-4 py-3" style={{ borderColor: 'var(--pp-border)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--pp-text-primary)' }}>{session.serviceUrl}</p>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${statusColor(isExpired ? 'expired' : session.status)}`}>
                            {isExpired ? 'expired' : session.status}
                          </span>
                          {session.status === 'active' && !isExpired && (
                            <button onClick={() => cancelSess(session.sessionId)}
                              className="text-[10px] font-medium text-red-400/60 hover:text-red-400 transition-colors">
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--pp-bg-elevated)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, var(--agt-blue), var(--agt-mint))`,
                        }} />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[11px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                          {spent.toFixed(2)} / {limit.toFixed(2)} USDC
                          {session.payments && session.payments.length > 0 && (
                            <span className="ml-2 text-blue-400/50">{session.payments.length} payment(s)</span>
                          )}
                        </p>
                        {!isExpired && session.status === 'active' && (
                          <p className="text-[11px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{minsLeft}m remaining</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* How MPP Works */}
        <div className="rounded-xl border p-6" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>How MPP Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Agent hits API', desc: 'Your agent makes an HTTP request to any MPP-enabled endpoint', icon: '🔗' },
              { step: '2', title: 'Gets price (402)', desc: 'Server responds with HTTP 402 and the payment amount', icon: '💰' },
              { step: '3', title: 'Pays instantly', desc: 'Agent pays with USDC stablecoins or credit card via Stripe', icon: '⚡' },
              { step: '4', title: 'Gets response', desc: 'Server validates payment and returns the API response', icon: '✅' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="w-6 h-6 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--agt-blue)', color: 'white' }}>{s.step}</div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--pp-text-primary)' }}>{s.title}</p>
                <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
