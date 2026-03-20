'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Types ──────────────────────────────────────────────────

interface SwarmStats {
    totalSwarms: number;
    activeSwarms: number;
    totalBudgetLocked: number;
    totalEscrowLocked: number;
    totalReleased: number;
    a2aVolume: number;
    a2aCount: number;
    intelCount: number;
    auditCount: number;
    totalFees: number;
}

interface ChartPoint {
    name: string;
    volume: number;
}

interface AuditEvent {
    id: string;
    agentName: string | null;
    eventType: string;
    title: string;
    severity: string;
    createdAt: string;
    txHash: string | null;
}

interface ProofStats {
    totalCommitments: number;
    totalVerified: number;
    totalMatched: number;
    totalMismatched: number;
    totalSlashed: number;
    matchRate: string;
    integrity: string;
    contractAddress: string;
    explorerUrl: string;
    lastUpdated: string;
}

// ── Helpers ────────────────────────────────────────────────

function formatUSD(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

const EVENT_ICONS: Record<string, string> = {
    SWARM_CREATED: '\u{1F41D}', SWARM_COMPLETED: '\u{1F389}', AGENT_JOINED: '\u{1F916}',
    MILESTONE_SUBMITTED: '\u{1F4E4}', MILESTONE_APPROVED: '\u2705', MILESTONE_REJECTED: '\u274C',
    A2A_TRANSFER: '\u26A1', A2A_BATCH: '\u{1F4E6}',
    INTEL_SUBMITTED: '\u{1F6E1}\uFE0F', INTEL_VERIFIED: '\u{1F52C}', INTEL_PURCHASED: '\u{1F4B0}',
    ESCROW_LOCKED: '\u{1F510}', ESCROW_RELEASED: '\u{1F513}', ESCROW_SETTLED: '\u{1F48E}',
    STREAM_CREATED: '\u{1F504}', STREAM_COMPLETED: '\u{1F3C1}',
    BUDGET_ALLOCATED: '\u{1F4B5}', SYSTEM_EVENT: '\u2699\uFE0F',
    AI_PROOF_COMMITTED: '\u{1F9E0}', AI_PROOF_VERIFIED: '\u{1F50D}',
};

const SEVERITY_COLORS: Record<string, string> = {
    INFO: '#3b82f6', SUCCESS: '#10b981', WARNING: '#f59e0b', ERROR: '#ef4444',
};

// ── MetricCard ─────────────────────────────────────────────

const colorThemes = {
    emerald: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', text: '#10b981', bar: '#10b981' },
    cyan: { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', text: '#06b6d4', bar: '#06b6d4' },
    amber: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b', bar: '#f59e0b' },
    fuchsia: { bg: 'rgba(217,70,239,0.08)', border: 'rgba(217,70,239,0.2)', text: '#d946ef', bar: '#d946ef' },
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
        <div className="rounded-xl p-3 sm:p-4 transition-all hover:scale-[1.02]"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
            <p className="text-lg sm:text-xl font-black font-mono tabular-nums" style={{ color: c.text }}>{value}</p>
            {subtitle && <p className="text-[9px] text-slate-600 mt-0.5">{subtitle}</p>}
            {ratio !== undefined && (
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(ratio * 100, 100)}%`, background: c.bar }} />
                </div>
            )}
        </div>
    );
}

// ── ZK Proof Gauge ─────────────────────────────────────────

function ProofGauge({ matchRate, totalVerified, totalCommitments, totalSlashed }: {
    matchRate: string;
    totalVerified: number;
    totalCommitments: number;
    totalSlashed: number;
}) {
    const percent = parseFloat(matchRate) || 0;
    const gaugeColor = percent >= 90 ? '#10b981' : percent >= 70 ? '#f59e0b' : '#ef4444';

    return (
        <div className="flex items-center gap-4">
            <div className="relative w-[72px] h-[72px] flex-shrink-0">
                <div className="absolute inset-0 rounded-full"
                    style={{
                        background: `conic-gradient(${gaugeColor} ${percent * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                    }} />
                <div className="absolute inset-[3px] rounded-full flex items-center justify-center"
                    style={{ background: 'var(--pp-bg-card)' }}>
                    <span className="text-sm font-black font-mono" style={{ color: gaugeColor }}>{matchRate}</span>
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white mb-1">ZK Proof Integrity</p>
                <div className="space-y-0.5">
                    <p className="text-[9px] text-slate-500">
                        <span className="text-emerald-400 font-bold">{totalVerified}</span> verified / {totalCommitments} committed
                    </p>
                    {totalSlashed > 0 && (
                        <p className="text-[9px] text-red-400">
                            {totalSlashed} slashed
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────

function ProtocolDashboard() {
    const [stats, setStats] = useState<SwarmStats | null>(null);
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [proofStats, setProofStats] = useState<ProofStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartMounted, setChartMounted] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, chartRes, auditRes, proofRes] = await Promise.all([
                fetch('/api/swarm/stats'),
                fetch('/api/stats/chart'),
                fetch('/api/audit/timeline?limit=8'),
                fetch('/api/proof/stats'),
            ]);
            const [statsJson, chartJson, auditJson, proofJson] = await Promise.all([
                statsRes.json(), chartRes.json(), auditRes.json(), proofRes.json(),
            ]);

            if (statsJson.success) setStats(statsJson.stats);
            if (chartJson.success) setChartData(chartJson.data);
            if (auditJson.success) setEvents(auditJson.events?.slice(0, 8) || []);
            if (proofJson.success) setProofStats(proofJson);
        } catch (err) {
            console.error('[ProtocolDashboard] fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => { if (!document.hidden) fetchData(); }, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Delay chart render for SSR safety
    useEffect(() => {
        const timer = requestAnimationFrame(() => setChartMounted(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    const totalWeekVolume = useMemo(() => chartData.reduce((s, d) => s + d.volume, 0), [chartData]);

    const releasedPct = stats && stats.totalBudgetLocked > 0
        ? (stats.totalReleased / stats.totalBudgetLocked) * 100 : 0;
    const lockedPct = stats && stats.totalBudgetLocked > 0
        ? ((stats.totalBudgetLocked - stats.totalReleased) / stats.totalBudgetLocked) * 100 : 0;

    // ── Loading Skeleton ───────────────────────────────────
    if (loading) {
        return (
            <div className="p-5 sm:p-8 space-y-6">
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
        <div className="p-5 sm:p-8">
            {/* ── Header ──────────────────────────────────── */}
            <div className="flex items-center justify-between pb-5 mb-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border"
                        style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }}>
                        <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-white">Protocol Dashboard</h2>
                        <p className="text-[10px] text-slate-500 font-mono">Real-time analytics &bull; Tempo L1</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Live</span>
                </div>
            </div>

            {/* ── Grid Layout ─────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">

                {/* ── Top-Left: Volume Chart ──────────────── */}
                <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-white">7-Day Volume</h3>
                            <p className="text-[10px] text-slate-500 font-mono">
                                {formatUSD(totalWeekVolume)} total
                            </p>
                        </div>
                        <span className="text-[9px] font-mono text-indigo-400 px-2 py-1 rounded border tracking-widest"
                            style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }}>
                            VOLUME
                        </span>
                    </div>
                    {chartMounted && chartData.length > 0 ? (
                        <div className="h-44 sm:h-52 w-full" style={{ minWidth: 0, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="pdVolGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#d946ef" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 10 }} tickMargin={8} />
                                    <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--pp-bg-card)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                                        itemStyle={{ color: '#d946ef', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                                    />
                                    <Area type="monotone" dataKey="volume" stroke="#d946ef" strokeWidth={2.5}
                                        fillOpacity={1} fill="url(#pdVolGrad)" animationDuration={1200} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-44 sm:h-52 flex items-center justify-center text-slate-600 text-xs font-mono">
                            No volume data
                        </div>
                    )}
                </div>

                {/* ── Top-Right: Key Metrics ──────────────── */}
                <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white">Key Metrics</h3>
                        <span className="text-[9px] font-mono text-emerald-400 px-2 py-1 rounded border tracking-widest"
                            style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }}>
                            PROTOCOL
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <MetricCard
                            label="Active Swarms"
                            value={stats?.activeSwarms ?? 0}
                            subtitle={`${stats?.totalSwarms ?? 0} total sessions`}
                            color="emerald"
                            ratio={stats && stats.totalSwarms > 0 ? stats.activeSwarms / stats.totalSwarms : 0}
                        />
                        <MetricCard
                            label="A2A Volume"
                            value={formatUSD(stats?.a2aVolume ?? 0)}
                            subtitle={`${stats?.a2aCount ?? 0} transfers`}
                            color="cyan"
                        />
                        <MetricCard
                            label="Escrow Locked"
                            value={formatUSD(stats?.totalBudgetLocked ?? 0)}
                            subtitle={`${formatUSD(stats?.totalReleased ?? 0)} released`}
                            color="amber"
                            ratio={stats && stats.totalBudgetLocked > 0 ? stats.totalReleased / stats.totalBudgetLocked : 0}
                        />
                        <MetricCard
                            label="Platform Fees"
                            value={formatUSD(stats?.totalFees ?? 0)}
                            subtitle="5% protocol fee"
                            color="fuchsia"
                        />
                    </div>
                </div>

                {/* ── Bottom-Left: Live Event Feed ────────── */}
                <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white">Live Events</h3>
                        <span className="text-[9px] font-mono text-blue-400 px-2 py-1 rounded border tracking-widest"
                            style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }}>
                            {events.length} RECENT
                        </span>
                    </div>
                    {events.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-slate-600 text-xs">No events yet</div>
                    ) : (
                        <div className="space-y-2 max-h-[260px] overflow-y-auto cyber-scroll-y pr-1">
                            {events.map((event, i) => {
                                const sevColor = SEVERITY_COLORS[event.severity] || '#3b82f6';
                                return (
                                    <div key={event.id}
                                        className="flex items-start gap-2.5 p-2.5 rounded-xl transition-colors hover:bg-white/[0.03]"
                                        style={{
                                            background: 'rgba(255,255,255,0.015)',
                                            borderLeft: `2px solid ${sevColor}`,
                                            animation: `fadeInUp 0.3s ease-out ${i * 50}ms both`,
                                        }}>
                                        <span className="text-sm mt-0.5 shrink-0">{EVENT_ICONS[event.eventType] || '\u{1F4CB}'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] text-white font-medium truncate">{event.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] text-slate-500 font-mono">{relativeTime(event.createdAt)}</span>
                                                {event.agentName && (
                                                    <span className="text-[9px] text-blue-400/70 font-mono truncate max-w-[80px]">{event.agentName}</span>
                                                )}
                                                {event.txHash && (
                                                    <a href={`https://explore.moderato.tempo.xyz/tx/${event.txHash}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="text-[9px] text-indigo-400/50 hover:text-indigo-400 font-mono transition-colors shrink-0">
                                                        TX
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                                            style={{ color: sevColor, background: `${sevColor}15` }}>
                                            {event.severity}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Bottom-Right: Protocol Health ───────── */}
                <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white">Protocol Health</h3>
                        <span className="text-[9px] font-mono text-emerald-400 px-2 py-1 rounded border tracking-widest"
                            style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }}>
                            ON-CHAIN
                        </span>
                    </div>

                    <div className="space-y-5">
                        {/* ZK Proof Gauge */}
                        {proofStats && (
                            <ProofGauge
                                matchRate={proofStats.matchRate}
                                totalVerified={proofStats.totalVerified}
                                totalCommitments={proofStats.totalCommitments}
                                totalSlashed={proofStats.totalSlashed}
                            />
                        )}

                        {/* Escrow Flow Bar */}
                        <div>
                            <p className="text-[10px] font-bold text-white mb-2">Escrow Distribution</p>
                            <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div className="transition-all duration-700 rounded-l-full"
                                    style={{ width: `${releasedPct}%`, background: '#10b981' }}
                                    title={`Released: ${releasedPct.toFixed(1)}%`} />
                                <div className="transition-all duration-700"
                                    style={{ width: `${lockedPct}%`, background: 'rgba(245,158,11,0.4)' }}
                                    title={`Locked: ${lockedPct.toFixed(1)}%`} />
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[9px] text-slate-500">Released {formatUSD(stats?.totalReleased ?? 0)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                                    <span className="text-[9px] text-slate-500">Locked {formatUSD((stats?.totalBudgetLocked ?? 0) - (stats?.totalReleased ?? 0))}</span>
                                </div>
                            </div>
                        </div>

                        {/* Network Stats */}
                        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                            {[
                                { label: 'Intel Submissions', value: stats?.intelCount ?? 0, color: '#8b5cf6' },
                                { label: 'Audit Events', value: stats?.auditCount ?? 0, color: '#3b82f6' },
                                { label: 'Completed Swarms', value: (stats?.totalSwarms ?? 0) - (stats?.activeSwarms ?? 0), color: '#10b981' },
                            ].map((row) => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: row.color }} />
                                        <span className="text-[10px] text-slate-500">{row.label}</span>
                                    </div>
                                    <span className="text-[11px] font-bold font-mono tabular-nums text-white">{row.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        {/* Infrastructure Status */}
                        <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">Infrastructure</p>
                            {[
                                { label: 'TIP-403 Compliance', status: 'Active', ok: true },
                                { label: 'Gas Sponsorship', status: 'Enabled', ok: true },
                                { label: 'Parallel Nonces', status: '3 Lanes', ok: true },
                                { label: 'MPP Protocol', status: 'Ready', ok: true },
                                { label: 'Passkey Auth', status: 'Available', ok: true },
                                { label: 'Network', status: 'Moderato (42431)', ok: true },
                            ].map((row) => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${row.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                        <span className="text-[10px] text-slate-500">{row.label}</span>
                                    </div>
                                    <span className={`text-[11px] font-bold font-mono ${row.ok ? 'text-emerald-400/70' : 'text-red-400/70'}`}>{row.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(ProtocolDashboard);
