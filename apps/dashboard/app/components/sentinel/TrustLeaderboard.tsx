'use client';

import React, { useState, useEffect } from 'react';
import AgentScoreBar from './AgentScoreBar';
import type { LeaderboardAgent } from '../../lib/warroom-types';

const TIER_BADGES: Record<number, { emoji: string; label: string; cls: string }> = {
  0: { emoji: '⚪', label: 'Newcomer', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  1: { emoji: '🌱', label: 'Rising',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  2: { emoji: '⭐', label: 'Trusted',  cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  3: { emoji: '💎', label: 'Elite',    cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  4: { emoji: '👑', label: 'Legend',   cls: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
};

export default function TrustLeaderboard() {
  const [agents, setAgents] = useState<LeaderboardAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sentinel/leaderboard')
      .then((r) => r.json())
      .then((data) => {
        if (data.agents) setAgents(data.agents);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">⭐</div>
        <h3 className="text-white font-bold mb-1">No Agents Tracked</h3>
        <p className="text-slate-500 text-sm">ReputationRegistry has no tracked agents yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[9px] uppercase tracking-widest text-slate-600 font-bold">
        <div className="col-span-1">#</div>
        <div className="col-span-3">Agent</div>
        <div className="col-span-3">Trust Score</div>
        <div className="col-span-1 text-center">Tier</div>
        <div className="col-span-2 text-right">Jobs</div>
        <div className="col-span-2 text-right">Proof Rate</div>
      </div>

      {/* Rows */}
      {agents.map((agent) => {
        const badge = TIER_BADGES[agent.tier] ?? TIER_BADGES[0];
        const isExpanded = expandedWallet === agent.wallet;

        return (
          <div key={agent.wallet}>
            <button
              onClick={() => setExpandedWallet(isExpanded ? null : agent.wallet)}
              className={`w-full grid grid-cols-12 gap-3 items-center px-4 py-3 rounded-xl border transition-all text-left ${
                isExpanded
                  ? 'bg-white/[0.06] border-white/[0.10]'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
              }`}
            >
              <div className="col-span-1 text-sm font-black text-slate-500 tabular-nums">
                {agent.rank}
              </div>
              <div className="col-span-3 min-w-0">
                <div className="flex items-center gap-2">
                  {agent.emoji && <span className="text-sm">{agent.emoji}</span>}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {agent.name ?? `Agent ${agent.wallet.slice(0, 6)}`}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-3">
                <AgentScoreBar score={agent.displayScore} tier={agent.tier} />
              </div>
              <div className="col-span-1 flex justify-center">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.cls}`}>
                  {badge.emoji}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-bold text-emerald-400 tabular-nums">{agent.jobsCompleted}</span>
                {agent.jobsFailed > 0 && (
                  <span className="text-[10px] text-red-400 ml-1">({agent.jobsFailed} failed)</span>
                )}
              </div>
              <div className="col-span-2 text-right">
                <span className={`text-sm font-bold tabular-nums ${
                  agent.proofMatchRate >= 90 ? 'text-emerald-400' :
                  agent.proofMatchRate >= 70 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {agent.proofMatchRate.toFixed(1)}%
                </span>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="mx-4 mt-1 mb-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in slide-in-from-top-1 duration-200">
                <div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Composite Score</div>
                  <div className="text-lg font-black text-cyan-400">{agent.displayScore.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Tier</div>
                  <div className="text-lg font-black text-white">{badge.emoji} {badge.label}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Total Volume</div>
                  <div className="text-lg font-black text-indigo-400">${Math.round(agent.totalVolume).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Full Wallet</div>
                  <div className="text-xs font-mono text-slate-400 break-all">{agent.wallet}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
