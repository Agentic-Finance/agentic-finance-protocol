'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface Withdrawal {
  id: string;
  userWallet: string;
  paypalEmail: string;
  amountCrypto: number;
  amountUSD: number;
  platformFee: number;
  paypalFee: number;
  token: string;
  status: string;
  paypalPayoutId: string | null;
  paypalTransactionId: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface OffRampStats {
  totalWithdrawals: number;
  completedCount: number;
  pendingCount: number;
  totalCryptoWithdrawn: number;
  totalUSDPaid: number;
  totalPlatformFees: number;
}

interface OffRampConfig {
  feeRate: string;
  minWithdrawal: number;
  maxWithdrawal: number;
  environment: string;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  PENDING: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Pending', icon: '\u23F3' },
  CRYPTO_LOCKED: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Crypto Locked', icon: '\uD83D\uDD12' },
  PROCESSING: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Processing', icon: '\u2699\uFE0F' },
  COMPLETED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Completed', icon: '\u2713' },
  FAILED: { color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Failed', icon: '\u2717' },
  CANCELLED: { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Cancelled', icon: '\u2014' },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function FiatOffRamp({ walletAddress }: { walletAddress: string }) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<OffRampStats | null>(null);
  const [config, setConfig] = useState<OffRampConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fee preview
  const amountNum = parseFloat(amount) || 0;
  const platformFee = Math.round(amountNum * 0.025 * 100) / 100;
  const receiveAmount = Math.round((amountNum - platformFee) * 100) / 100;

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/offramp/history${walletAddress ? `?wallet=${walletAddress}` : ''}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals);
        setStats(data.stats);
        setConfig(data.config);
      }
    } catch { /* silent */ }
    setIsLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(() => {
      if (!document.hidden) fetchHistory();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paypalEmail || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/offramp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          paypalEmail,
          amount: amountNum,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitResult({ success: true, message: `Withdrawal of $${receiveAmount} submitted! PayPal payout ID: ${data.withdrawal?.paypalPayoutId || 'pending'}` });
        setAmount('');
        setPaypalEmail('');
        setShowForm(false);
        fetchHistory();
      } else {
        setSubmitResult({ success: false, message: data.error || 'Withdrawal failed' });
      }
    } catch (err: any) {
      setSubmitResult({ success: false, message: err.message });
    }

    setIsSubmitting(false);
    setTimeout(() => setSubmitResult(null), 8000);
  };

  if (isLoading) {
    return (
      <div className="p-8 border border-white/5 rounded-3xl bg-[#061014]/90">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 pp-skeleton rounded-xl" />
          <div className="w-48 h-6 pp-skeleton rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 pp-skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-20 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/40 via-teal-500/20 to-emerald-500/40 rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none" />

      <div className="p-4 sm:p-8 flex flex-col border border-white/5 rounded-3xl relative z-10 bg-[#061014]/90 shadow-inner backdrop-blur-3xl overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-32 bg-emerald-500/5 blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-white/[0.05] pb-5 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
              Fiat Off-Ramp
            </h2>
            <p className="text-sm text-emerald-400/80 mt-2 ml-14">
              AlphaUSD {'\u2192'} USD via PayPal Payouts {config?.environment === 'sandbox' && <span className="text-amber-400 text-xs ml-1">(SANDBOX)</span>}
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-400 rounded-xl text-sm font-bold transition-all flex items-center gap-2 mt-4 md:mt-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Withdraw
          </button>
        </div>

        {/* Submit result banner */}
        {submitResult && (
          <div className={`mb-4 p-3 rounded-xl border text-sm font-mono animate-in fade-in duration-300 ${submitResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            {submitResult.message}
          </div>
        )}

        {/* Withdrawal Form */}
        {showForm && (
          <div className="mb-6 p-5 bg-black/40 rounded-xl border border-emerald-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Amount (AlphaUSD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="5"
                    max="10000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="100.00"
                    className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">PayPal Email</label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={e => setPaypalEmail(e.target.value)}
                    placeholder="agent@example.com"
                    className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              {/* Fee Preview */}
              {amountNum > 0 && (
                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Withdrawal Amount</span>
                    <span className="text-white">{amountNum.toFixed(2)} AlphaUSD</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono mt-1">
                    <span className="text-slate-400">Platform Fee (2.5%)</span>
                    <span className="text-amber-400">-{platformFee.toFixed(2)} USD</span>
                  </div>
                  <div className="border-t border-white/5 mt-2 pt-2 flex justify-between text-sm font-mono font-bold">
                    <span className="text-slate-300">You Receive</span>
                    <span className="text-emerald-400">${receiveAmount.toFixed(2)} USD</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || amountNum < 5}
                  className="px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <><span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      Send to PayPal
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-3 text-slate-500 hover:text-white text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 relative z-10">
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Total Withdrawn</span>
              <span className="text-2xl font-black font-mono text-white">${stats.totalUSDPaid.toFixed(0)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{stats.totalCryptoWithdrawn.toFixed(0)} AlphaUSD</span>
            </div>
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Completed</span>
              <span className="text-2xl font-black font-mono text-emerald-400">{stats.completedCount}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">of {stats.totalWithdrawals} total</span>
            </div>
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Pending</span>
              <span className="text-2xl font-black font-mono text-amber-400">{stats.pendingCount}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">in queue</span>
            </div>
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Fees Earned</span>
              <span className="text-2xl font-black font-mono text-cyan-400">${stats.totalPlatformFees.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">2.5% platform fee</span>
            </div>
          </div>
        )}

        {/* Withdrawal History */}
        {withdrawals.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm font-mono border border-dashed border-white/10 rounded-2xl">
            {'>'}  No withdrawals yet. Click &quot;Withdraw&quot; to convert AlphaUSD to USD.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Recent Withdrawals</span>
            {withdrawals.map(w => {
              const sc = STATUS_CONFIG[w.status] || STATUS_CONFIG.PENDING;
              return (
                <div key={w.id} className="flex items-center justify-between p-3 bg-[#0A161A] border border-white/5 rounded-xl hover:border-emerald-500/20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{sc.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">${w.amountUSD.toFixed(2)}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} border border-white/5`}>{sc.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{w.paypalEmail}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono text-slate-400">{w.amountCrypto.toFixed(2)} <span className="text-slate-600">AUSD</span></span>
                    <p className="text-[9px] text-slate-600 mt-0.5">{relativeTime(w.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PayPal branding */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-[9px] text-slate-600 font-mono">Powered by PayPal Payouts API</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-600">Min: $5</span>
            <span className="text-[9px] text-slate-600">|</span>
            <span className="text-[9px] text-slate-600">Fee: 2.5%</span>
            <span className="text-[9px] text-slate-600">|</span>
            <span className="text-[9px] text-slate-600">100+ countries</span>
          </div>
        </div>
      </div>
    </div>
  );
}
