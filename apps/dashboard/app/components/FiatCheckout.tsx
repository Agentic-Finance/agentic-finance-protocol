'use client';

import React, { useState } from 'react';
import { CreditCardIcon, CheckCircleIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface FiatCheckoutProps {
  /** Pre-filled amount in USD */
  amount?: number;
  /** User's wallet address */
  userWallet: string;
  /** Agent job ID (optional, for escrow flow) */
  agentJobId?: string;
  /** Callback when checkout is complete */
  onComplete?: (result: { sessionId: string; status: string; txHash?: string }) => void;
  /** Compact mode for embedding in other components */
  compact?: boolean;
}

type PaymentStep = 'idle' | 'creating' | 'redirecting' | 'processing' | 'success' | 'error';

export default function FiatCheckout({ amount: initialAmount, userWallet, agentJobId, onComplete, compact }: FiatCheckoutProps) {
  const [amount, setAmount] = useState(initialAmount ?? 10);
  const [step, setStep] = useState<PaymentStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleCheckout = async () => {
    setError(null);
    setStep('creating');

    try {
      const res = await fetch('/api/fiat/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          userWallet,
          agentJobId,
          returnUrl: window.location.href,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      setSessionId(data.sessionId);

      if (data.demo) {
        // Demo mode: simulate success
        setStep('processing');
        setTimeout(() => {
          setStep('success');
          onComplete?.({ sessionId: data.sessionId, status: 'CRYPTO_SENT' });
        }, 2000);
      } else {
        // Production: redirect to Stripe
        setStep('redirecting');
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message);
      setStep('error');
    }
  };

  // Check for returning from Stripe
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fiatSession = params.get('fiat_session');
    const success = params.get('success');

    if (fiatSession && success === 'true') {
      setSessionId(fiatSession);
      setStep('processing');

      // Poll for status
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/fiat/status?sessionId=${fiatSession}`);
          const data = await res.json();

          if (data.status === 'CRYPTO_SENT' || data.status === 'ESCROWED') {
            setStep('success');
            setTxHash(data.transferTxHash);
            onComplete?.({ sessionId: fiatSession, status: data.status, txHash: data.transferTxHash });
            clearInterval(poll);
          } else if (data.status === 'FAILED') {
            setError('Payment processing failed');
            setStep('error');
            clearInterval(poll);
          }
        } catch {
          // Keep polling
        }
      }, 3000);

      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(poll), 120000);

      return () => clearInterval(poll);
    }
  }, []);

  if (compact) {
    return (
      <button
        onClick={handleCheckout}
        disabled={step === 'creating' || step === 'redirecting' || step === 'processing'}
        className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
          step === 'success'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : step === 'error'
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]'
        }`}
      >
        {step === 'creating' || step === 'redirecting' ? (
          <>
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : step === 'processing' ? (
          <>
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            Sending Crypto...
          </>
        ) : step === 'success' ? (
          <>
            <CheckCircleIcon className="w-5 h-5" />
            Payment Complete
          </>
        ) : step === 'error' ? (
          <>
            <ExclamationTriangleIcon className="w-5 h-5" />
            {error || 'Failed'}
          </>
        ) : (
          <>
            <CreditCardIcon className="w-5 h-5" />
            Pay ${amount.toFixed(2)} with Card
          </>
        )}
      </button>
    );
  }

  return (
    <div className="bg-[#0B1215] border border-white/10 rounded-2xl p-6 max-w-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/30">
          <CreditCardIcon className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Pay with Card</h3>
          <p className="text-slate-500 text-xs">Credit card → AlphaUSD → Escrow</p>
        </div>
      </div>

      {/* Amount Input */}
      {!initialAmount && (
        <div className="mb-4">
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Amount (USD)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
              max={10000}
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>
      )}

      {/* Conversion Display */}
      <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-xs">You pay</span>
          <span className="text-white font-mono font-bold">${amount.toFixed(2)} USD</span>
        </div>
        <div className="flex justify-center my-2">
          <span className="text-slate-600 text-lg">↓</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-xs">You receive</span>
          <span className="text-emerald-400 font-mono font-bold">{amount.toFixed(2)} AlphaUSD</span>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-600">1 USD = 1 AlphaUSD (stablecoin)</span>
        </div>
      </div>

      {/* Wallet Display */}
      <div className="bg-black/30 border border-white/5 rounded-xl p-3 mb-6">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Destination Wallet</span>
        <p className="text-white font-mono text-xs mt-1 truncate">{userWallet}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Success */}
      {step === 'success' && txHash && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4">
          <p className="text-emerald-400 text-xs font-bold mb-1">Payment Complete!</p>
          <a
            href={`https://explore.tempo.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-300 text-[10px] font-mono hover:underline"
          >
            View on Explorer →
          </a>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={step === 'creating' || step === 'redirecting' || step === 'processing' || step === 'success'}
        className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
          step === 'success'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
            : step === 'creating' || step === 'redirecting' || step === 'processing'
            ? 'bg-indigo-500/30 text-indigo-300 cursor-wait'
            : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
        }`}
      >
        {step === 'creating' ? (
          <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Creating Session...</>
        ) : step === 'redirecting' ? (
          <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Redirecting to Stripe...</>
        ) : step === 'processing' ? (
          <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Transferring Crypto...</>
        ) : step === 'success' ? (
          <><CheckCircleIcon className="w-5 h-5" /> Payment Complete</>
        ) : (
          <><CreditCardIcon className="w-5 h-5" /> Pay with Credit Card</>
        )}
      </button>

      <p className="text-center text-[10px] text-slate-600 mt-3">
        Powered by Stripe. Funds arrive on Tempo L1 within seconds.
      </p>
    </div>
  );
}
