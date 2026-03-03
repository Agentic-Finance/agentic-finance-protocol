'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface MilestoneData {
    id: string;
    index: number;
    amount: number;
    deliverable: string;
    status: string;
}

interface StreamJobData {
    id: string;
    agentWallet: string;
    agentName: string | null;
    totalBudget: number;
    releasedAmount: number;
    status: string;
    milestones: MilestoneData[];
}

interface SwarmStreamData {
    id: string;
    role: string;
    allocatedBudget: number;
    releasedAmount: number;
    status: string;
    streamJob: StreamJobData;
}

interface SwarmData {
    id: string;
    name: string;
    clientWallet: string;
    totalBudget: number;
    totalReleased: number;
    agentCount: number;
    status: string;
    escrowStatus: string;
    totalLocked: number;
    deadline: string | null;
    createdAt: string;
    completedAt: string | null;
    streams: SwarmStreamData[];
    _count: { auditEvents: number; a2aTransfers: number };
}

const agentEmojis = ['🤖', '🦾', '🧠', '⚡', '🔮', '🎯', '🛡️', '🔬'];
const roleColors: Record<string, string> = {
    coordinator: '#f59e0b',
    worker: '#3b82f6',
    reviewer: '#10b981',
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export default function SwarmStreamsTab() {
    const [swarms, setSwarms] = useState<SwarmData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSwarm, setExpandedSwarm] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

    const fetchSwarms = useCallback(async () => {
        try {
            const res = await fetch('/api/swarm/stream');
            const data = await res.json();
            if (data.success) setSwarms(data.swarms);
        } catch (err) {
            console.error('Fetch swarms error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSwarms();
    }, [fetchSwarms]);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-40 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
                ))}
            </div>
        );
    }

    if (swarms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-6xl mb-4">🐝</span>
                <h3 className="text-xl font-bold text-white mb-2">No Swarms Yet</h3>
                <p className="text-sm text-slate-400 max-w-md">
                    Swarm sessions coordinate multiple AI agents working in parallel on complex tasks with shared budgets.
                </p>
            </div>
        );
    }

    const statusOptions: StatusFilter[] = ['ALL', 'ACTIVE', 'COMPLETED', 'FAILED'];

    const filteredSwarms = swarms.filter((swarm) => {
        const matchesSearch = searchQuery.trim() === '' ||
            swarm.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && swarm.status !== 'COMPLETED' && swarm.status !== 'CANCELLED' && swarm.status !== 'FAILED') ||
            (statusFilter === 'COMPLETED' && swarm.status === 'COMPLETED') ||
            (statusFilter === 'FAILED' && (swarm.status === 'CANCELLED' || swarm.status === 'FAILED'));
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
                <input
                    type="text"
                    placeholder="Search swarm sessions by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 px-4 py-2.5 outline-none focus:border-amber-500/40 transition-colors"
                />
                <div className="flex items-center gap-2">
                    {statusOptions.map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                statusFilter === status
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                            }`}
                        >
                            {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                    ))}
                    <span className="ml-auto text-[10px] text-slate-500">
                        {filteredSwarms.length} of {swarms.length} sessions
                    </span>
                </div>
            </div>

            {filteredSwarms.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="text-4xl mb-3">🔍</span>
                    <h3 className="text-lg font-bold text-white mb-1">No matching sessions</h3>
                    <p className="text-sm text-slate-400">Try adjusting your search or filter criteria.</p>
                </div>
            )}

            {filteredSwarms.map((swarm) => {
                const isExpanded = expandedSwarm === swarm.id;
                const progress = swarm.totalBudget > 0 ? (swarm.totalReleased / swarm.totalBudget) * 100 : 0;
                const statusColor = swarm.status === 'COMPLETED' ? '#10b981' : swarm.status === 'CANCELLED' ? '#ef4444' : '#f59e0b';

                return (
                    <div
                        key={swarm.id}
                        className="rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.12]"
                        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.03) 0%, transparent 60%)' }}
                    >
                        {/* Swarm Header */}
                        <div
                            className="p-5 cursor-pointer"
                            onClick={() => setExpandedSwarm(isExpanded ? null : swarm.id)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                        style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
                                        🐝
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">{swarm.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                                style={{ background: `${statusColor}15`, color: statusColor }}>
                                                {swarm.status}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {swarm.agentCount} agents
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {swarm._count.a2aTransfers} A2A transfers
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black tabular-nums text-white">
                                        ${swarm.totalBudget.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        ${swarm.totalReleased.toLocaleString()} released
                                    </div>
                                </div>
                            </div>

                            {/* Agent Avatars Row */}
                            <div className="flex items-center gap-2 mb-3">
                                {swarm.streams.map((ss, i) => (
                                    <div key={ss.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                        <span className="text-sm">{agentEmojis[i % agentEmojis.length]}</span>
                                        <span className="text-[10px] font-bold text-slate-300 truncate max-w-[100px]">
                                            {ss.streamJob.agentName || ss.streamJob.agentWallet.slice(0, 8)}
                                        </span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                            style={{ background: `${roleColors[ss.role] || '#3b82f6'}20`, color: roleColors[ss.role] || '#3b82f6' }}>
                                            {ss.role}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Combined Progress Bar */}
                            <div className="relative h-3 rounded-full overflow-hidden bg-white/[0.04]">
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                    style={{
                                        width: `${Math.min(progress, 100)}%`,
                                        background: `linear-gradient(90deg, #f59e0b, #10b981)`,
                                    }}
                                />
                                {/* Per-agent segments */}
                                {swarm.streams.map((ss, i) => {
                                    const segmentWidth = swarm.totalBudget > 0 ? (ss.allocatedBudget / swarm.totalBudget) * 100 : 0;
                                    const segmentOffset = swarm.streams.slice(0, i).reduce((sum, s) =>
                                        sum + (swarm.totalBudget > 0 ? (s.allocatedBudget / swarm.totalBudget) * 100 : 0), 0
                                    );
                                    return (
                                        <div
                                            key={ss.id}
                                            className="absolute top-0 bottom-0 border-r border-white/10"
                                            style={{ left: `${segmentOffset + segmentWidth}%`, width: '1px' }}
                                        />
                                    );
                                })}
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-slate-500">{progress.toFixed(1)}% complete</span>
                                <span className="text-[10px] text-slate-500 cursor-pointer">
                                    {isExpanded ? '▲ Collapse' : '▼ Expand'}
                                </span>
                            </div>
                        </div>

                        {/* Expanded Detail */}
                        {isExpanded && (
                            <div className="border-t border-white/[0.06] p-5 space-y-4"
                                style={{ background: 'rgba(0,0,0,0.2)' }}>
                                {swarm.streams.map((ss, i) => {
                                    const agentProgress = ss.allocatedBudget > 0 ? (ss.releasedAmount / ss.allocatedBudget) * 100 : 0;
                                    const statusCol = ss.status === 'COMPLETED' ? '#10b981' : '#3b82f6';

                                    return (
                                        <div key={ss.id} className="rounded-xl border border-white/[0.06] p-4"
                                            style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{agentEmojis[i % agentEmojis.length]}</span>
                                                    <div>
                                                        <span className="text-sm font-bold text-white">
                                                            {ss.streamJob.agentName || ss.streamJob.agentWallet.slice(0, 12)}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                                                style={{ background: `${roleColors[ss.role] || '#3b82f6'}20`, color: roleColors[ss.role] || '#3b82f6' }}>
                                                                {ss.role}
                                                            </span>
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                                                style={{ background: `${statusCol}15`, color: statusCol }}>
                                                                {ss.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-black tabular-nums">${ss.allocatedBudget.toLocaleString()}</div>
                                                    <div className="text-[10px] text-slate-500">${ss.releasedAmount.toLocaleString()} paid</div>
                                                </div>
                                            </div>

                                            {/* Agent Progress */}
                                            <div className="h-2 rounded-full bg-white/[0.04] mb-3 overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(agentProgress, 100)}%`,
                                                        background: statusCol,
                                                    }} />
                                            </div>

                                            {/* Milestones */}
                                            <div className="flex gap-2">
                                                {ss.streamJob.milestones.map((m) => {
                                                    const mColor = m.status === 'APPROVED' ? '#10b981' : m.status === 'SUBMITTED' ? '#f59e0b' : m.status === 'REJECTED' ? '#ef4444' : 'rgba(255,255,255,0.06)';
                                                    return (
                                                        <div key={m.id} className="flex-1">
                                                            <div className="h-1.5 rounded-full mb-1" style={{ background: mColor }} />
                                                            <div className="text-[9px] text-slate-500 truncate">{m.deliverable.replace(/^Phase \d+:\s*/, '')}</div>
                                                            <div className="text-[9px] font-bold tabular-nums" style={{ color: mColor }}>${m.amount}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
