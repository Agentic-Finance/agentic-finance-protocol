'use client';

import React, { useMemo } from 'react';
import type { AgentGeoNode } from '../../lib/warroom-types';

interface Props {
    agents: AgentGeoNode[];
    selectedAgentId: string | null;
    onSelectAgent: (id: string | null) => void;
}

const STATUS_COLORS = {
    active: { bg: 'rgba(16,185,129,0.12)', dot: '#10b981', border: 'rgba(16,185,129,0.2)' },
    idle: { bg: 'rgba(245,158,11,0.08)', dot: '#f59e0b', border: 'rgba(245,158,11,0.15)' },
    offline: { bg: 'rgba(239,68,68,0.06)', dot: '#ef4444', border: 'rgba(239,68,68,0.12)' },
};

const ROLE_LABELS: Record<string, string> = {
    coordinator: 'COORD',
    worker: 'WORK',
    reviewer: 'REVW',
    sentinel: 'SENT',
    optimizer: 'OPT',
};

export default function AgentHeartbeatGrid({ agents, selectedAgentId, onSelectAgent }: Props) {
    const sortedAgents = useMemo(() => {
        return [...agents].sort((a, b) => {
            const statusOrder = { active: 0, idle: 1, offline: 2 };
            return statusOrder[a.status] - statusOrder[b.status];
        });
    }, [agents]);

    return (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs">💓</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agent Heartbeat</span>
                </div>
                <div className="flex items-center gap-3">
                    {(['active', 'idle', 'offline'] as const).map(s => {
                        const count = agents.filter(a => a.status === s).length;
                        return (
                            <div key={s} className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[s].dot }} />
                                <span className="text-[9px] text-slate-500 tabular-nums">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Grid */}
            <div className="p-2 grid grid-cols-4 gap-1.5 max-h-[400px] overflow-y-auto cyber-scroll-y">
                {sortedAgents.map((agent) => {
                    const isSelected = selectedAgentId === agent.id;
                    const sc = STATUS_COLORS[agent.status];

                    return (
                        <button
                            key={agent.id}
                            onClick={() => onSelectAgent(isSelected ? null : agent.id)}
                            className="relative p-2 rounded-lg transition-all text-left group"
                            style={{
                                background: isSelected ? sc.bg : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${isSelected ? sc.border : 'rgba(255,255,255,0.04)'}`,
                            }}
                        >
                            {/* Pulse dot */}
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="relative">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            background: sc.dot,
                                            boxShadow: agent.status === 'active' ? `0 0 6px ${sc.dot}` : 'none',
                                        }}
                                    />
                                    {agent.status === 'active' && (
                                        <div
                                            className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                                            style={{ background: sc.dot, opacity: 0.4 }}
                                        />
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-white/80 truncate">{agent.name}</span>
                            </div>

                            {/* Meta */}
                            <div className="flex items-center justify-between">
                                <span
                                    className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                                    style={{ background: 'rgba(255,255,255,0.04)', color: sc.dot }}
                                >
                                    {ROLE_LABELS[agent.role] || agent.role}
                                </span>
                                <span className="text-[8px] text-slate-600 tabular-nums">{agent.city}</span>
                            </div>

                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-lg text-[9px] text-white bg-black/80 backdrop-blur-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)} | ${Math.round(agent.totalVolume).toLocaleString()}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
