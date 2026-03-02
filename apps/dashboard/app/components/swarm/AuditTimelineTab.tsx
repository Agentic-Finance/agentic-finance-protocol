'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AuditEventData {
    id: string;
    swarmId: string | null;
    agentId: string | null;
    agentName: string | null;
    eventType: string;
    title: string;
    description: string | null;
    metadata: any;
    txHash: string | null;
    severity: string;
    createdAt: string;
}

const severityConfig: Record<string, { color: string; icon: string; bg: string }> = {
    INFO: { color: '#3b82f6', icon: 'ℹ️', bg: 'rgba(59,130,246,0.1)' },
    SUCCESS: { color: '#10b981', icon: '✅', bg: 'rgba(16,185,129,0.1)' },
    WARNING: { color: '#f59e0b', icon: '⚠️', bg: 'rgba(245,158,11,0.1)' },
    ERROR: { color: '#ef4444', icon: '❌', bg: 'rgba(239,68,68,0.1)' },
};

const eventTypeIcons: Record<string, string> = {
    SWARM_CREATED: '🐝',
    SWARM_COMPLETED: '🎉',
    AGENT_JOINED: '🤖',
    MILESTONE_SUBMITTED: '📤',
    MILESTONE_APPROVED: '✅',
    MILESTONE_REJECTED: '❌',
    A2A_TRANSFER: '⚡',
    INTEL_SUBMITTED: '🛡️',
    INTEL_VERIFIED: '🔬',
    INTEL_PURCHASED: '💰',
    ESCROW_LOCKED: '🔐',
    ESCROW_RELEASED: '🔓',
    ESCROW_SETTLED: '💎',
    STREAM_CREATED: '🔄',
    STREAM_COMPLETED: '🏁',
    BUDGET_ALLOCATED: '💰',
    SYSTEM_EVENT: '⚙️',
};

export default function AuditTimelineTab() {
    const [events, setEvents] = useState<AuditEventData[]>([]);
    const [total, setTotal] = useState(0);
    const [severityCounts, setSeverityCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [page, setPage] = useState(0);
    const pageSize = 30;

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                limit: String(pageSize),
                offset: String(page * pageSize),
            });
            if (filterType !== 'all') params.set('eventType', filterType);
            if (filterSeverity !== 'all') params.set('severity', filterSeverity);

            const res = await fetch(`/api/audit/timeline?${params}`);
            const data = await res.json();
            if (data.success) {
                setEvents(data.events);
                setTotal(data.total);
                setSeverityCounts(data.severityCounts);
            }
        } catch (err) {
            console.error('Fetch audit timeline error:', err);
        } finally {
            setLoading(false);
        }
    }, [filterType, filterSeverity, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
                ))}
            </div>
        );
    }

    const eventTypes = [...new Set(events.map(e => e.eventType))];

    return (
        <div className="space-y-6">
            {/* Severity Summary */}
            <div className="flex items-center gap-3 flex-wrap">
                {Object.entries(severityConfig).map(([sev, cfg]) => {
                    const count = severityCounts[sev] || 0;
                    const isActive = filterSeverity === sev;
                    return (
                        <button
                            key={sev}
                            onClick={() => setFilterSeverity(isActive ? 'all' : sev)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isActive ? 'ring-1' : 'opacity-70 hover:opacity-100'
                            }`}
                            style={{
                                background: cfg.bg,
                                color: cfg.color,
                                ...(isActive ? { ringColor: cfg.color } : {}),
                            }}
                        >
                            <span>{cfg.icon}</span>
                            {sev} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Event Type Filter */}
            {eventTypes.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            filterType === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
                        }`}
                    >
                        All
                    </button>
                    {eventTypes.map(et => (
                        <button
                            key={et}
                            onClick={() => setFilterType(filterType === et ? 'all' : et)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                filterType === et ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            <span>{eventTypeIcons[et] || '📋'}</span>
                            {et.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            )}

            {/* Timeline */}
            {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <span className="text-6xl mb-4">📊</span>
                    <h3 className="text-xl font-bold text-white mb-2">No Audit Events</h3>
                    <p className="text-sm text-slate-400">
                        Events will appear here as swarm agents take actions.
                    </p>
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-white/[0.06]" />

                    <div className="space-y-1">
                        {events.map((event, i) => {
                            const sev = severityConfig[event.severity] || severityConfig.INFO;
                            const icon = eventTypeIcons[event.eventType] || '📋';
                            const time = new Date(event.createdAt);
                            const showDate = i === 0 || new Date(events[i - 1].createdAt).toDateString() !== time.toDateString();

                            return (
                                <React.Fragment key={event.id}>
                                    {showDate && (
                                        <div className="flex items-center gap-3 py-2 pl-12">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="flex-1 h-px bg-white/[0.06]" />
                                        </div>
                                    )}
                                    <div className="flex items-start gap-3 py-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors group">
                                        {/* Node */}
                                        <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base"
                                            style={{ background: sev.bg, border: `1px solid ${sev.color}30` }}>
                                            {icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-white">{event.title}</span>
                                                {event.agentName && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                                                        {event.agentName}
                                                    </span>
                                                )}
                                            </div>
                                            {event.description && (
                                                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{event.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] text-slate-600">{time.toLocaleTimeString()}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                                    style={{ background: sev.bg, color: sev.color }}>
                                                    {event.severity}
                                                </span>
                                                {event.txHash && (
                                                    <a
                                                        href={`https://explore.tempo.xyz/tx/${event.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] text-blue-400 hover:underline font-mono"
                                                    >
                                                        TX: {event.txHash.slice(0, 8)}...
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {total > pageSize && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.04] text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                        ← Prev
                    </button>
                    <span className="text-[10px] text-slate-500">
                        {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
                    </span>
                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={(page + 1) * pageSize >= total}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.04] text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
