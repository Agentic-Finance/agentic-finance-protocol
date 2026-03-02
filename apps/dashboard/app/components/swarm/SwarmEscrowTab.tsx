'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface SwarmStreamData {
    id: string;
    role: string;
    allocatedBudget: number;
    releasedAmount: number;
    status: string;
    streamJob: {
        agentWallet: string;
        agentName: string | null;
        totalBudget: number;
        releasedAmount: number;
        status: string;
    };
}

interface SwarmEscrowData {
    id: string;
    name: string;
    clientWallet: string;
    totalBudget: number;
    totalReleased: number;
    totalLocked: number;
    escrowStatus: string;
    escrowTxHash: string | null;
    onChainJobId: number | null;
    agentCount: number;
    status: string;
    streams: SwarmStreamData[];
}

const escrowStatusConfig: Record<string, { color: string; label: string; icon: string; description: string }> = {
    NONE: { color: '#64748b', label: 'Not Locked', icon: '⬜', description: 'No escrow created yet' },
    LOCKED: { color: '#f59e0b', label: 'Locked', icon: '🔐', description: 'Funds secured in NexusV2' },
    DISTRIBUTING: { color: '#3b82f6', label: 'Distributing', icon: '🔄', description: 'Releasing to agents' },
    SETTLED: { color: '#10b981', label: 'Settled', icon: '✅', description: 'All funds distributed' },
};

