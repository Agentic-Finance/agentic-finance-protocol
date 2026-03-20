'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface DepositInfo {
  wallet: string;
  amount: number;
  tier: number;
  tierName: string;
  tierEmoji: string;
  feeDiscountPct: string;
  effectiveFeePct: string;
  lockExpired: boolean;
  depositedAtISO: string | null;
}

interface VaultStats {
  totalDeposited: number;
  totalSlashed: number;
  insurancePool: number;
  totalAgents: number;
}

interface TierInfo {
  name: string;
  emoji: string;
  threshold: number;
  discount: string;
  effectiveFee: string;
}

const TIER_COLORS = [
  'border-slate-500/20 bg-slate-500/5',
  'border-amber-500/20 bg-amber-500/5',
  'border-cyan-500/20 bg-cyan-500/5',
  'border-fuchsia-500/20 bg-fuchsia-500/5',
];

export default function StakingPanel({ walletAddress }: { walletAddress: string | null }) {
  const [deposit, setDeposit] = useState<DepositInfo | null>(null);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [txPending, setTxPending] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const url = walletAddress
        ? `/api/security-deposit?wallet=${walletAddress}`
        : '/api/security-deposit';
      const res = await fetch(url);
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (data.tiers) setTiers(data.tiers);
      if (data.deposit) setDeposit(data.deposit);
    } catch (err) {
      console.error('Failed to fetch staking data:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeposit = async () => {
    if (!walletAddress || !depositAmount || txPending) return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) return alert('MetaMask not found');

    setTxPending(true);
    try {
      // SecurityDepositVault.deposit(uint256 amount)
      // ABI: function deposit(uint256 amount) external
      const amountWei = BigInt(Math.round(parseFloat(depositAmount) * 1e6)); // 6 decimals
      const iface = new (await import('ethers')).Interface([
        'function deposit(uint256 amount) external',
      ]);
      const data = iface.encodeFunctionData('deposit', [amountWei]);

      const vaultAddress = '0x8C1d4da4034FFEB5E3809aa017785cB70B081A80';
      await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: vaultAddress,
          data,
          type: '0x0', // legacy tx for Tempo L1
        }],
      });

      setDepositAmount('');
      setTimeout(fetchData, 3000);
    } catch (err: any) {
      console.error('Deposit failed:', err);
      alert(err?.message || 'Transaction failed');
    } finally {
      setTxPending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Your Deposit Card */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-bold text-lg">Your Security Deposit</h3>
            <p className="text-slate-500 text-xs mt-0.5">Stake AlphaUSD to unlock fee discounts & insurance</p>
          </div>
          {deposit && (
            <span className={`text-2xl px-3 py-1 rounded-xl border ${TIER_COLORS[deposit.tier]} font-bold`}>
              {deposit.tierEmoji} {deposit.tierName}
            </span>
          )}
        </div>

        {deposit && deposit.amount > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Deposited</div>
              <div className="text-xl font-black text-violet-400">${deposit.amount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Fee Discount</div>
              <div className="text-xl font-black text-emerald-400">{deposit.feeDiscountPct}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Effective Fee</div>
              <div className="text-xl font-black text-cyan-400">{deposit.effectiveFeePct}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Lock Status</div>
              <div className={`text-sm font-bold ${deposit.lockExpired ? 'text-emerald-400' : 'text-amber-400'}`}>
                {deposit.lockExpired ? '🔓 Unlocked' : '🔒 Locked (30d)'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm mb-4">
              {walletAddress ? 'No deposit yet. Stake to unlock benefits.' : 'Connect wallet to view your deposit.'}
            </p>
          </div>
        )}

        {/* Deposit Input */}
        {walletAddress && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.06]">
            <input
              type="number"
              placeholder="Amount (AlphaUSD)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="flex-1 bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/40 focus:outline-none"
            />
            <button
              onClick={handleDeposit}
              disabled={!depositAmount || txPending}
              className="px-6 py-2.5 rounded-xl bg-violet-500/20 text-violet-400 text-sm font-bold border border-violet-500/30 hover:bg-violet-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {txPending ? 'Confirming...' : '🔐 Deposit'}
            </button>
          </div>
        )}
      </div>

      {/* Tier Cards */}
      <div>
        <h3 className="text-white font-bold mb-3">Deposit Tiers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tiers.map((tier, idx) => {
            const isActive = deposit && deposit.tier === idx;
            return (
              <div
                key={tier.name}
                className={`rounded-xl border p-4 transition-all ${
                  isActive
                    ? `${TIER_COLORS[idx]} ring-1 ring-white/10`
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{tier.emoji}</span>
                  <span className="text-sm font-bold text-white">{tier.name}</span>
                  {isActive && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">ACTIVE</span>}
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Min Deposit</span>
                    <span className="text-white font-bold">${tier.threshold} αUSD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fee Discount</span>
                    <span className="text-emerald-400 font-bold">{tier.discount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Effective Fee</span>
                    <span className="text-cyan-400 font-bold">{tier.effectiveFee}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vault Stats */}
      {stats && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-white font-bold mb-3">Vault Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Total Deposited</div>
              <div className="text-lg font-black text-violet-400">${stats.totalDeposited.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Insurance Pool</div>
              <div className="text-lg font-black text-emerald-400">${stats.insurancePool.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Total Slashed</div>
              <div className="text-lg font-black text-red-400">${stats.totalSlashed.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Depositors</div>
              <div className="text-lg font-black text-cyan-400">{stats.totalAgents}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
