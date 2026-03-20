'use client';
import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/ui/AppShell';
import { EarningsChart } from '../components/analytics/EarningsChart';
import { AgentPerformanceTable } from '../components/analytics/AgentPerformanceTable';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { useWallet } from '../hooks/useWallet';
import { DollarSign, Briefcase, Star, Bot } from 'lucide-react';

interface AnalyticsData {
  totalEarnings: number;
  totalJobs: number;
  avgRating: number;
  activeAgents: number;
  earningsByMonth: Array<{ month: string; amount: number }>;
  jobsByMonth: Array<{ month: string; count: number }>;
  topAgents: Array<{
    id: string;
    name: string;
    avatarEmoji: string;
    category: string;
    jobs: number;
    earnings: number;
    rating: number;
    successRate: number;
  }>;
}

export default function AnalyticsPage() {
  const { address } = useWallet();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/analytics?wallet=${address}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address]);

  if (loading) {
    return (
      <AppShell>
        <PageLoading text="Loading analytics..." />
      </AppShell>
    );
  }

  const stats = [
    {
      label: 'Total Earnings',
      value: `$${(data?.totalEarnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      label: 'Total Jobs',
      value: (data?.totalJobs ?? 0).toLocaleString(),
      icon: Briefcase,
      color: 'text-cyan-400 bg-cyan-500/10',
    },
    {
      label: 'Avg Rating',
      value: (data?.avgRating ?? 0).toFixed(1),
      icon: Star,
      color: 'text-amber-400 bg-amber-500/10',
    },
    {
      label: 'Active Agents',
      value: (data?.activeAgents ?? 0).toString(),
      icon: Bot,
      color: 'text-indigo-400 bg-indigo-500/10',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Agent Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Performance metrics for your registered agents</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg font-bold text-white font-mono">{stat.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <EarningsChart data={data?.earningsByMonth ?? []} />
          {/* Jobs chart - same structure */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Jobs by Month</h3>
            {(data?.jobsByMonth ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No data yet</p>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {(data?.jobsByMonth ?? []).slice(-12).map(d => {
                  const max = Math.max(...(data?.jobsByMonth ?? []).map(j => j.count), 1);
                  const height = (d.count / max) * 100;
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {d.count > 0 ? d.count : ''}
                      </span>
                      <div className="w-full flex items-end" style={{ height: '120px' }}>
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            height: `${Math.max(height, 2)}%`,
                            background: 'linear-gradient(to top, #FF2D87, #FF7D2C)',
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-600">{d.month.split('-')[1]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Agent performance table */}
        <AgentPerformanceTable agents={data?.topAgents ?? []} />
      </div>
    </AppShell>
  );
}