export default function SwarmEscrowTab() {
    const [swarms, setSwarms] = useState<SwarmEscrowData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSwarms = useCallback(async () => {
        try {
            const res = await fetch('/api/swarm/stream');
            const data = await res.json();
            if (data.success) setSwarms(data.swarms);
        } catch (err) {
            console.error('Fetch swarm escrow error:', err);
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
                    <div key={i} className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
                ))}
            </div>
        );
    }

    if (swarms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-6xl mb-4">🔐</span>
                <h3 className="text-xl font-bold text-white mb-2">No Escrow Sessions</h3>
                <p className="text-sm text-slate-400 max-w-md">
                    Swarm escrow locks funds in NexusV2 smart contract and distributes to agents as milestones complete.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Escrow Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    {
                        label: 'Total Locked',
                        value: `$${swarms.reduce((s, sw) => s + sw.totalLocked, 0).toLocaleString()}`,
                        icon: '🔐',
                        color: '#f59e0b',
                    },
                    {
                        label: 'Total Released',
                        value: `$${swarms.reduce((s, sw) => s + sw.totalReleased, 0).toLocaleString()}`,
                        icon: '💰',
                        color: '#10b981',
                    },
                    {
                        label: 'Active Escrows',
                        value: swarms.filter(s => s.escrowStatus === 'LOCKED' || s.escrowStatus === 'DISTRIBUTING').length,
                        icon: '🔄',
                        color: '#3b82f6',
                    },
                    {
                        label: 'Settled',
                        value: swarms.filter(s => s.escrowStatus === 'SETTLED').length,
                        icon: '✅',
                        color: '#8b5cf6',
                    },
                ].map((s, i) => (
                    <div key={i} className="rounded-2xl border border-white/[0.06] p-4"
                        style={{ background: `linear-gradient(135deg, ${s.color}08 0%, transparent 60%)` }}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <span>{s.icon}</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</span>
                        </div>
                        <div className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Escrow Cards */}
            {swarms.map((swarm) => {
                const eStatus = escrowStatusConfig[swarm.escrowStatus] || escrowStatusConfig.NONE;
                const distributionPercent = swarm.totalLocked > 0
                    ? (swarm.totalReleased / swarm.totalLocked) * 100
                    : 0;

                return (
                    <div key={swarm.id} className="rounded-2xl border border-white/[0.06] overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${eStatus.color}05 0%, transparent 60%)` }}>

                        {/* Header */}
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{eStatus.icon}</span>
                                        <h3 className="text-base font-bold text-white">{swarm.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                                            style={{ background: `${eStatus.color}15`, color: eStatus.color }}>
                                            {eStatus.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500">{eStatus.description}</span>
                                    </div>
                                </div>
                                {swarm.onChainJobId !== null && (
                                    <div className="text-right">
                                        <div className="text-[9px] text-slate-500">On-Chain Job</div>
                                        <div className="text-xs font-bold text-blue-400">#{swarm.onChainJobId}</div>
                                    </div>
                                )}
                            </div>

                            {/* Fund Flow Visualization */}
                            <div className="relative rounded-xl border border-white/[0.06] p-4 mb-4"
                                style={{ background: 'rgba(0,0,0,0.2)' }}>

                                <div className="flex items-center justify-between">
                                    {/* Client */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
                                            👤
                                        </div>
                                        <span className="text-[9px] text-slate-500">Client</span>
                                        <span className="text-[10px] font-bold text-white">
                                            ${swarm.totalBudget.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Arrow: Client → Escrow */}
                                    <div className="flex-1 mx-3 relative">
                                        <div className="h-px bg-gradient-to-r from-amber-500/40 to-blue-500/40" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-slate-500">→</div>
                                        {swarm.escrowTxHash && (
                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                                                <a href={`https://explore.tempo.xyz/tx/${swarm.escrowTxHash}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="text-[8px] text-blue-400 hover:underline font-mono whitespace-nowrap">
                                                    TX: {swarm.escrowTxHash.slice(0, 8)}...
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* NexusV2 Escrow */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-14 h-14 rounded-xl border flex items-center justify-center text-xl"
                                            style={{
                                                background: `${eStatus.color}10`,
                                                borderColor: `${eStatus.color}30`,
                                                boxShadow: `0 0 20px ${eStatus.color}10`,
                                            }}>
                                            🔐
                                        </div>
                                        <span className="text-[9px] font-bold" style={{ color: eStatus.color }}>NexusV2</span>
                                        <span className="text-[10px] font-bold text-white">
                                            ${swarm.totalLocked.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Arrow: Escrow → Agents */}
                                    <div className="flex-1 mx-3 relative">
                                        <div className="h-px bg-gradient-to-r from-blue-500/40 to-green-500/40" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-slate-500">→</div>
                                    </div>

                                    {/* Agent Wallets */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex -space-x-2">
                                            {swarm.streams.slice(0, 4).map((ss, i) => (
                                                <div key={ss.id}
                                                    className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-sm"
                                                    style={{ zIndex: 4 - i }}>
                                                    🤖
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[9px] text-slate-500">{swarm.agentCount} Agents</span>
                                        <span className="text-[10px] font-bold text-green-400">
                                            ${swarm.totalReleased.toLocaleString()} paid
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Distribution Progress */}
                            <div className="mb-3">
                                <div className="flex justify-between mb-1">
                                    <span className="text-[10px] text-slate-500">Distribution Progress</span>
                                    <span className="text-[10px] font-bold text-white">{distributionPercent.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${Math.min(distributionPercent, 100)}%`,
                                            background: `linear-gradient(90deg, ${eStatus.color}, #10b981)`,
                                        }} />
                                </div>
                            </div>

                            {/* Per-Agent Distribution */}
                            <div className="space-y-2">
                                {swarm.streams.map((ss, i) => {
                                    const agentPercent = ss.allocatedBudget > 0
                                        ? (ss.releasedAmount / ss.allocatedBudget) * 100 : 0;
                                    return (
                                        <div key={ss.id} className="flex items-center gap-3">
                                            <span className="text-sm">🤖</span>
                                            <span className="text-[10px] font-bold text-slate-300 w-24 truncate">
                                                {ss.streamJob.agentName || ss.streamJob.agentWallet.slice(0, 10)}
                                            </span>
                                            <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                                                <div className="h-full rounded-full bg-green-500 transition-all duration-500"
                                                    style={{ width: `${Math.min(agentPercent, 100)}%` }} />
                                            </div>
                                            <span className="text-[10px] font-bold tabular-nums text-white w-20 text-right">
                                                ${ss.releasedAmount.toLocaleString()} / ${ss.allocatedBudget.toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
