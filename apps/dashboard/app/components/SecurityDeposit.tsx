'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, ArrowPathIcon, BanknotesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import TierBadge from './TierBadge';

interface DepositData {
  vaultAddress: string;
  stats: {
    totalDeposited: number;
    totalSlashed: number;
    totalInsurancePaid: number;
    insurancePool: number;
    totalAgents: number;
  };
  deposit?: {
    wallet: string;
    amount: number;
    tier: number;
    tierName: string;
    tierEmoji: string;
    feeDiscountPct: string;
    effectiveFeePct: string;
    lockExpired: boolean;
    lockExpiresAt: string | null;
    slashCount: number;
    totalSlashed: number;
  };
  tiers: { name: string; emoji: string; threshold: number; discount: string; effectiveFee: string }[];
}

interface SecurityDepositProps {
  walletAddress?: string | null;
}

export default function SecurityDeposit({ walletAddress }: SecurityDepositProps) {
  const [data, setData] = useState<DepositData | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, [walletAddress]);

  async function fetchData() {
    try {
      const url = walletAddress
        ? `/api/security-deposit?wallet=${walletAddress}`
        : '/api/security-deposit';
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <ArrowPathIcon className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const deposit = data?.deposit;
  const stats = data?.stats;
  const currentTier = deposit?.tier ?? 0;

  // Next tier info
  const nextTierIndex = Math.min(currentTier + 1, 3);
  const nextTier = data?.tiers?.[nextTierIndex];
  const amountToNextTier = nextTier ? Math.max(0, nextTier.threshold - (deposit?.amount ?? 0)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
          <ShieldCheckIcon className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Security Deposit</h2>
          <p className="text-sm text-slate-500">Lock stablecoins → get fee discounts, prove skin in the game</p>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(data?.tiers ?? []).map((tier, i) => (
          <div
            key={tier.name}
            className={`rounded-xl p-4 border transition-all ${
              i === currentTier
                ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'bg-black/30 border-white/[0.06]'
            }`}
          >
            <div className="text-2xl mb-2">{tier.emoji}</div>
            <div className="text-white font-bold text-sm">{tier.name}</div>
            <div className="text-slate-500 text-xs mt-1">
              {tier.threshold > 0 ? `$${tier.threshold}+` : 'No deposit'}
            </div>
            <div className="text-emerald-400 text-xs font-bold mt-2">
              {tier.discount} off
            </div>
            <div className="text-slate-600 text-[10px]">
              Fee: {tier.effectiveFee}
            </div>
          </div>
        ))}
      </div>

      {/* Current Deposit */}
      {deposit && (
        <div className="bg-[#0B1215] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">Your Deposit</h3>
            <TierBadge tier={currentTier} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Deposited</span>
              <p className="text-white font-mono font-bold text-xl mt-1">${deposit.amount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fee Discount</span>
              <p className="text-emerald-400 font-mono font-bold text-xl mt-1">{deposit.feeDiscountPct}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Effective Fee</span>
              <p className="text-amber-400 font-mono font-bold text-xl mt-1">{deposit.effectiveFeePct}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Lock Status</span>
              <p className={`font-bold text-sm mt-1 ${deposit.lockExpired ? 'text-emerald-400' : 'text-slate-400'}`}>
                {deposit.lockExpired ? 'Unlocked' : 'Locked (30 days)'}
              </p>
            </div>
          </div>

          {/* Progress to next tier */}
          {currentTier < 3 && nextTier && (
            <div className="mt-4 bg-black/30 rounded-xl p-3">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Progress to {nextTier.name}</span>
                <span>${amountToNextTier.toFixed(2)} more needed</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((deposit.amount / nextTier.threshold) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Slash History */}
          {deposit.slashCount > 0 && (
            <div className="mt-4 bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2 text-rose-400 text-xs">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="font-bold">{deposit.slashCount} slash event(s)</span>
                <span className="text-rose-300">— ${deposit.totalSlashed.toFixed(2)} slashed</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vault Stats */}
      {stats && (
        <div className="bg-[#0B1215] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Vault Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Deposited</span>
              <p className="text-white font-mono font-bold mt-1">${stats.totalDeposited.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Slashed</span>
              <p className="text-rose-400 font-mono font-bold mt-1">${stats.totalSlashed.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Insurance Pool</span>
              <p className="text-amber-400 font-mono font-bold mt-1">${stats.insurancePool.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Insurance Paid</span>
              <p className="text-indigo-400 font-mono font-bold mt-1">${stats.totalInsurancePaid.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Agents</span>
              <p className="text-white font-mono font-bold mt-1">{stats.totalAgents}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
