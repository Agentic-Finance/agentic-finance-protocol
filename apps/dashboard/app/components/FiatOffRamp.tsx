'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Pagination, { usePagination } from './Pagination';

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
  failedCount: number;
  totalCryptoWithdrawn: number;
  totalUSDPaid: number;
  totalPlatformFees: number;
  completedUSD: number;
  completedCrypto: number;
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

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
  PENDING:       { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: 'Pending',       icon: '\u23F3' },
  CRYPTO_LOCKED: { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    label: 'Crypto Locked', icon: '\uD83D\uDD12' },
  PROCESSING:    { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    label: 'Processing',    icon: '\u2699\uFE0F' },
  COMPLETED:     { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Completed',     icon: '\u2713' },
  FAILED:        { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    label: 'Failed',        icon: '\u2717' },
  CANCELLED:     { color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   label: 'Cancelled',     icon: '\u2014' },
};

/** Human-readable failure reasons */
function friendlyFailureReason(reason: string | null): string {
  if (!reason) return 'Unknown error';
  if (reason.includes('RECEIVER_UNREGISTERED') || reason.includes('not registered') || reason.includes('UNCLAIMED')) {
    return 'PayPal email is not registered. Please use a verified PayPal account.';
  }
  if (reason.includes('BLOCKED')) return 'Payment was blocked by PayPal. Please contact support.';
  if (reason.includes('RETURNED') || reason.includes('REFUNDED')) return 'Payment was returned/refunded by PayPal.';
  if (reason.includes('DENIED') || reason.includes('CANCELED')) return 'PayPal batch was denied or cancelled.';
  if (reason.includes('insufficient') || reason.includes('INSUFFICIENT')) return 'Insufficient funds in treasury.';
  if (reason.includes('PayPal API error')) return 'PayPal service temporarily unavailable. Will retry shortly.';
  if (reason.length > 80) return reason.slice(0, 77) + '...';
  return reason;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false);

  // Cooldown after submit (prevent duplicates)
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const isCoolingDown = Date.now() < cooldownUntil;

  // Expanded failure details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fee preview
  const amountNum = parseFloat(amount) || 0;
  const platformFee = Math.round(amountNum * 0.025 * 100) / 100;
  const receiveAmount = Math.round((amountNum - platformFee) * 100) / 100;

  // Pagination
  const { paginatedItems: paginatedWithdrawals, currentPage: wPage, totalPages: wTotalPages, setCurrentPage: setWPage, totalItems: wTotal, itemsPerPage: wPerPage } = usePagination(withdrawals, 10);

  // Off-ramp method tab
  const [offRampMethod, setOffRampMethod] = useState<'paypal' | 'card'>('paypal');
  const [cardAmount, setCardAmount] = useState('');
  const [isCardProcessing, setIsCardProcessing] = useState(false);

  // Timer ref for cooldown visual
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/offramp/history${walletAddress ? `?wallet=${walletAddress}&limit=100` : '?limit=100'}`);
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
    // Poll faster (10s) if there are any processing withdrawals
    const hasProcessing = withdrawals.some(w => w.status === 'PROCESSING' || w.status === 'PENDING');
    const interval = setInterval(() => {
      if (!document.hidden) fetchHistory();
    }, hasProcessing ? 10000 : 20000);
    return () => clearInterval(interval);
  }, [fetchHistory, withdrawals.length]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownUntil > Date.now()) {
      const update = () => {
        const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
        setCooldownSecs(remaining);
        if (remaining <= 0 && cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
      };
      update();
      cooldownTimerRef.current = setInterval(update, 1000);
      return () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); };
    }
  }, [cooldownUntil]);

  // Step 1: User clicks "Send to PayPal" → show confirmation
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paypalEmail || isSubmitting || amountNum < 5 || amountNum > 10000 || isCoolingDown) return;
    setShowConfirm(true);
  };

  // Step 2: User confirms → actually submit
  const handleConfirmedSubmit = async () => {
    setShowConfirm(false);
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
        const status = data.withdrawal?.status || 'PROCESSING';
        setSubmitResult({
          success: true,
          message: status === 'PENDING'
            ? `Withdrawal of $${receiveAmount.toFixed(2)} queued. It will be processed shortly.`
            : `Withdrawal of $${receiveAmount.toFixed(2)} is being sent to ${paypalEmail}. Check status below.`,
        });
        setAmount('');
        setPaypalEmail('');
        setShowForm(false);
        // 30-second cooldown to prevent duplicates
        setCooldownUntil(Date.now() + 30000);
        fetchHistory();
      } else {
        setSubmitResult({ success: false, message: data.error || 'Withdrawal failed. Please try again.' });
      }
    } catch (err: any) {
      setSubmitResult({ success: false, message: 'Network error. Please check your connection and try again.' });
    }

    setIsSubmitting(false);
    setTimeout(() => setSubmitResult(null), 10000);
  };

  if (isLoading) {
    return (
      <div className="p-8 border border-white/5 rounded-3xl bg-[#061014]/90">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 pp-skeleton rounded-xl" />
          <div className="w-48 h-6 pp-skeleton rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 pp-skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  const isFormValid = amountNum >= 5 && amountNum <= 10000 && paypalEmail.includes('@') && paypalEmail.includes('.');

  return (
    <div className="agt-card agt-card-accent-mint p-5 sm:p-6 relative overflow-hidden">

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
              AlphaUSD {'\u2192'} USD {config?.environment === 'sandbox' && <span className="text-amber-400 text-xs ml-1">(SANDBOX)</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4 md:mt-0">
            {/* Method Tabs */}
            <div className="flex bg-white/[0.03] rounded-lg border border-white/[0.06] p-0.5 mr-2">
              {(['paypal', 'card'] as const).map(method => (
                <button key={method} onClick={() => setOffRampMethod(method)} className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${offRampMethod === method ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'}`}>
                  {method === 'paypal' ? 'PayPal' : 'Card'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowForm(!showForm); setShowConfirm(false); }}
              disabled={isCoolingDown}
              className={`px-5 py-2.5 border rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                isCoolingDown
                  ? 'bg-slate-800/50 border-slate-700/30 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 hover:border-emerald-400/50 text-emerald-400'
              }`}
            >
              {isCoolingDown ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin" />
                  Wait {cooldownSecs}s
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Withdraw
                </>
              )}
            </button>
          </div>
        </div>

        {/* Submit result banner */}
        {submitResult && (
          <div className={`mb-4 p-4 rounded-xl border text-sm animate-in fade-in duration-300 ${
            submitResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0 mt-0.5">{submitResult.success ? '\u2713' : '\u2717'}</span>
              <div>
                <p className="font-bold">{submitResult.success ? 'Withdrawal Submitted' : 'Withdrawal Failed'}</p>
                <p className="text-xs opacity-80 mt-1">{submitResult.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Card Tab Content */}
        {offRampMethod === 'card' && (
          <div className="mb-6 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <h4 className="text-sm font-bold text-white mb-1">Card Withdrawal (Visa / Mastercard)</h4>
            <p className="text-xs text-slate-500 mb-4">Convert AlphaUSD to fiat and receive on your debit/credit card.</p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1 block">Amount (AlphaUSD)</label>
                <input type="number" min="5" max="10000" step="0.01" value={cardAmount} onChange={e => setCardAmount(e.target.value)} placeholder="100.00" className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-emerald-500/50 transition-colors" />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Processing fee</span>
                <span className="text-white/60">3.5% + $0.30</span>
              </div>
              {cardAmount && parseFloat(cardAmount) >= 5 && (
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">You receive</span>
                  <span className="text-emerald-400">${(parseFloat(cardAmount) * 0.965 - 0.30).toFixed(2)} USD</span>
                </div>
              )}
              <button
                onClick={async () => {
                  if (!cardAmount || parseFloat(cardAmount) < 5) return;
                  setIsCardProcessing(true);
                  try {
                    const res = await fetch('/api/fiat/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ amount: parseFloat(cardAmount), userWallet: walletAddress, returnUrl: window.location.href }),
                    });
                    const data = await res.json();
                    if (data.checkoutUrl) window.open(data.checkoutUrl, '_blank');
                    else alert(data.error || 'Failed to create checkout session');
                  } catch { alert('Network error'); }
                  setIsCardProcessing(false);
                }}
                disabled={isCardProcessing || !cardAmount || parseFloat(cardAmount) < 5}
                className="w-full py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-sm rounded-xl transition-all disabled:opacity-30"
              >
                {isCardProcessing ? 'Processing...' : 'Withdraw to Card'}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-3 text-center">Powered by Paddle (Visa / Mastercard / Apple Pay)</p>
          </div>
        )}

        {/* PayPal Withdrawal Form */}
        {showForm && (
          <div className="mb-6 p-5 bg-black/40 rounded-xl border border-emerald-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <form onSubmit={handleFormSubmit} className="space-y-4">
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
                    placeholder="Min $5 — Max $10,000"
                    className={`w-full px-4 py-3 bg-black/60 border rounded-xl text-white font-mono focus:outline-none placeholder:text-slate-600 ${
                      amount && (amountNum < 5 || amountNum > 10000) ? 'border-rose-500/50 focus:border-rose-500/70' : 'border-white/10 focus:border-emerald-500/50'
                    }`}
                    required
                    disabled={isSubmitting}
                  />
                  {amount && amountNum < 5 && (
                    <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      Minimum withdrawal is $5.00
                    </p>
                  )}
                  {amount && amountNum > 10000 && (
                    <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      Maximum withdrawal is $10,000
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">PayPal Email</label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={e => setPaypalEmail(e.target.value)}
                    placeholder="your-paypal@email.com"
                    className={`w-full px-4 py-3 bg-black/60 border rounded-xl text-white font-mono focus:outline-none placeholder:text-slate-600 ${
                      paypalEmail && !paypalEmail.includes('.') ? 'border-rose-500/50 focus:border-rose-500/70' : 'border-white/10 focus:border-emerald-500/50'
                    }`}
                    required
                    disabled={isSubmitting}
                  />
                  {paypalEmail && !paypalEmail.includes('@') && (
                    <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      Please enter a valid email address
                    </p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-1">Must be a verified PayPal account email</p>
                </div>
              </div>

              {/* Fee Preview */}
              {amountNum >= 5 && amountNum <= 10000 && (
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
                    <span className="text-slate-300">You Receive via PayPal</span>
                    <span className="text-emerald-400">${receiveAmount.toFixed(2)} USD</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isFormValid || isCoolingDown}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                      isSubmitting || !isFormValid || isCoolingDown
                        ? 'bg-slate-800/50 border border-slate-700/40 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    }`}
                  >
                    {isSubmitting ? (
                      <><span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> Sending...</>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        Send to PayPal
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setShowConfirm(false); }}
                    className="px-4 py-3 text-slate-500 hover:text-white text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
                {!isSubmitting && !isFormValid && amount && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {!paypalEmail ? 'Enter PayPal email to continue'
                      : !paypalEmail.includes('@') || !paypalEmail.includes('.') ? 'Enter a valid email'
                      : amountNum < 5 ? `Enter at least $5.00 (current: $${amountNum.toFixed(2)})`
                      : amountNum > 10000 ? 'Maximum $10,000 per withdrawal'
                      : ''}
                  </span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="mb-6 p-5 bg-black/60 rounded-xl border border-amber-500/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">&#9888;&#65039;</span>
              <div>
                <h3 className="text-white font-bold text-sm">Confirm Withdrawal</h3>
                <p className="text-slate-400 text-xs mt-1">Please verify the details below before proceeding.</p>
              </div>
            </div>

            <div className="bg-black/40 rounded-lg p-4 mb-4 space-y-2 border border-white/5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-500">Send to</span>
                <span className="text-white font-bold">{paypalEmail}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-500">Amount</span>
                <span className="text-white">{amountNum.toFixed(2)} AlphaUSD</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-500">Fee (2.5%)</span>
                <span className="text-amber-400">-${platformFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-mono font-bold">
                <span className="text-slate-300">Recipient gets</span>
                <span className="text-emerald-400">${receiveAmount.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirmedSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-400 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <><span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> Sending...</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Confirm &amp; Send
                  </>
                )}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2.5 text-slate-500 hover:text-white text-sm transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 relative z-10">
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Total Withdrawn</span>
              <span className="text-2xl font-black font-mono text-white">
                ${(stats.completedUSD || stats.totalUSDPaid).toFixed(0)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {(stats.completedCrypto || stats.totalCryptoWithdrawn).toFixed(0)} AlphaUSD
              </span>
            </div>
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Completed</span>
              <span className="text-2xl font-black font-mono text-emerald-400">{stats.completedCount}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">of {stats.totalWithdrawals} total</span>
            </div>
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
                {stats.pendingCount > 0 ? 'In Progress' : 'Pending'}
              </span>
              <span className={`text-2xl font-black font-mono ${stats.pendingCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                {stats.pendingCount}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {stats.pendingCount > 0 ? 'awaiting PayPal' : 'none queued'}
              </span>
            </div>
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
                {(stats.failedCount || 0) > 0 ? 'Failed' : 'Fees Earned'}
              </span>
              {(stats.failedCount || 0) > 0 ? (
                <>
                  <span className="text-2xl font-black font-mono text-rose-400">{stats.failedCount}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">fees: ${stats.totalPlatformFees.toFixed(2)}</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-black font-mono text-cyan-400">${stats.totalPlatformFees.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">2.5% platform fee</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Withdrawal History */}
        {withdrawals.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm font-mono border border-dashed border-white/10 rounded-2xl">
            <span className="text-2xl block mb-2">{'\uD83D\uDCB8'}</span>
            No withdrawals yet. Click &quot;Withdraw&quot; to convert AlphaUSD to USD via PayPal.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Withdrawal History</span>
            {paginatedWithdrawals.map(w => {
              const sc = STATUS_CONFIG[w.status] || STATUS_CONFIG.PENDING;
              const isExpanded = expandedId === w.id;
              const isFailed = w.status === 'FAILED';
              const isProcessing = w.status === 'PROCESSING';

              return (
                <div key={w.id} className="group">
                  <div
                    className={`flex items-center justify-between p-3 bg-[#0A161A] border rounded-xl transition-all cursor-pointer ${
                      isFailed ? 'border-rose-500/15 hover:border-rose-500/30' :
                      isProcessing ? 'border-cyan-500/15 hover:border-cyan-500/30' :
                      'border-white/5 hover:border-emerald-500/20'
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : w.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-lg shrink-0 ${isProcessing ? 'animate-spin-slow' : ''}`}>{sc.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white font-mono">${w.amountUSD.toFixed(2)}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} border ${sc.border}`}>
                            {isProcessing ? 'PayPal Processing' : sc.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{w.paypalEmail}</p>
                        {/* Inline failure reason preview */}
                        {isFailed && w.failureReason && !isExpanded && (
                          <p className="text-[10px] text-rose-400/70 truncate mt-0.5">
                            {friendlyFailureReason(w.failureReason)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <span className="text-xs font-mono text-slate-400">{w.amountCrypto.toFixed(2)} <span className="text-slate-600">AUSD</span></span>
                        <p className="text-[9px] text-slate-600 mt-0.5">{relativeTime(w.createdAt)}</p>
                      </div>
                      <svg className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mx-3 p-3 bg-black/60 border-x border-b border-white/5 rounded-b-xl -mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Withdrawal ID</span>
                          <span className="text-slate-400">{w.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Platform Fee</span>
                          <span className="text-amber-400/80">${w.platformFee.toFixed(2)}</span>
                        </div>
                        {w.paypalPayoutId && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">PayPal Batch</span>
                            <span className="text-slate-400">{w.paypalPayoutId.slice(0, 12)}...</span>
                          </div>
                        )}
                        {w.paypalTransactionId && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Transaction</span>
                            <span className="text-emerald-400/80">{w.paypalTransactionId}</span>
                          </div>
                        )}
                        {w.paypalFee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">PayPal Fee</span>
                            <span className="text-amber-400/80">${w.paypalFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-600">Created</span>
                          <span className="text-slate-400">{new Date(w.createdAt).toLocaleString()}</span>
                        </div>
                        {w.completedAt && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Completed</span>
                            <span className="text-emerald-400/80">{new Date(w.completedAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Failure reason - prominent display */}
                      {isFailed && w.failureReason && (
                        <div className="mt-3 p-2.5 bg-rose-500/5 border border-rose-500/15 rounded-lg">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400/60 mb-1">Failure Reason</p>
                          <p className="text-[11px] text-rose-400">{friendlyFailureReason(w.failureReason)}</p>
                          <p className="text-[9px] text-rose-400/40 mt-1 font-mono">{w.failureReason}</p>
                        </div>
                      )}

                      {/* Processing info */}
                      {isProcessing && (
                        <div className="mt-3 p-2.5 bg-cyan-500/5 border border-cyan-500/15 rounded-lg flex items-center gap-2">
                          <span className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin shrink-0" />
                          <div>
                            <p className="text-[11px] text-cyan-400">PayPal payout is being processed</p>
                            <p className="text-[9px] text-cyan-400/50">Usually completes within a few minutes. Auto-refreshing every 10 seconds.</p>
                          </div>
                        </div>
                      )}

                      {/* Completed success info */}
                      {w.status === 'COMPLETED' && (
                        <div className="mt-3 p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg flex items-center gap-2">
                          <span className="text-emerald-400">{'\u2713'}</span>
                          <p className="text-[11px] text-emerald-400">
                            ${w.amountUSD.toFixed(2)} USD sent to {w.paypalEmail}
                            {w.paypalFee > 0 && <span className="text-emerald-400/50"> (PayPal fee: ${w.paypalFee.toFixed(2)})</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <Pagination currentPage={wPage} totalPages={wTotalPages} onPageChange={setWPage} totalItems={wTotal} itemsPerPage={wPerPage} />
          </div>
        )}

        {/* PayPal branding */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
          <span className="text-[9px] text-slate-600 font-mono">Powered by PayPal Payouts API</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-600">Min: $5</span>
            <span className="text-[9px] text-slate-600">|</span>
            <span className="text-[9px] text-slate-600">Fee: 2.5%</span>
            <span className="text-[9px] text-slate-600">|</span>
            <span className="text-[9px] text-slate-600">100+ countries</span>
          </div>
        </div>

      {/* Slow spin animation for processing icon */}
      <style jsx>{`
        :global(.animate-spin-slow) {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
