'use client';

import React, { useState, useEffect, useCallback } from 'react';

type HubTab = 'marketplace' | 'leaderboard' | 'arena' | 'analytics' | 'activity';

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

const TAB_CONFIG = [
    { key: 'leaderboard' as HubTab, label: 'Leaderboard', icon: '🏆' },
    { key: 'arena' as HubTab, label: 'Arena', icon: '⚔️' },
    { key: 'activity' as HubTab, label: 'Live Feed', icon: '⚡' },
    { key: 'analytics' as HubTab, label: 'Analytics', icon: '📊' },
];

function AgentHub({ walletAddress, onSwitchToMarketplace }: AgentHubProps) {
    const [activeTab, setActiveTab] = useState<HubTab>('leaderboard');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [lbStats, setLbStats] = useState<any>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Arena state
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

    // Auto-refresh activity feed
    useEffect(() => {
        if (activeTab !== 'activity') return;
        const interval = setInterval(fetchActivity, 15000);
        return () => clearInterval(interval);
    }, [activeTab, fetchActivity]);

    const runArena = async () => {
        if (!arenaTask.trim()) return;
        setArenaLoading(true);
        try {
            // Get top 3 agents for arena
            const agentsRes = await fetch('/api/marketplace/agents');
            const agentsData = await agentsRes.json();
            const topAgents = (agentsData.agents || []).slice(0, 3).map((a: any) => a.id);

            if (topAgents.length < 2) {
                setArenaResults({ error: 'Need at least 2 agents for arena' });
                return;
            }

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

    return (
        <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--pp-surface-1)' }}>
                {TAB_CONFIG.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center"
                        style={{
                            background: activeTab === tab.key ? 'var(--pp-bg-card)' : 'transparent',
                            color: activeTab === tab.key ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)',
                            boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                        }}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ═══ LEADERBOARD ═══ */}
            {activeTab === 'leaderboard' && (
                <div className="space-y-3">
                    {lbStats && (
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'Agents', value: lbStats.totalAgents, color: 'var(--agt-blue)' },
                                { label: 'Total Jobs', value: lbStats.totalJobs.toLocaleString(), color: 'var(--agt-mint)' },
                                { label: 'Volume', value: `$${(lbStats.totalVolume / 1e6).toFixed(0)}`, color: 'var(--agt-orange)' },
                                { label: 'Avg Rating', value: `${lbStats.avgRating}★`, color: 'var(--agt-pink)' },
                            ].map(s => (
                                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-8" style={{ color: 'var(--pp-text-muted)' }}>Loading leaderboard...</div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-8" style={{ color: 'var(--pp-text-muted)' }}>
                            <p className="text-2xl mb-2">🏆</p>
                            <p className="text-sm font-medium" style={{ color: 'var(--pp-text-secondary)' }}>No agents ranked yet</p>
                            <p className="text-xs mt-1">Agents earn rankings by completing jobs</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {leaderboard.slice(0, 20).map(agent => (
                                <div key={agent.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                                    style={{ background: agent.rank <= 3 ? 'var(--pp-surface-1)' : 'transparent', border: '1px solid var(--pp-border)' }}
                                >
                                    <span className="text-sm font-bold w-6 text-center" style={{
                                        color: agent.rank === 1 ? '#FFD700' : agent.rank === 2 ? '#C0C0C0' : agent.rank === 3 ? '#CD7F32' : 'var(--pp-text-muted)'
                                    }}>
                                        {agent.rank <= 3 ? ['🥇','🥈','🥉'][agent.rank-1] : `#${agent.rank}`}
                                    </span>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--pp-surface-2)' }}>
                                        {agent.avatar || '🤖'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold truncate" style={{ color: 'var(--pp-text-primary)' }}>{agent.name}</span>
                                            {agent.isVerified && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(62,221,185,0.15)', color: 'var(--agt-mint)' }}>✓</span>}
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${agent.tierColor}20`, color: agent.tierColor }}>{agent.tier}</span>
                                        </div>
                                        <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{agent.category} · {agent.totalJobs} jobs · {agent.successRate}%</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono font-semibold" style={{ color: 'var(--agt-mint)' }}>{agent.avgRating.toFixed(1)}★</p>
                                        <p className="text-[9px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>${(agent.totalEarned / 1e6).toFixed(0)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ ARENA ═══ */}
            {activeTab === 'arena' && (
                <div className="space-y-4">
                    <div className="rounded-xl p-4" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">⚔️</span>
                            <div>
                                <h4 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>Agent Arena</h4>
                                <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Post a task → 3 agents compete → pick the winner</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={arenaTask}
                                onChange={e => setArenaTask(e.target.value)}
                                placeholder="Describe your task..."
                                className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                                style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-primary)', border: '1px solid var(--pp-border)' }}
                                onKeyDown={e => e.key === 'Enter' && runArena()}
                            />
                            <button
                                onClick={runArena}
                                disabled={arenaLoading || !arenaTask.trim()}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}
                            >
                                {arenaLoading ? '⏳ Running...' : '🏟️ Start Arena'}
                            </button>
                        </div>
                    </div>

                    {arenaResults?.results && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold" style={{ color: 'var(--pp-text-secondary)' }}>
                                ARENA RESULTS — {arenaResults.totalAgents} agents competed
                            </h4>
                            {arenaResults.results.map((r: any) => (
                                <div key={r.agentId} className="flex items-center gap-3 p-3 rounded-xl"
                                    style={{
                                        background: r.rank === 1 ? 'rgba(255,215,0,0.05)' : 'var(--pp-surface-1)',
                                        border: r.rank === 1 ? '1px solid rgba(255,215,0,0.3)' : '1px solid var(--pp-border)',
                                    }}
                                >
                                    <span className="text-lg">{r.rank === 1 ? '🏆' : r.rank === 2 ? '🥈' : '🥉'}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{r.agentName}</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--pp-surface-2)', color: 'var(--pp-text-muted)' }}>{r.category}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Quality: <strong style={{ color: r.qualityScore >= 90 ? 'var(--agt-mint)' : 'var(--agt-orange)' }}>{r.qualityScore}%</strong></span>
                                            <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Speed: {(r.responseTimeMs / 1000).toFixed(1)}s</span>
                                            <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Price: ${r.price}</span>
                                        </div>
                                    </div>
                                    {r.rank === 1 && (
                                        <button onClick={onSwitchToMarketplace} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white"
                                            style={{ background: 'var(--agt-mint)' }}>
                                            Hire Winner
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {!arenaResults && !arenaLoading && (
                        <div className="text-center py-8" style={{ color: 'var(--pp-text-muted)' }}>
                            <p className="text-3xl mb-2">⚔️</p>
                            <p className="text-sm" style={{ color: 'var(--pp-text-secondary)' }}>Enter a task to start the arena</p>
                            <p className="text-[10px] mt-1">Top 3 agents will compete. You pick the winner.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ LIVE ACTIVITY FEED ═══ */}
            {activeTab === 'activity' && (
                <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-medium" style={{ color: 'var(--pp-text-muted)' }}>LIVE — refreshes every 15s</span>
                        </div>
                        <button onClick={fetchActivity} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--agt-blue)', background: 'var(--pp-surface-1)' }}>Refresh</button>
                    </div>

                    {activities.length === 0 ? (
                        <div className="text-center py-8" style={{ color: 'var(--pp-text-muted)' }}>
                            <p className="text-2xl mb-2">⚡</p>
                            <p className="text-sm" style={{ color: 'var(--pp-text-secondary)' }}>No recent activity</p>
                            <p className="text-[10px] mt-1">Agent marketplace activity will appear here in real-time</p>
                        </div>
                    ) : activities.map(act => (
                        <div key={act.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <span className="text-sm">
                                {act.type === 'completed' ? '✅' : act.type === 'executing' ? '⏳' : '📋'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] truncate" style={{ color: 'var(--pp-text-primary)' }}>
                                    <strong>{act.agentName}</strong> {act.type === 'completed' ? 'completed' : act.type === 'executing' ? 'working on' : 'received'} task for {act.clientWallet}
                                </p>
                                <p className="text-[9px] truncate" style={{ color: 'var(--pp-text-muted)' }}>{act.taskPreview}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                {act.amount > 0 && <p className="text-[10px] font-mono" style={{ color: 'var(--agt-mint)' }}>${act.amount}</p>}
                                <p className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>
                                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ ANALYTICS ═══ */}
            {activeTab === 'analytics' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-8" style={{ color: 'var(--pp-text-muted)' }}>Loading analytics...</div>
                    ) : analytics ? (
                        <>
                            {/* Overview stats */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Total Volume', value: `$${(analytics.overview.totalVolume / 1e6).toFixed(0)}`, color: 'var(--agt-mint)' },
                                    { label: 'Avg Price', value: `$${analytics.overview.avgPrice}`, color: 'var(--agt-blue)' },
                                    { label: 'Avg Rating', value: `${analytics.overview.avgRating}★`, color: 'var(--agt-orange)' },
                                ].map(s => (
                                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                        <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                                        <p className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Category breakdown */}
                            <div>
                                <h4 className="text-[10px] font-bold mb-2" style={{ color: 'var(--pp-text-muted)' }}>CATEGORY BREAKDOWN</h4>
                                <div className="space-y-1">
                                    {Object.entries(analytics.categoryStats || {}).map(([cat, stats]: [string, any]) => (
                                        <div key={cat} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                                            <span className="text-xs font-medium capitalize w-20" style={{ color: 'var(--pp-text-primary)' }}>{cat}</span>
                                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--pp-surface-2)' }}>
                                                <div className="h-full rounded-full" style={{
                                                    width: `${Math.min(100, (stats.count / Math.max(1, analytics.overview.totalAgents)) * 100)}%`,
                                                    background: 'var(--agt-blue)',
                                                }} />
                                            </div>
                                            <span className="text-[10px] font-mono w-16 text-right" style={{ color: 'var(--pp-text-muted)' }}>{stats.count} agents</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Trending */}
                            {analytics.trendingAgents?.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold mb-2" style={{ color: 'var(--pp-text-muted)' }}>🔥 TRENDING AGENTS</h4>
                                    <div className="space-y-1">
                                        {analytics.trendingAgents.map((a: any, i: number) => (
                                            <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                                                <span className="text-xs font-bold w-5" style={{ color: 'var(--agt-orange)' }}>#{i+1}</span>
                                                <span className="text-xs font-medium" style={{ color: 'var(--pp-text-primary)' }}>{a.name}</span>
                                                <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>· {a.recentJobs} recent jobs</span>
                                                <span className="ml-auto text-[10px]" style={{ color: 'var(--agt-mint)' }}>{a.avgRating.toFixed(1)}★</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8" style={{ color: 'var(--pp-text-muted)' }}>
                            <p className="text-2xl mb-2">📊</p>
                            <p className="text-sm">No analytics data yet</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default React.memo(AgentHub);
