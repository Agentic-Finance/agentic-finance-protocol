'use client';

import React, { useState, useEffect } from 'react';

interface LasoResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export default function LasoPage() {
  const [activeTab, setActiveTab] = useState<'card' | 'venmo' | 'paypal' | 'gift'>('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LasoResult | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('0.00');

  // Card form
  const [cardAmount, setCardAmount] = useState('');
  const [cardMerchant, setCardMerchant] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payRecipient, setPayRecipient] = useState('');
  const [payNote, setPayNote] = useState('');

  useEffect(() => {
    fetch('/api/mpp/balance')
      .then(r => r.json())
      .then(d => { if (d.success && d.balance) setWalletBalance(d.balance); })
      .catch(() => {});
  }, []);

  const submitLaso = async (action: string, body: any) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/mpp/laso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || data.message || 'Request failed');
      else setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleCard = () => {
    if (!cardAmount) return;
    submitLaso('card', { amount: Number(cardAmount), merchant: cardMerchant || undefined });
  };

  const handlePayment = () => {
    if (!payAmount || !payRecipient) return;
    submitLaso('pay', {
      method: activeTab,
      recipient: payRecipient,
      amount: Number(payAmount),
      note: payNote || undefined,
    });
  };

  const tabs = [
    { key: 'card' as const, label: 'Prepaid Visa', icon: '💳', color: 'var(--agt-blue)' },
    { key: 'venmo' as const, label: 'Venmo', icon: '💸', color: '#008CFF' },
    { key: 'paypal' as const, label: 'PayPal', icon: '🅿️', color: '#003087' },
    { key: 'gift' as const, label: 'Gift Cards', icon: '🎁', color: 'var(--agt-orange)' },
  ];

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: 'var(--pp-bg-primary)' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--pp-text-primary)', fontFamily: 'var(--agt-font-display)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, var(--agt-pink))' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              Laso Finance
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>
              Convert USDC to real-world payments — cards, Venmo, PayPal, gift cards
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-mono font-bold" style={{ color: 'var(--pp-text-primary)' }}>{walletBalance} USDC</span>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setError(null); setResult(null); }}
              className="rounded-xl border p-4 text-center transition-all hover:shadow-lg"
              style={{
                background: activeTab === t.key ? 'var(--pp-bg-elevated)' : 'var(--pp-bg-card)',
                borderColor: activeTab === t.key ? t.color : 'var(--pp-border)',
                borderWidth: activeTab === t.key ? '2px' : '1px',
              }}
            >
              <div className="text-3xl mb-2">{t.icon}</div>
              <p className="text-xs font-bold" style={{ color: activeTab === t.key ? t.color : 'var(--pp-text-primary)' }}>{t.label}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border p-5" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
              {error && (
                <div className="mb-4 text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
              )}

              {activeTab === 'card' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--pp-text-primary)' }}>Order Prepaid Visa Card</h3>
                    <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>
                      Instant virtual Visa card funded with USDC. Use anywhere Visa is accepted.
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Amount (USD) *</label>
                    <input type="number" min="5" max="1000" step="1" value={cardAmount} onChange={e => setCardAmount(e.target.value)}
                      placeholder="25.00" className="mpp-input" />
                    <p className="text-[10px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Min $5 — Max $1,000</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Merchant (optional)</label>
                    <input type="text" value={cardMerchant} onChange={e => setCardMerchant(e.target.value)}
                      placeholder="e.g. Amazon, Netflix" className="mpp-input" />
                  </div>
                  <button onClick={handleCard} disabled={loading || !cardAmount}
                    className="mpp-btn-primary w-full">
                    {loading ? 'Processing...' : `Order $${cardAmount || '0'} Visa Card`}
                  </button>
                </div>
              )}

              {(activeTab === 'venmo' || activeTab === 'paypal') && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--pp-text-primary)' }}>
                      Send via {activeTab === 'venmo' ? 'Venmo' : 'PayPal'}
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>
                      Pay anyone with {activeTab === 'venmo' ? 'Venmo (phone number)' : 'PayPal (email)'} using USDC.
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Amount (USD) *</label>
                    <input type="number" min="5" max="1000" step="1" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                      placeholder="25.00" className="mpp-input" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>
                      {activeTab === 'venmo' ? 'Phone Number *' : 'Email Address *'}
                    </label>
                    <input type="text" value={payRecipient} onChange={e => setPayRecipient(e.target.value)}
                      placeholder={activeTab === 'venmo' ? '+1 (555) 123-4567' : 'recipient@email.com'} className="mpp-input" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Note</label>
                    <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                      placeholder="Payment for services" className="mpp-input" />
                  </div>
                  <button onClick={handlePayment} disabled={loading || !payAmount || !payRecipient}
                    className="mpp-btn-primary w-full">
                    {loading ? 'Sending...' : `Send $${payAmount || '0'} via ${activeTab === 'venmo' ? 'Venmo' : 'PayPal'}`}
                  </button>
                </div>
              )}

              {activeTab === 'gift' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--pp-text-primary)' }}>Gift Cards</h3>
                    <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>
                      Order gift cards from 100+ brands including Amazon, Uber, Airbnb, and more.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Amazon', 'Uber', 'Airbnb', 'Netflix', 'Spotify', 'DoorDash', 'Target', 'Walmart', 'Starbucks'].map(brand => (
                      <div key={brand} className="rounded-lg border p-3 text-center text-xs font-medium cursor-pointer hover:bg-white/[0.04] transition-colors"
                        style={{ borderColor: 'var(--pp-border)', color: 'var(--pp-text-secondary)' }}>
                        {brand}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-center" style={{ color: 'var(--pp-text-muted)' }}>
                    $5 — $9,000 per card. Search for any brand via the Laso API.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Result / Info Panel */}
          <div className="lg:col-span-3 space-y-4">
            {result && result.success && (
              <div className="rounded-xl border p-5" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-sm font-bold text-emerald-400">Success</h3>
                </div>
                <pre className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-secondary)' }}>
                  {JSON.stringify(result.data || result, null, 2)}
                </pre>
              </div>
            )}

            {/* How It Works */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>How Laso Finance Works</h3>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Fund with USDC', desc: 'Your Locus wallet holds USDC on Base network. Top up anytime.', color: 'var(--agt-blue)' },
                  { step: '2', title: 'Choose payment method', desc: 'Select Visa card, Venmo, PayPal, or gift cards.', color: 'var(--agt-mint)' },
                  { step: '3', title: 'Instant conversion', desc: 'USDC is converted to fiat and delivered instantly.', color: 'var(--agt-pink)' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: s.color, color: 'white' }}>{s.step}</div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{s.title}</p>
                      <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--pp-text-primary)' }}>Capabilities</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '💳', title: 'Prepaid Visa', desc: '$5-$1,000 instant virtual cards' },
                  { icon: '💸', title: 'Venmo Payments', desc: 'Send to any Venmo user by phone' },
                  { icon: '🅿️', title: 'PayPal Payments', desc: 'Send to any PayPal user by email' },
                  { icon: '🎁', title: 'Gift Cards', desc: '100+ brands, $5-$9,000' },
                  { icon: '💱', title: 'Push to Card', desc: 'Direct debit card transfers' },
                  { icon: '🤖', title: 'Agent-Native', desc: 'Built for AI agent automation' },
                ].map(cap => (
                  <div key={cap.title} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'var(--pp-bg-elevated)' }}>
                    <span className="text-lg">{cap.icon}</span>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: 'var(--pp-text-primary)' }}>{cap.title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{cap.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* No Stripe Registration Banner */}
            <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, rgba(27, 191, 236, 0.08), rgba(62, 221, 185, 0.05))', border: '1px solid rgba(27, 191, 236, 0.15)' }}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--agt-blue)' }}>No Stripe Registration Needed</h4>
                  <p className="text-xs" style={{ color: 'var(--pp-text-secondary)' }}>
                    Through MPP + Laso Finance, your agents can make real-world payments (Visa, Venmo, PayPal)
                    without registering for Stripe or any payment processor. Just fund your Locus wallet with USDC
                    and start paying.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
