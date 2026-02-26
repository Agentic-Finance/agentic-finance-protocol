'use client';

import React, { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface RevenueData {
  tvl: { total: number; byContract: any[]; byToken: any[] };
  fees: { today: number; week: number; month: number; allTime: number };
  volume: { today: number; week: number; month: number };
  topAgents: { agentId: string; name: string; emoji: string; rating: number; jobs: number; revenue: number; fees: number }[];
  recentSettlements: { id: string; agentName: string; agentEmoji: string; amount: number; fee: number; token: string; txHash?: string; explorerUrl?: string; completedAt?: string }[];
  summary: { activeStreams: number; totalJobs: number };
}

interface ChartData {
  labels: string[];
  volume: number[];
  fees: number[];
  jobs: number[];
}

interface YieldData {
  positions: { id: string; jobId: string; principal: number; token: string; apy: number; yieldEarned: number; status: string; startedAt: string }[];
  summary: { totalPrincipal: number; totalYield: number; avgAPY: number; activePositions: number; totalPositions: number };
}

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function RevenueDashboard() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [yieldData, setYieldData] = useState<YieldData | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchYields();
    const interval = setInterval(() => { fetchData(); fetchYields(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchChart();
  }, [period]);

  async function fetchData() {
    try {
      const res = await fetch('/api/revenue');
      const json = await res.json();
      setData(json);
    } catch {
      // Silent fail, keep existing data
    } finally {
      setLoading(false);
    }
  }

  async function fetchYields() {
    try {
      const res = await fetch('/api/escrow/yields');
      const json = await res.json();
      setYieldData(json);
    } catch {
      // Silent fail
    }
  }

  async function fetchChart() {
    try {
      const res = await fetch(`/api/revenue/chart?period=${period}`);
      const json = await res.json();
      setChart(json);
    } catch {
      // Silent fail
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="pp-card p-5">
              <div className="pp-skeleton h-3 w-24 mb-3 rounded" />
              <div className="pp-skeleton h-8 w-20 mb-1 rounded" />
              <div className="pp-skeleton h-2.5 w-16 rounded" />
            </div>
          ))}
        </div>
        <div className="pp-card p-6">
          <div className="pp-skeleton h-5 w-48 mb-6 rounded" />
          <div className="pp-skeleton h-40 w-full rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<BanknotesIcon className="w-5 h-5" />}
          label="Total Value Locked"
          value={formatUSD(data?.tvl.total ?? 0)}
          color="emerald"
          subtitle="Across all contracts"
        />
        <StatCard
          icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
          label="24h Volume"
          value={formatUSD(data?.volume.today ?? 0)}
          color="indigo"
          subtitle={`Week: ${formatUSD(data?.volume.week ?? 0)}`}
        />
        <StatCard
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          label="Fees Collected"
          value={formatUSD(data?.fees.allTime ?? 0)}
          color="amber"
          subtitle={`Today: ${formatUSD(data?.fees.today ?? 0)}`}
        />
        <StatCard
          icon={<ChartBarIcon className="w-5 h-5" />}
          label="Active Streams"
          value={String(data?.summary.activeStreams ?? 0)}
          color="violet"
          subtitle={`${data?.summary.totalJobs ?? 0} total jobs`}
        />
        <StatCard
          icon={<SparklesIcon className="w-5 h-5" />}
          label="Escrow Yield"
          value={formatUSD(yieldData?.summary.totalYield ?? 0)}
          color="cyan"
          subtitle={`${yieldData?.summary.activePositions ?? 0} active · ${yieldData?.summary.avgAPY ?? 0}% APY`}
        />
      </div>

      {/* Volume Chart */}
      <div className="pp-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">Volume & Fees Over Time</h3>
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  period === p
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Simple CSS Bar Chart */}
        {chart && chart.labels.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-end gap-[2px] h-40">
              {chart.volume.map((v, i) => {
                const max = Math.max(...chart.volume, 1);
                const heightPct = (v / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end group relative">
                    <div
                      className="bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all hover:from-indigo-500 hover:to-indigo-300"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      <div>{chart.labels[i]}</div>
                      <div className="text-indigo-400">Vol: {formatUSD(v)}</div>
                      <div className="text-amber-400">Fee: {formatUSD(chart.fees[i])}</div>
                      <div className="text-slate-400">{chart.jobs[i]} jobs</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 px-1">
              <span>{chart.labels[0]}</span>
              <span>{chart.labels[Math.floor(chart.labels.length / 2)]}</span>
              <span>{chart.labels[chart.labels.length - 1]}</span>
            </div>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
            No data for selected period
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TVL Breakdown */}
        <div className="pp-card p-6">
          <h3 className="text-white font-bold text-lg mb-4">TVL Breakdown</h3>
          <div className="space-y-3">
            {(data?.tvl.byContract ?? []).map(c => (
              <div key={c.name} className="flex items-center justify-between">
                <div>
                  <span className="text-white text-sm font-medium">{c.label}</span>
                  <span className="text-slate-600 text-xs ml-2">{c.name}</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {formatUSD(c.totalUSD)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Agents by Revenue */}
        <div className="pp-card p-6">
          <h3 className="text-white font-bold text-lg mb-4">Top Agents by Revenue</h3>
          <div className="space-y-3">
            {(data?.topAgents ?? []).slice(0, 5).map((agent, i) => (
              <div key={agent.agentId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 text-xs font-mono w-4">{i + 1}.</span>
                  <span className="text-lg">{agent.emoji}</span>
                  <div>
                    <span className="text-white text-sm font-medium">{agent.name}</span>
                    <div className="text-[10px] text-slate-500">
                      {agent.jobs} jobs &bull; ⭐ {agent.rating.toFixed(1)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-mono font-bold text-sm block">
                    {formatUSD(agent.revenue)}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    fee: {formatUSD(agent.fees)}
                  </span>
                </div>
              </div>
            ))}
            {(!data?.topAgents || data.topAgents.length === 0) && (
              <p className="text-slate-600 text-sm text-center py-4">No agent revenue data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Escrow Yield Positions */}
      {yieldData && yieldData.positions.length > 0 && (
        <div className="pp-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <SparklesIcon className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-bold text-lg">Escrow Yield Positions</h3>
            </div>
            <span className="text-[10px] text-cyan-400/60 font-mono">
              {formatUSD(yieldData.summary.totalPrincipal)} locked
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-white/[0.04]">
                  <th className="text-left py-2 font-medium">Job ID</th>
                  <th className="text-right py-2 font-medium">Principal</th>
                  <th className="text-right py-2 font-medium">APY</th>
                  <th className="text-right py-2 font-medium">Yield Earned</th>
                  <th className="text-right py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {yieldData.positions.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.02] last:border-0">
                    <td className="py-2.5 text-slate-400 font-mono text-xs">{p.jobId.slice(0, 8)}...</td>
                    <td className="py-2.5 text-right text-white font-mono font-semibold">{formatUSD(p.principal)}</td>
                    <td className="py-2.5 text-right text-cyan-400 font-mono">{p.apy}%</td>
                    <td className="py-2.5 text-right text-emerald-400 font-mono font-semibold">{formatUSD(p.yieldEarned)}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.status === 'Accruing'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : p.status === 'Settled'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Settlements Feed */}
      <div className="pp-card p-6">
        <h3 className="text-white font-bold text-lg mb-4">Recent Settlements</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {(data?.recentSettlements ?? []).map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{s.agentEmoji}</span>
                <div>
                  <span className="text-white text-sm">{s.agentName}</span>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {s.completedAt ? formatTime(s.completedAt) : 'Pending'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {formatUSD(s.amount)} {s.token}
                </span>
                {s.explorerUrl && (
                  <a
                    href={s.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline block"
                  >
                    View TX →
                  </a>
                )}
              </div>
            </div>
          ))}
          {(!data?.recentSettlements || data.recentSettlements.length === 0) && (
            <p className="text-slate-600 text-sm text-center py-4">No settlements yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function StatCard({ icon, label, value, color, subtitle }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'emerald' | 'indigo' | 'amber' | 'violet' | 'cyan';
  subtitle?: string;
}) {
  const colors = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]' },
    indigo:  { bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  text: 'text-indigo-400',  glow: 'shadow-[0_0_20px_rgba(99,102,241,0.1)]' },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]' },
    violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  text: 'text-violet-400',  glow: 'shadow-[0_0_20px_rgba(139,92,246,0.1)]' },
    cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.1)]' },
  };
  const c = colors[color];

  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-5 ${c.glow}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={c.text}>{icon}</div>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className={`${c.text} font-mono font-black text-3xl`}>{value}</div>
      {subtitle && <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>}
    </div>
  );
}
