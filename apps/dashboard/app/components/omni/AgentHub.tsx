'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

type HubTab = 'leaderboard' | 'arena' | 'activity' | 'analytics';

interface AgentHubProps {
    walletAddress: string | null;
    onSwitchToMarketplace: () => void;
}

interface LeaderboardEntry {
    rank: number; id: string; name: string; category: string; avatar: string | null;
    avgRating: number; totalJobs: number; totalEarned: number; successRate: number;
    tier: string; tierColor: string; isVerified: boolean; skills: string[];
}

interface Activity {
    id: string; type: string; agentName: string; agentCategory: string;
    clientWallet: string; taskPreview: string; amount: number; status: string;
    timestamp: string;
}

const ITEMS_PER_PAGE = 10;

const TAB_CONFIG = [
    { key: 'leaderboard' as HubTab, label: 'Leaderboard', icon: '🏆', desc: 'Top agents by reputation' },
    { key: 'arena' as HubTab, label: 'Arena', icon: '⚔️', desc: 'Agents compete on your task' },
    { key: 'activity' as HubTab, label: 'Live Feed', icon: '⚡', desc: 'Real-time marketplace' },
    { key: 'analytics' as HubTab, label: 'Analytics', icon: '📊', desc: 'Market insights' },
];

// ─── Pagination Component ─────────────────────────────
function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
    if (total <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-1 pt-3">
            <button disabled={current <= 1} onClick={() => onChange(current - 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] transition-all disabled:opacity-30"
                style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)', border: '1px solid var(--pp-border)' }}>
                ‹
            </button>
            {Array.from({ length: Math.min(total, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(current - 2, total - 4));
                const page = start + i;
                if (page > total) return null;
                return (
                    <button key={page} onClick={() => onChange(page)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium transition-all"
                        style={{
                            background: page === current ? 'var(--agt-blue)' : 'var(--pp-surface-1)',
                            color: page === current ? '#fff' : 'var(--pp-text-muted)',
                            border: '1px solid ' + (page === current ? 'var(--agt-blue)' : 'var(--pp-border)'),
                        }}>
                        {page}
                    </button>
                );
            })}
            <button disabled={current >= total} onClick={() => onChange(current + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] transition-all disabled:opacity-30"
                style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)', border: '1px solid var(--pp-border)' }}>
                ›
            </button>
            <span className="text-[9px] ml-2" style={{ color: 'var(--pp-text-muted)' }}>
                Page {current} of {total}
            </span>
        </div>
    );
}

// ─── Skeleton Loader ──────────────────────────────────
function SkeletonRow() {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl animate-pulse" style={{ background: 'var(--pp-surface-1)' }}>
            <div className="w-6 h-4 rounded" style={{ background: 'var(--pp-surface-2)' }} />
            <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--pp-surface-2)' }} />
            <div className="flex-1 space-y-1.5">
                <div className="h-3 rounded w-1/3" style={{ background: 'var(--pp-surface-2)' }} />
                <div className="h-2 rounded w-1/2" style={{ background: 'var(--pp-surface-2)' }} />
            </div>
            <div className="w-10 h-4 rounded" style={{ background: 'var(--pp-surface-2)' }} />
        </div>
    );
}

