'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BoltIcon } from './icons';

// ── Types ──────────────────────────────────────────────────

interface WorkspaceStats {
    totalVolume: number;
    rangeVolume?: number;
    totalBatches: number;
    employeeCount: number;
    avgBatchSize: number;
    zkProofsGenerated: number;
    daemonJobsProcessed: number;
    lastActivityAt: string | null;
    recentActivity: Array<{ name: string; volume: number }>;
    range?: string;
}

interface WorkspaceDashboardProps {
    stats: WorkspaceStats | null;
    agentStatus: string;
    onRangeChange?: (range: string) => void;
    activeRange?: string;
}

// ── Helpers ────────────────────────────────────────────────

function formatUSD(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string | null): string {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// ── Brand Color Themes ────────────────────────────────────

const colorThemes = {
    mint:   { bg: 'rgba(62,221,185,0.08)',  border: 'rgba(62,221,185,0.2)',  text: 'var(--agt-mint)',   bar: 'var(--agt-mint)' },
    blue:   { bg: 'rgba(27,191,236,0.08)',  border: 'rgba(27,191,236,0.2)',  text: 'var(--agt-blue)',   bar: 'var(--agt-blue)' },
    orange: { bg: 'rgba(255,125,44,0.08)',  border: 'rgba(255,125,44,0.2)',  text: 'var(--agt-orange)', bar: 'var(--agt-orange)' },
    pink:   { bg: 'rgba(255,45,135,0.08)',  border: 'rgba(255,45,135,0.2)',  text: 'var(--agt-pink)',   bar: 'var(--agt-pink)' },
} as const;

type ColorTheme = keyof typeof colorThemes;

function MetricCard({ label, value, subtitle, color, ratio }: {
    label: string;
    value: string | number;
    subtitle?: string;
    color: ColorTheme;
    ratio?: number;
}) {
    const c = colorThemes[color];
    return (
        <div className="rounded-xl p-3 sm:p-4 transition-all duration-200 hover:border-opacity-40"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
            <p className="text-lg sm:text-xl font-black font-mono tabular-nums" style={{ color: c.text }}>{value}</p>
            {subtitle && <p className="text-[11px] text-slate-600 mt-0.5">{subtitle}</p>}
            {ratio !== undefined && (
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(ratio * 100, 100)}%`, background: c.bar }} />
                </div>
            )}
        </div>
    );
}

// ── Daemon Status Indicator ────────────────────────────────

function DaemonStatusIndicator({ status, jobsProcessed, lastActivity }: {
    status: string;
    jobsProcessed: number;
    lastActivity: string | null;
}) {
    const isActive = status === 'ACTIVE' || status === 'PROCESSING';
    const statusColor = isActive ? 'var(--agt-orange)' : 'var(--pp-danger)';
    const statusLabel = status === 'PROCESSING' ? 'Processing' : isActive ? 'Active' : 'Offline';

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative w-[72px] h-[72px] flex-shrink-0">
                    <div className="absolute inset-0 rounded-full"
                        style={{
                            background: `conic-gradient(${statusColor} ${isActive ? 360 : 0}deg, rgba(255,255,255,0.06) 0deg)`,
                        }} />
                    <div className="absolute inset-[3px] rounded-full flex items-center justify-center"
                        style={{ background: 'var(--pp-bg-card)' }}>
                        <BoltIcon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} style={{ color: statusColor }} />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white mb-1">Daemon Engine</p>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                            <span className="text-[11px] font-bold" style={{ color: statusColor }}>{statusLabel}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            <span style={{ color: 'var(--agt-orange)' }} className="font-bold">{jobsProcessed}</span> jobs processed
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                {[
                    { label: 'Jobs Processed', value: jobsProcessed, color: 'var(--agt-orange)' },
                    { label: 'Last Activity', value: relativeTime(lastActivity), color: 'var(--agt-blue)', isText: true },
                    { label: 'Status', value: statusLabel, color: statusColor, isText: true },
                ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: row.color }} />
                            <span className="text-[11px] text-slate-500">{row.label}</span>
                        </div>
                        <span className="text-[11px] font-bold font-mono tabular-nums text-white">
                            {row.isText ? row.value : (row.value as number).toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────

function WorkspaceDashboard({ stats, agentStatus, onRangeChange, activeRange = '7d' }: WorkspaceDashboardProps) {
    const [chartMounted, setChartMounted] = useState(false);

    useEffect(() => {
        const timer = requestAnimationFrame(() => setChartMounted(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    const rangeVolume = useMemo(
        () => stats?.rangeVolume ?? stats?.recentActivity?.reduce((s, d) => s + d.volume, 0) ?? 0,
        [stats]
    );

    const rangeLabel = activeRange === '30d' ? '30-Day' : activeRange === 'all' ? 'All-Time' : '7-Day';
    const ranges = [
        { id: '7d', label: '7D' },
        { id: '30d', label: '30D' },
        { id: 'all', label: 'All' },
    ];

    const activityBuckets = useMemo(() => {
        if (!stats?.recentActivity) return [];
        const data = stats.recentActivity;
        if (activeRange === '7d' && data.length <= 7) return data;
        if (data.length <= 7) return data;
        const targetBuckets = activeRange === '7d' ? 7 : activeRange === '30d' ? 6 : Math.min(8, Math.ceil(data.length / 4));
        const bucketSize = Math.ceil(data.length / targetBuckets);
        const buckets: Array<{ name: string; volume: number }> = [];
        for (let i = 0; i < data.length; i += bucketSize) {
            const chunk = data.slice(i, i + bucketSize);
            const vol = chunk.reduce((s, d) => s + d.volume, 0);
            const first = chunk[0].name;
            const last = chunk[chunk.length - 1].name;
            buckets.push({ name: chunk.length > 1 ? `${first} - ${last}` : first, volume: parseFloat(vol.toFixed(3)) });
        }
        return buckets;
    }, [stats, activeRange]);

    if (!stats) {
        return (
            <div className="p-5 sm:p-6 space-y-6">
                <div className="flex items-center gap-3 pb-5 border-b border-white/[0.06]">
                    <div className="w-9 h-9 rounded-xl pp-skeleton" />
                    <div className="space-y-1.5">
                        <div className="w-44 h-5 rounded pp-skeleton" />
                        <div className="w-28 h-3 rounded pp-skeleton" />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="h-64 rounded-2xl pp-skeleton" />
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl pp-skeleton" />)}
                    </div>
                    <div className="h-64 rounded-2xl pp-skeleton" />
                    <div className="h-64 rounded-2xl pp-skeleton" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-5 sm:p-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between pb-5 mb-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="agt-icon-box agt-icon-box-mint">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-white">My Workspace</h2>
                        <p className="text-[11px] text-slate-500 font-mono">Analytics &bull; Real-time</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (!stats) return;
                            let csv = "data:text/csv;charset=utf-8,Period,Volume\n";
                            stats.recentActivity.forEach(d => { csv += `"${d.name}","${d.volume}"\n`; });
                            csv += `\n"Total Volume","${stats.totalVolume}"\n`;
                            csv += `"Total Batches","${stats.totalBatches}"\n`;
                            csv += `"Employees","${stats.employeeCount}"\n`;
                            csv += `"ZK Proofs","${stats.zkProofsGenerated}"\n`;
                            const link = document.createElement("a");
                            link.setAttribute("href", encodeURI(csv));
                            link.setAttribute("download", `Workspace_Report_${new Date().toISOString().slice(0, 10)}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="text-[11px] font-mono text-slate-500 px-2.5 py-1 rounded-lg border border-white/[0.06] hover:text-white hover:border-white/[0.12] transition-all"
                        title="Export workspace report"
                    >
                        Export
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--agt-mint)' }} />
                        <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Live</span>
                    </div>
                </div>
            </div>

            {/* ── Grid Layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Volume Chart */}
                <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-white">My {rangeLabel} Volume</h3>
                            <p className="text-[11px] text-slate-500 font-mono">{formatUSD(rangeVolume)} total</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {ranges.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => onRangeChange?.(r.id)}
                                    className={`text-[11px] font-mono px-2 py-1 rounded-lg border tracking-wider transition-all ${
                                        activeRange === r.id
                                            ? 'border-[rgba(62,221,185,0.3)] bg-[rgba(62,221,185,0.1)]'
                                            : 'text-slate-500 bg-transparent border-white/[0.06] hover:text-slate-300 hover:border-white/[0.12]'
                                    }`}
                                    style={activeRange === r.id ? { color: 'var(--agt-mint)' } : undefined}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {chartMounted && stats.recentActivity.length > 0 ? (
                        <div className="h-44 sm:h-52 w-full" style={{ minWidth: 0, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <AreaChart data={stats.recentActivity} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="wsVolGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--agt-mint)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--agt-blue)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 11 }} tickMargin={8} />
                                    <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--pp-bg-card)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                                        itemStyle={{ color: 'var(--agt-mint)', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                                    />
                                    <Area type="monotone" dataKey="volume" stroke="var(--agt-mint)" strokeWidth={2.5}
                                        fillOpacity={1} fill="url(#wsVolGrad)" animationDuration={1200} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-44 sm:h-52 flex items-center justify-center text-slate-600 text-[13px] font-mono">
                            No volume data yet
                        </div>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white">Quick Stats</h3>
                        <span className="agt-badge agt-badge-mint">Workspace</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <MetricCard label="Total Paid" value={formatUSD(stats.totalVolume)} subtitle={`${stats.totalBatches} batches`} color="mint" />
                        <MetricCard label="Employees" value={stats.employeeCount} subtitle="registered" color="blue" />
                        <MetricCard label="Completed Batches" value={stats.totalBatches} subtitle={`avg ${formatUSD(stats.avgBatchSize)}/batch`} color="orange" />
                        <MetricCard label="ZK Proofs" value={stats.zkProofsGenerated} subtitle="shielded payouts" color="pink" ratio={stats.totalBatches > 0 ? stats.zkProofsGenerated / stats.totalBatches : 0} />
                    </div>
                </div>

                {/* Activity Summary */}
                <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white">Activity Summary</h3>
                        <span className="agt-badge agt-badge-blue">
                            {activeRange === '30d' ? '30 Days' : activeRange === 'all' ? 'All Time' : '7 Days'}
                        </span>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {activityBuckets.map((bucket, i) => {
                                const maxVol = Math.max(...activityBuckets.map(d => d.volume), 1);
                                const pct = (bucket.volume / maxVol) * 100;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-[11px] text-slate-500 font-mono w-20 shrink-0 truncate">{bucket.name}</span>
                                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: bucket.volume > 0 ? 'linear-gradient(90deg, var(--agt-mint), var(--agt-blue))' : 'transparent'
                                                }} />
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-mono tabular-nums w-16 text-right">
                                            {bucket.volume > 0 ? formatUSD(bucket.volume) : '-'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">{rangeLabel} Total</span>
                            <span className="text-sm font-black font-mono" style={{ color: 'var(--agt-mint)' }}>{formatUSD(rangeVolume)}</span>
                        </div>
                    </div>
                </div>

                {/* Daemon Performance */}
                <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white">Daemon Performance</h3>
                        <span className="agt-badge agt-badge-orange">Engine</span>
                    </div>
                    <DaemonStatusIndicator
                        status={agentStatus}
                        jobsProcessed={stats.daemonJobsProcessed}
                        lastActivity={stats.lastActivityAt}
                    />
                </div>

                {/* Payroll Insights */}
                <div className="lg:col-span-2 rounded-2xl p-4 sm:p-5 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white">Payroll Insights</h3>
                        <span className="agt-badge agt-badge-pink">Analytics</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>Avg per Batch</p>
                            <p className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--pp-text-primary)' }}>{formatUSD(stats.avgBatchSize)}</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>ZK Ratio</p>
                            <p className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--agt-pink)' }}>
                                {stats.totalBatches > 0 ? Math.round((stats.zkProofsGenerated / stats.totalBatches) * 100) : 0}%
                            </p>
                        </div>
                        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>Avg per Employee</p>
                            <p className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--pp-text-primary)' }}>
                                {stats.employeeCount > 0 ? formatUSD(stats.totalVolume / stats.employeeCount) : '$0'}
                            </p>
                        </div>
                        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>Gas Saved</p>
                            <p className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--agt-mint)' }}>
                                ${(stats.totalBatches * 0.42).toFixed(2)}
                            </p>
                            <p className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>est. via sponsorship</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(WorkspaceDashboard);
