'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';

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

const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
    INFO: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'INFO' },
    SUCCESS: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'SUCCESS' },
    WARNING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'WARNING' },
    ERROR: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'ERROR' },
};

const eventTypeIcons: Record<string, string> = {
    SWARM_CREATED: '\u{1F41D}',
    SWARM_COMPLETED: '\u{1F389}',
    AGENT_JOINED: '\u{1F916}',
    MILESTONE_SUBMITTED: '\u{1F4E4}',
    MILESTONE_APPROVED: '\u2705',
    MILESTONE_REJECTED: '\u274C',
    A2A_TRANSFER: '\u26A1',
    A2A_BATCH: '\u{1F4E6}',
    INTEL_SUBMITTED: '\u{1F6E1}\uFE0F',
    INTEL_VERIFIED: '\u{1F52C}',
    INTEL_PURCHASED: '\u{1F4B0}',
    ESCROW_LOCKED: '\u{1F510}',
    ESCROW_RELEASED: '\u{1F513}',
    ESCROW_SETTLED: '\u{1F48E}',
    STREAM_CREATED: '\u{1F504}',
    STREAM_COMPLETED: '\u{1F3C1}',
    BUDGET_ALLOCATED: '\u{1F4B0}',
    SYSTEM_EVENT: '\u2699\uFE0F',
};

const EXPLORER = 'https://explore.tempo.xyz/tx/';

export default function AuditTimelineTab() {
    const [events, setEvents] = useState<AuditEventData[]>([]);
    const [total, setTotal] = useState(0);
    const [severityCounts, setSeverityCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [page, setPage] = useState(0);
    const pageSize = 50;

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

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="space-y-0.5 animate-pulse">
                {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="h-9 rounded-lg bg-white/[0.02]" />
                ))}
            </div>
        );
    }

    // Collect unique event types from current data
    const eventTypes = [...new Set(events.map(e => e.eventType))];

    return (
        <div className="space-y-4">
            {/* ── Severity Summary ─────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(severityConfig).map(([sev, cfg]) => {
                    const count = severityCounts[sev] || 0;
                    const isActive = filterSeverity === sev;
                    return (
                        <button
                            key={sev}
                            onClick={() => setFilterSeverity(isActive ? 'all' : sev)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                isActive ? 'ring-1' : 'opacity-60 hover:opacity-100'
                            }`}
                            style={{
                                background: cfg.bg,
                                color: cfg.color,
                                ...(isActive ? { ringColor: cfg.color } : {}),
                            }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                            {sev} ({count})
                        </button>
                    );
                })}
                <span className="text-[10px] text-slate-600 ml-auto">{total} events total</span>
            </div>

            {/* ── Event Type Filter (scrollable) ──── */}
            {eventTypes.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
                    <span className="text-[9px] text-slate-600 uppercase tracking-wider mr-1 shrink-0">Type:</span>
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all shrink-0 ${
                            filterType === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
                        }`}
                    >
                        All
                    </button>
                    {eventTypes.map(et => (
                        <button
                            key={et}
                            onClick={() => setFilterType(filterType === et ? 'all' : et)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition-all whitespace-nowrap shrink-0 ${
                                filterType === et ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            <span className="text-xs">{eventTypeIcons[et] || '\u{1F4CB}'}</span>
                            {et.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Events Table ─────────────────────── */}
            {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-5xl mb-3">{'\u{1F4CA}'}</span>
                    <h3 className="text-lg font-bold text-white mb-1">No Audit Events</h3>
                    <p className="text-xs text-slate-500">Events will appear here as swarm agents take actions.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    {/* Table header */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider w-12 shrink-0">Time</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider flex-1">Event</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider w-24 shrink-0 text-right hidden sm:block">Agent</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider w-16 shrink-0 text-right hidden sm:block">Status</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider w-8 shrink-0 text-right">TX</span>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-white/[0.03]">
                        {events.map((event, i) => {
                            const sev = severityConfig[event.severity] || severityConfig.INFO;
                            const icon = eventTypeIcons[event.eventType] || '\u{1F4CB}';
                            const time = new Date(event.createdAt);
                            const showDate = i === 0 || new Date(events[i - 1].createdAt).toDateString() !== time.toDateString();

                            return (
                                <React.Fragment key={event.id}>
                                    {/* Date separator */}
                                    {showDate && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.015]">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                                {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            <div className="flex-1 h-px bg-white/[0.04]" />
                                        </div>
                                    )}

                                    {/* Event row */}
                                    <div className="group cursor-default">
                                        <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] transition-colors">
                                            {/* Time */}
                                            <span className="text-[10px] text-slate-600 w-12 shrink-0 tabular-nums font-mono">
                                                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </span>

                                            {/* Severity dot */}
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sev.color }} />

                                            {/* Icon + Title */}
                                            <span className="text-xs shrink-0">{icon}</span>
                                            <span className="text-[11px] font-semibold text-white truncate flex-1 min-w-0">
                                                {event.title}
                                            </span>

                                            {/* Agent (desktop) */}
                                            {event.agentName && (
                                                <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold shrink-0 max-w-24 truncate">
                                                    {event.agentName}
                                                </span>
                                            )}

                                            {/* Severity badge (desktop) */}
                                            <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 w-16 text-right"
                                                style={{ background: sev.bg, color: sev.color }}>
                                                {sev.label}
                                            </span>

                                            {/* TX link */}
                                            <div className="w-8 shrink-0 flex justify-end">
                                                {event.txHash ? (
                                                    <a
                                                        href={`${EXPLORER}${event.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400/60 hover:text-blue-400 transition-colors"
                                                        title={event.txHash}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-700">—</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Description on hover */}
                                        {event.description && (
                                            <div className="hidden group-hover:block px-3 pb-1.5 -mt-0.5">
                                                <p className="text-[10px] text-slate-500 pl-[calc(48px+6px+4px+16px+4px)] line-clamp-1">
                                                    {event.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Pagination ───────────────────────── */}
            {total > pageSize && (
                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.04] text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                        {'\u2190'} Prev
                    </button>
                    <span className="text-[10px] text-slate-500 tabular-nums">
                        {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
                    </span>
                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={(page + 1) * pageSize >= total}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.04] text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                        Next {'\u2192'}
                    </button>
                </div>
            )}
        </div>
    );
}