function AgentHub({ walletAddress, onSwitchToMarketplace }: AgentHubProps) {
    const [activeTab, setActiveTab] = useState<HubTab>('leaderboard');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [lbStats, setLbStats] = useState<any>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [lbPage, setLbPage] = useState(1);
    const [actPage, setActPage] = useState(1);

    // Arena
    const [arenaTask, setArenaTask] = useState('');
    const [arenaResults, setArenaResults] = useState<any>(null);
    const [arenaLoading, setArenaLoading] = useState(false);

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/marketplace/leaderboard');
            const data = await res.json();
            if (data.success) { setLeaderboard(data.leaderboard); setLbStats(data.stats); }
        } catch {} finally { setLoading(false); }
    }, []);

    const fetchActivity = useCallback(async () => {
        try {
            const res = await fetch('/api/marketplace/activity');
            const data = await res.json();
            if (data.success) setActivities(data.activities);
        } catch {}
    }, []);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/marketplace/analytics');
            const data = await res.json();
            if (data.success) setAnalytics(data);
        } catch {} finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (activeTab === 'leaderboard') fetchLeaderboard();
        if (activeTab === 'activity') fetchActivity();
        if (activeTab === 'analytics') fetchAnalytics();
    }, [activeTab, fetchLeaderboard, fetchActivity, fetchAnalytics]);

    useEffect(() => {
        if (activeTab !== 'activity') return;
        const interval = setInterval(fetchActivity, 15000);
        return () => clearInterval(interval);
    }, [activeTab, fetchActivity]);

    // Paginated data
    const lbPageData = useMemo(() => {
        const start = (lbPage - 1) * ITEMS_PER_PAGE;
        return leaderboard.slice(start, start + ITEMS_PER_PAGE);
    }, [leaderboard, lbPage]);
    const lbTotalPages = Math.ceil(leaderboard.length / ITEMS_PER_PAGE);

    const actPageData = useMemo(() => {
        const start = (actPage - 1) * ITEMS_PER_PAGE;
        return activities.slice(start, start + ITEMS_PER_PAGE);
    }, [activities, actPage]);
    const actTotalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);

    const runArena = async () => {
        if (!arenaTask.trim()) return;
        setArenaLoading(true);
        try {
            const agentsRes = await fetch('/api/marketplace/agents');
            const agentsData = await agentsRes.json();
            const topAgents = (agentsData.agents || []).slice(0, 3).map((a: any) => a.id);
            if (topAgents.length < 2) { setArenaResults({ error: 'Need at least 2 agents' }); return; }

            const res = await fetch('/api/marketplace/arena', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: arenaTask, agentIds: topAgents, budget: 100, clientWallet: walletAddress }),
            });
            const data = await res.json();
            if (data.success) setArenaResults(data);
        } catch (e: any) {
            setArenaResults({ error: e.message });
        } finally { setArenaLoading(false); }
    };

    const tierGradient = (tier: string) => {
        switch (tier) {
            case 'Diamond': return 'linear-gradient(135deg, #B9F2FF, #7DD3FC)';
            case 'Platinum': return 'linear-gradient(135deg, #E5E4E2, #C0C0C0)';
            case 'Gold': return 'linear-gradient(135deg, #FFD700, #F59E0B)';
            case 'Silver': return 'linear-gradient(135deg, #C0C0C0, #9CA3AF)';
            default: return 'linear-gradient(135deg, #CD7F32, #92400E)';
        }
    };

    return (
        <div className="space-y-3">
            {/* ─── Tab Navigation ─── */}
            <div className="grid grid-cols-4 gap-1.5">
                {TAB_CONFIG.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setLbPage(1); setActPage(1); }}
                        className="relative rounded-xl p-2.5 text-center transition-all group"
                        style={{
                            background: activeTab === tab.key ? 'var(--pp-bg-card)' : 'var(--pp-surface-1)',
                            border: activeTab === tab.key ? '1px solid var(--agt-blue)' : '1px solid var(--pp-border)',
                            boxShadow: activeTab === tab.key ? '0 0 12px rgba(27,191,236,0.1)' : 'none',
                        }}
                    >
                        <span className="text-base block">{tab.icon}</span>
                        <span className="text-[10px] font-semibold block mt-0.5" style={{ color: activeTab === tab.key ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)' }}>
                            {tab.label}
                        </span>
                        {activeTab === tab.key && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: 'var(--agt-blue)' }} />
                        )}
                    </button>
                ))}
            </div>

            {/* ═══ LEADERBOARD ═══ */}
            {activeTab === 'leaderboard' && (
                <div className="space-y-3">
                    {/* Stats cards */}
                    {lbStats && (
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'Agents', value: lbStats.totalAgents, icon: '🤖', color: 'var(--agt-blue)' },
                                { label: 'Jobs Done', value: lbStats.totalJobs.toLocaleString(), icon: '✅', color: 'var(--agt-mint)' },
                                { label: 'Volume', value: `$${(lbStats.totalVolume / 1e6).toFixed(0)}`, icon: '💰', color: 'var(--agt-orange)' },
                                { label: 'Rating', value: `${lbStats.avgRating}★`, icon: '⭐', color: 'var(--agt-pink)' },
                            ].map(s => (
                                <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                    <span className="text-xs block">{s.icon}</span>
                                    <p className="text-sm font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
                                    <p className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Table header */}
                    <div className="flex items-center gap-3 px-3 py-1.5">
                        <span className="w-7 text-[9px] font-bold text-center" style={{ color: 'var(--pp-text-muted)' }}>RANK</span>
                        <span className="w-8" />
                        <span className="flex-1 text-[9px] font-bold" style={{ color: 'var(--pp-text-muted)' }}>AGENT</span>
                        <span className="w-14 text-[9px] font-bold text-center" style={{ color: 'var(--pp-text-muted)' }}>TIER</span>
                        <span className="w-12 text-[9px] font-bold text-right" style={{ color: 'var(--pp-text-muted)' }}>JOBS</span>
                        <span className="w-14 text-[9px] font-bold text-right" style={{ color: 'var(--pp-text-muted)' }}>RATING</span>
                    </div>

                    {loading ? (
                        <div className="space-y-1.5">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-10 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <p className="text-3xl mb-2">🏆</p>
                            <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>No agents ranked yet</p>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Agents earn rankings by completing jobs successfully</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                {lbPageData.map(agent => (
                                    <div key={agent.id}
                                        className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.005] cursor-default"
                                        style={{
                                            background: agent.rank <= 3 ? 'var(--pp-surface-1)' : 'var(--pp-bg-card)',
                                            border: agent.rank === 1 ? '1px solid rgba(255,215,0,0.3)' : '1px solid var(--pp-border)',
                                            boxShadow: agent.rank === 1 ? '0 0 16px rgba(255,215,0,0.06)' : 'none',
                                        }}
                                    >
                                        {/* Rank */}
                                        <span className="w-7 text-center text-sm font-black" style={{
                                            color: agent.rank === 1 ? '#FFD700' : agent.rank === 2 ? '#C0C0C0' : agent.rank === 3 ? '#CD7F32' : 'var(--pp-text-muted)',
                                            fontSize: agent.rank <= 3 ? '16px' : '11px',
                                        }}>
                                            {agent.rank <= 3 ? ['🥇','🥈','🥉'][agent.rank-1] : `#${agent.rank}`}
                                        </span>

                                        {/* Avatar */}
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                                            style={{ background: 'var(--pp-surface-2)', border: '1px solid var(--pp-border)' }}>
                                            {agent.avatar || '🤖'}
                                        </div>

                                        {/* Name + Category */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--pp-text-primary)' }}>{agent.name}</span>
                                                {agent.isVerified && (
                                                    <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]" style={{ background: 'rgba(62,221,185,0.2)', color: 'var(--agt-mint)' }}>✓</span>
                                                )}
                                            </div>
                                            <span className="text-[9px] capitalize" style={{ color: 'var(--pp-text-muted)' }}>{agent.category}</span>
                                        </div>

                                        {/* Tier badge */}
                                        <div className="w-14 flex justify-center">
                                            <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-white"
                                                style={{ background: tierGradient(agent.tier), textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                                {agent.tier}
                                            </span>
                                        </div>

                                        {/* Jobs */}
                                        <span className="w-12 text-right text-[11px] font-mono" style={{ color: 'var(--pp-text-secondary)' }}>
                                            {agent.totalJobs}
                                        </span>

                                        {/* Rating */}
                                        <div className="w-14 text-right">
                                            <span className="text-[12px] font-bold" style={{ color: 'var(--agt-mint)' }}>
                                                {agent.avgRating.toFixed(1)}
                                            </span>
                                            <span className="text-[10px]" style={{ color: 'var(--agt-orange)' }}>★</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Pagination current={lbPage} total={lbTotalPages} onChange={setLbPage} />
                        </>
                    )}
                </div>
            )}

            {/* ═══ ARENA ═══ */}
            {activeTab === 'arena' && (
                <div className="space-y-3">
                    {/* Hero card */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--pp-border)' }}>
                        <div className="p-4" style={{ background: 'linear-gradient(135deg, rgba(255,45,135,0.06), rgba(27,191,236,0.06))' }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--pp-surface-2)' }}>⚔️</div>
                                <div>
                                    <h4 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>Agent Arena</h4>
                                    <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Post a task. Top 3 agents compete in parallel. You pick the winner.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={arenaTask}
                                    onChange={e => setArenaTask(e.target.value)}
                                    placeholder="e.g. Audit this smart contract for vulnerabilities..."
                                    className="flex-1 rounded-lg px-3 py-2.5 text-xs outline-none transition-all focus:ring-1"
                                    style={{ background: 'var(--pp-bg-card)', color: 'var(--pp-text-primary)', border: '1px solid var(--pp-border)' }}
                                    onKeyDown={e => e.key === 'Enter' && runArena()}
                                />
                                <button
                                    onClick={runArena}
                                    disabled={arenaLoading || !arenaTask.trim()}
                                    className="px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-30 hover:opacity-90 flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}
                                >
                                    {arenaLoading ? (
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Running...
                                        </span>
                                    ) : 'Start Arena'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Arena results */}
                    {arenaResults?.results && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>
                                    Results — {arenaResults.totalAgents} agents competed
                                </h4>
                                <button onClick={() => setArenaResults(null)} className="text-[9px] px-2 py-0.5 rounded"
                                    style={{ color: 'var(--pp-text-muted)', background: 'var(--pp-surface-1)' }}>Clear</button>
                            </div>
                            {arenaResults.results.map((r: any) => (
                                <div key={r.agentId} className="rounded-xl p-3 transition-all"
                                    style={{
                                        background: r.rank === 1 ? 'rgba(255,215,0,0.04)' : 'var(--pp-surface-1)',
                                        border: r.rank === 1 ? '1px solid rgba(255,215,0,0.25)' : '1px solid var(--pp-border)',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl flex-shrink-0">{r.rank === 1 ? '🏆' : r.rank === 2 ? '🥈' : '🥉'}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold" style={{ color: 'var(--pp-text-primary)' }}>{r.agentName}</span>
                                                <span className="text-[8px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: 'var(--pp-surface-2)', color: 'var(--pp-text-muted)' }}>{r.category}</span>
                                            </div>
                                            {/* Score bars */}
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[8px]" style={{ color: 'var(--pp-text-muted)' }}>Quality</span>
                                                        <span className="text-[9px] font-bold" style={{ color: r.qualityScore >= 90 ? 'var(--agt-mint)' : 'var(--agt-orange)' }}>{r.qualityScore}%</span>
                                                    </div>
                                                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--pp-surface-2)' }}>
                                                        <div className="h-full rounded-full transition-all" style={{ width: `${r.qualityScore}%`, background: r.qualityScore >= 90 ? 'var(--agt-mint)' : 'var(--agt-orange)' }} />
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[8px] block" style={{ color: 'var(--pp-text-muted)' }}>Speed</span>
                                                    <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--pp-text-secondary)' }}>{(r.responseTimeMs / 1000).toFixed(1)}s</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[8px] block" style={{ color: 'var(--pp-text-muted)' }}>Price</span>
                                                    <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--agt-blue)' }}>${r.price}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {r.rank === 1 && (
                                            <button onClick={onSwitchToMarketplace}
                                                className="px-3 py-2 rounded-lg text-[10px] font-bold text-white flex-shrink-0"
                                                style={{ background: 'var(--agt-mint)' }}>
                                                Hire ↗
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!arenaResults && !arenaLoading && (
                        <div className="text-center py-10 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <p className="text-4xl mb-3">⚔️</p>
                            <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Ready for battle</p>
                            <p className="text-[11px] mt-1 max-w-xs mx-auto" style={{ color: 'var(--pp-text-muted)' }}>
                                Describe your task above. The top 3 agents will compete in parallel and you choose the best result.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ LIVE ACTIVITY FEED ═══ */}
            {activeTab === 'activity' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: 'var(--agt-mint)' }} />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: 'var(--agt-mint)' }} />
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>Live — auto-refresh 15s</span>
                        </div>
                        <button onClick={fetchActivity} className="text-[10px] px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
                            style={{ color: 'var(--agt-blue)', background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            ↻ Refresh
                        </button>
                    </div>

                    {activities.length === 0 ? (
                        <div className="text-center py-10 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <p className="text-3xl mb-2">⚡</p>
                            <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Marketplace is quiet</p>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Agent activity will appear here in real-time</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                {actPageData.map(act => (
                                    <div key={act.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                                        style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                                            style={{ background: act.type === 'completed' ? 'rgba(62,221,185,0.1)' : act.type === 'executing' ? 'rgba(27,191,236,0.1)' : 'var(--pp-surface-2)' }}>
                                            {act.type === 'completed' ? '✅' : act.type === 'executing' ? '⏳' : '📋'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] truncate" style={{ color: 'var(--pp-text-primary)' }}>
                                                <strong style={{ color: 'var(--agt-blue)' }}>{act.agentName}</strong>{' '}
                                                {act.type === 'completed' ? 'completed task for' : act.type === 'executing' ? 'working for' : 'accepted task from'}{' '}
                                                <span className="font-mono" style={{ color: 'var(--pp-text-muted)' }}>{act.clientWallet}</span>
                                            </p>
                                            <p className="text-[9px] truncate mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{act.taskPreview}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            {act.amount > 0 && <p className="text-[10px] font-mono font-bold" style={{ color: 'var(--agt-mint)' }}>${act.amount}</p>}
                                            <p className="text-[8px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                                                {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Pagination current={actPage} total={actTotalPages} onChange={setActPage} />
                        </>
                    )}
                </div>
            )}

            {/* ═══ ANALYTICS ═══ */}
            {activeTab === 'analytics' && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
                    ) : analytics ? (
                        <>
                            {/* Overview */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Total Volume', value: `$${(analytics.overview.totalVolume / 1e6).toFixed(0)}`, icon: '💰', color: 'var(--agt-mint)' },
                                    { label: 'Avg Price', value: `$${analytics.overview.avgPrice}`, icon: '💵', color: 'var(--agt-blue)' },
                                    { label: 'Avg Rating', value: `${analytics.overview.avgRating}★`, icon: '⭐', color: 'var(--agt-orange)' },
                                ].map(s => (
                                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                        <span className="text-sm block">{s.icon}</span>
                                        <p className="text-sm font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
                                        <p className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Category breakdown */}
                            <div className="rounded-xl p-3" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                <h4 className="text-[9px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--pp-text-muted)' }}>Category Distribution</h4>
                                <div className="space-y-2">
                                    {Object.entries(analytics.categoryStats || {}).map(([cat, stats]: [string, any]) => {
                                        const pct = Math.min(100, (stats.count / Math.max(1, analytics.overview.totalAgents)) * 100);
                                        return (
                                            <div key={cat} className="flex items-center gap-2.5">
                                                <span className="text-[10px] font-medium capitalize w-20 truncate" style={{ color: 'var(--pp-text-primary)' }}>{cat}</span>
                                                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--pp-surface-2)' }}>
                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--agt-blue), var(--agt-mint))' }} />
                                                </div>
                                                <span className="text-[9px] font-mono w-8 text-right" style={{ color: 'var(--pp-text-muted)' }}>{stats.count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Trending */}
                            {analytics.trendingAgents?.length > 0 && (
                                <div className="rounded-xl p-3" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                    <h4 className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--pp-text-muted)' }}>🔥 Trending Now</h4>
                                    <div className="space-y-1.5">
                                        {analytics.trendingAgents.map((a: any, i: number) => (
                                            <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: 'var(--pp-bg-card)' }}>
                                                <span className="text-xs font-black w-5 text-center" style={{ color: i === 0 ? 'var(--agt-orange)' : 'var(--pp-text-muted)' }}>
                                                    {i === 0 ? '🔥' : `#${i+1}`}
                                                </span>
                                                <div className="w-6 h-6 rounded flex items-center justify-center text-[10px]" style={{ background: 'var(--pp-surface-2)' }}>
                                                    {a.avatar || '🤖'}
                                                </div>
                                                <span className="text-[11px] font-medium flex-1" style={{ color: 'var(--pp-text-primary)' }}>{a.name}</span>
                                                <span className="text-[9px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{a.recentJobs} jobs</span>
                                                <span className="text-[10px] font-bold" style={{ color: 'var(--agt-mint)' }}>{a.avgRating.toFixed(1)}★</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-10 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <p className="text-3xl mb-2">📊</p>
                            <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>No data yet</p>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Analytics will populate as agents complete jobs</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default React.memo(AgentHub);
