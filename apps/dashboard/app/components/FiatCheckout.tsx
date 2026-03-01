'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CreditCardIcon, CheckCircleIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/** Markup config — must match FIAT_CONFIG in fiat-onramp.ts */
const MARKUP_PERCENT = 8;

/** Paddle.js client-side token */
const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const PADDLE_ENVIRONMENT = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';

interface FiatCheckoutProps {
  amount?: number;
  userWallet: string;
  agentJobId?: string;
  shieldEnabled?: boolean;
  onComplete?: (result: { transactionId: string; status: string; txHash?: string; shieldEnabled?: boolean }) => void;
  compact?: boolean;
}

type PaymentStep = 'idle' | 'creating' | 'checkout' | 'processing' | 'success' | 'error';

// ── Paddle.js Script Loader ──────────────────────────────

let paddleLoaded = false;
let paddleInitialized = false;

/** Global callback — set by component, called by Paddle eventCallback */
let onCheckoutComplete: ((txnId: string) => void) | null = null;
let onCheckoutClosed: (() => void) | null = null;
let checkoutPaymentDone = false;

function loadPaddleJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (paddleLoaded) { resolve(); return; }
    if (typeof document === 'undefined') { reject(new Error('No document')); return; }

    const existing = document.querySelector('script[src*="paddle.js"]');
    if (existing) { paddleLoaded = true; resolve(); return; }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => { paddleLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(script);
  });
}

function initPaddle() {
  if (paddleInitialized) return;
  if (typeof window === 'undefined' || !(window as any).Paddle) return;

  const Paddle = (window as any).Paddle;

  try {
    // Set environment BEFORE Initialize (Paddle.js v2 API)
    if (PADDLE_ENVIRONMENT === 'sandbox') {
      Paddle.Environment.set('sandbox');
    }

    if (PADDLE_CLIENT_TOKEN) {
      Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
        eventCallback: (event: any) => {
          const name = event?.name || event?.type || '';
          console.log('[Paddle Event]', name, JSON.stringify(event?.data || {}).slice(0, 200));

          // Payment completed — flag it and notify component
          if (name === 'checkout.completed' || name === 'checkout.payment.completed') {
            const txnId = event?.data?.transaction_id || event?.data?.id || event?.data?.transaction?.id;
            console.log('[Paddle] Payment completed! txn:', txnId);
            checkoutPaymentDone = true;
            onCheckoutComplete?.(txnId);
          }

          // User closed overlay — check if payment was done
          if (name === 'checkout.closed') {
            console.log('[Paddle] Overlay closed, paymentDone:', checkoutPaymentDone);
            if (checkoutPaymentDone) {
              // Payment was completed, trigger processing
              onCheckoutComplete?.('');
            } else {
              onCheckoutClosed?.();
            }
          }

          // Checkout error
          if (name === 'checkout.error') {
            console.error('[Paddle Error]', event?.data);
          }
        },
      });
      paddleInitialized = true;
      console.log('[Paddle] Initialized OK');
    } else {
      console.warn('[Paddle] No client token — checkout will not work');
    }
  } catch (err) {
    console.error('[Paddle] Initialize failed:', err);
  }
}

// ── Component ────────────────────────────────────────────

