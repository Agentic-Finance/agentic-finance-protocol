'use client';

import React from 'react';

interface MyReputationProps {
  reputation: {
    compositeScore: number;
    displayScore: number;
    tier: number;
    tierLabel: string;
  };
  deposit: {
    amount: string;
    tier: number;
    tierName: string;
    tierEmoji: string;
    feeDiscount: number;
  };
}

const TIER_GRADIENTS: Record<number, string> = {
  0: 'from-slate-500/20 to-slate-600/5',
  1: 'from-blue-500/20 to-cyan-500/5',
  2: 'from-indigo-500/20 to-violet-500/5',
  3: 'from-amber-500/20 to-yellow-500/5',
  4: 'from-purple-500/20 to-fuchsia-500/5',
};

const TIER_ACCENT: Record<number, string> = {
  0: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
  1: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  2: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  3: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  4: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
};

const DEPOSIT_ACCENT: Record<number, string> = {
  0: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
  1: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  2: 'text-slate-300 border-slate-400/30 bg-slate-400/10',
  3: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
};

export default function MyReputation({ reputation, deposit }: MyReputationProps) {
  const tierGradient = TIER_GRADIENTS[reputation.tier] ?? TIER_GRADIENTS[0];
  const tierAccent = TIER_ACCENT[reputation.tier] ?? TIER_ACCENT[0];
  const depositAccent = DEPOSIT_ACCENT[deposit.tier] ?? DEPOSIT_ACCENT[0];

  // Score ring (SVG circle)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const scoreOffset = circumference - (reputation.displayScore / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left: Reputation Score */}
      <div className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${tierGradient} p-6`}>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Trust Score
        </h3>
        <div className="flex items-center gap-6">
          {/* Score ring */}
          <div className="relative flex-shrink-0">
            <svg width="128" height="128" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={scoreOffset}
                className={tierAccent.split(' ')[0]}
                transform="rotate(-90 64 64)"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white tabular-nums font-mono">
                {reputation.displayScore}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">/100</span>
            </div>
          </div>

          {/* Tier info */}
          <div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${tierAccent}`}>
              {reputation.tierLabel}
            </span>
            <p className="text-[10px] text-slate-500 mt-2">
              Composite score from on-chain ratings, job history, and proof integrity
            </p>
          </div>
        </div>
      </div>

      {/* Right: Security Deposit */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Security Deposit
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Deposited Amount</p>
            <p className="text-2xl font-black text-white tabular-nums font-mono">
              <span className="text-slate-500">$</span>
              {parseFloat(deposit.amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${depositAccent}`}>
              {deposit.tierEmoji} {deposit.tierName}
            </span>
            {deposit.feeDiscount > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                -{deposit.feeDiscount}% fees
              </span>
            )}
          </div>

          <p className="text-[10px] text-slate-500">
            Higher deposits unlock lower platform fees and priority dispute resolution
          </p>
        </div>
      </div>
    </div>
  );
}