export default function FiatCheckout({ amount: initialAmount, userWallet, agentJobId, shieldEnabled, onComplete, compact }: FiatCheckoutProps) {
  const [amount, setAmount] = useState(initialAmount ?? 10);
  const [step, setStep] = useState<PaymentStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pricing = useMemo(() => {
    const chargeAmount = +(amount * (1 + MARKUP_PERCENT / 100)).toFixed(2);
    const markupAmount = +(chargeAmount - amount).toFixed(2);
    return { cryptoAmount: amount, chargeAmount, markupAmount, markupPercent: MARKUP_PERCENT };
  }, [amount]);

  // Load Paddle.js on mount
  useEffect(() => {
    loadPaddleJs().then(() => initPaddle()).catch(() => {});
  }, []);

  // Poll for payment status (crypto transfer)
  const startPolling = useCallback((sessionId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/fiat/status?transactionId=${sessionId}`);
        const data = await res.json();

        if (data.status === 'CRYPTO_SENT' || data.status === 'ESCROWED' || data.status === 'SHIELD_DEPOSITED') {
          setTxHash(data.transferTxHash);
          setStep('success');
          onComplete?.({ transactionId: sessionId, status: data.status, txHash: data.transferTxHash, shieldEnabled: data.shieldEnabled });
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === 'FAILED') {
          setError('Payment processing failed');
          setStep('error');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Keep polling
      }
    }, 3000);

    // Stop after 3 minutes
    setTimeout(() => { if (pollRef.current) clearInterval(pollRef.current); }, 180000);
  }, [onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      onCheckoutComplete = null;
      onCheckoutClosed = null;
    };
  }, []);

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
          shieldEnabled: !!shieldEnabled,
          returnUrl: window.location.href,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      const currentTxnId = data.transactionId;
      setTransactionId(currentTxnId);

      if (data.demo) {
        setStep('processing');
        setTimeout(() => {
          setStep('success');
          onComplete?.({ transactionId: currentTxnId, status: 'CRYPTO_SENT' });
        }, 2000);
        return;
      }

      // Ensure Paddle is ready
      const Paddle = (window as any).Paddle;
      if (!Paddle) {
        throw new Error('Paddle.js not loaded. Please refresh the page.');
      }
      if (!paddleInitialized) {
        initPaddle();
        if (!paddleInitialized) {
          throw new Error(`Paddle not initialized. Token: ${PADDLE_CLIENT_TOKEN ? 'present' : 'MISSING'}`);
        }
      }

      // Reset payment flag
      checkoutPaymentDone = false;

      // Set up event callbacks BEFORE opening checkout
      onCheckoutComplete = (txnId: string) => {
        console.log('[FiatCheckout] Payment completed! Processing crypto transfer...');
        setStep('processing');
        // Start polling if not already
        startPolling(txnId || currentTxnId);
      };

      onCheckoutClosed = () => {
        // Only reset if payment wasn't completed
        setStep((prev) => {
          if (prev === 'checkout') {
            return 'idle';
          }
          return prev;
        });
      };

      setStep('checkout');

      // Open Paddle overlay — NO successUrl (prevents redirect)
      Paddle.Checkout.open({
        transactionId: currentTxnId,
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: 'en',
        },
      });

      // Start polling immediately (don't wait for event — webhook may update DB first)
      startPolling(currentTxnId);

    } catch (err: any) {
      setError(err.message);
      setStep('error');
    }
  };

  // ── Compact Mode ───────────────────────────────────────

  if (compact) {
    return (
      <div className="w-full">
        <button
          onClick={handleCheckout}
          disabled={step === 'creating' || step === 'checkout' || step === 'processing' || step === 'success'}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
            step === 'success'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : step === 'error'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : step === 'creating' || step === 'checkout' || step === 'processing'
              ? 'bg-indigo-500/30 text-indigo-300 cursor-wait'
              : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]'
          }`}
        >
          {step === 'creating' ? (
            <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Creating Session...</>
          ) : step === 'checkout' ? (
            <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Complete in Paddle...</>
          ) : step === 'processing' ? (
            <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Sending Crypto...</>
          ) : step === 'success' ? (
            <><CheckCircleIcon className="w-5 h-5" /> Payment Complete</>
          ) : step === 'error' ? (
            <><ExclamationTriangleIcon className="w-5 h-5" /> {error || 'Failed'}</>
          ) : (
            <><CreditCardIcon className="w-5 h-5" /> Pay ${pricing.chargeAmount.toFixed(2)} with Card</>
          )}
        </button>

        {/* Success: show transaction link */}
        {step === 'success' && (
          <div className={`mt-2 rounded-lg p-3 text-center ${
            shieldEnabled
              ? 'bg-violet-500/10 border border-violet-500/20'
              : 'bg-emerald-500/10 border border-emerald-500/20'
          }`}>
            <p className={`text-xs font-semibold mb-1 ${shieldEnabled ? 'text-violet-400' : 'text-emerald-400'}`}>
              {shieldEnabled && <span className="mr-1">🛡</span>}
              {pricing.cryptoAmount.toFixed(2)} AlphaUSD {shieldEnabled ? 'shielded via ZK Vault' : 'sent to wallet'}
            </p>
            {txHash ? (
              <a
                href={`https://explore.tempo.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[10px] font-mono hover:underline ${shieldEnabled ? 'text-violet-300' : 'text-emerald-300'}`}
              >
                {shieldEnabled ? 'Deposit' : 'Tx'}: {txHash.slice(0, 10)}...{txHash.slice(-8)} →
              </a>
            ) : (
              <span className={`text-[10px] ${shieldEnabled ? 'text-violet-300/50' : 'text-emerald-300/50'}`}>
                Transaction confirmed on Tempo L1
              </span>
            )}
            {shieldEnabled && (
              <p className="text-violet-300/40 text-[9px] mt-1">Daemon will process ZK withdrawal</p>
            )}
          </div>
        )}

        {/* Processing: show status */}
        {step === 'processing' && (
          <div className={`mt-2 rounded-lg p-2 text-center ${
            shieldEnabled
              ? 'bg-violet-500/10 border border-violet-500/20'
              : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            <p className={`text-[10px] flex items-center justify-center gap-1.5 ${
              shieldEnabled ? 'text-violet-400' : 'text-amber-400'
            }`}>
              <ArrowPathIcon className="w-3 h-3 animate-spin" />
              {shieldEnabled
                ? 'Payment received — depositing to ZK Shield Vault...'
                : 'Payment received — transferring AlphaUSD...'}
            </p>
          </div>
        )}

        {/* Error detail */}
        {step === 'error' && error && (
          <div className="mt-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-center">
            <p className="text-rose-400 text-[10px]">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Full Mode ──────────────────────────────────────────

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
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Amount (AlphaUSD to receive)</label>
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

      {/* Pricing Breakdown */}
      <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-4 space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-xs">You receive</span>
          <span className="text-emerald-400 font-mono font-bold">{pricing.cryptoAmount.toFixed(2)} AlphaUSD</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-xs">Processing fee ({pricing.markupPercent}%)</span>
          <span className="text-slate-400 font-mono text-sm">+${pricing.markupAmount.toFixed(2)}</span>
        </div>
        <div className="border-t border-white/5 pt-2.5 flex justify-between items-center">
          <span className="text-white text-xs font-semibold">Total charged</span>
          <span className="text-white font-mono font-bold text-lg">${pricing.chargeAmount.toFixed(2)}</span>
        </div>
        <div className="text-center">
          <span className="text-[10px] text-slate-600">1 USD = 1 AlphaUSD &bull; {pricing.markupPercent}% processing fee included</span>
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

      {/* Checkout in progress */}
      {step === 'checkout' && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 mb-4">
          <p className="text-indigo-400 text-xs font-bold flex items-center gap-2">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Paddle checkout is open. Complete your payment in the overlay.
          </p>
        </div>
      )}

      {/* Processing crypto transfer */}
      {step === 'processing' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
          <p className="text-amber-400 text-xs font-bold flex items-center gap-2">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Payment received! Transferring AlphaUSD to your wallet...
          </p>
        </div>
      )}

      {/* Success */}
      {step === 'success' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
          <p className="text-emerald-400 text-sm font-bold mb-1 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            Payment Complete!
          </p>
          <p className="text-emerald-300/70 text-xs mb-2">
            {pricing.cryptoAmount} AlphaUSD sent to your wallet.
          </p>
          {txHash && (
            <a
              href={`https://explore.tempo.xyz/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 text-[10px] font-mono hover:underline"
            >
              View on Explorer →
            </a>
          )}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={step === 'creating' || step === 'checkout' || step === 'processing' || step === 'success'}
        className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
          step === 'success'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
            : step === 'creating' || step === 'checkout' || step === 'processing'
            ? 'bg-indigo-500/30 text-indigo-300 cursor-wait'
            : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
        }`}
      >
        {step === 'creating' ? (
          <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Creating Session...</>
        ) : step === 'checkout' ? (
          <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Complete in Paddle...</>
        ) : step === 'processing' ? (
          <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Transferring Crypto...</>
        ) : step === 'success' ? (
          <><CheckCircleIcon className="w-5 h-5" /> Payment Complete</>
        ) : (
          <><CreditCardIcon className="w-5 h-5" /> Pay with Credit Card</>
        )}
      </button>

      <p className="text-center text-[10px] text-slate-600 mt-3">
        Powered by Paddle. Funds arrive on Tempo L1 within seconds.
      </p>
    </div>
  );
}
