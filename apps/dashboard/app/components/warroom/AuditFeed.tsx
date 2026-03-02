'use client';

import React from 'react';
import type { AuditEvent } from '../../lib/warroom-types';

interface Props {
    events: AuditEvent[];
}

const EVENT_ICONS: Record<string, string> = {
    SWARM_CREATED: '🐝', SWARM_COMPLETED: '🎉', AGENT_JOINED: '🤖',
    MILESTONE_SUBMITTED: '📤', MILESTONE_APPROVED: '✅', MILESTONE_REJECTED: '❌',
    A2A_TRANSFER: '⚡', INTEL_SUBMITTED: '🛡️', INTEL_VERIFIED: '🔬',
    INTEL_PURCHASED: '💰', ESCROW_LOCKED: '🔐', ESCROW_RELEASED: '🔓',
    ESCROW_SETTLED: '💎', STREAM_CREATED: '🔄', BUDGET_ALLOCATED: '💵',
    SYSTEM_EVENT: '⚙️',
};

const SEVERITY_COLORS: Record<string, string> = {
    INFO: '#3b82f6', SUCCESS: '#10b981', WARNING: '#f59e0b', ERROR: '#ef4444',
};

export default function AuditFeed({ events }: Props) {
    return (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs">📋</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audit Feed</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 4px #10b981' }} />
                    <span className="text-[9px] text-emerald-400 font-bold uppercase">LIVE</span>
                </div>
            </div>

            {/* Event list */}
            <div className="max-h-[248px] overflow-y-auto cyber-scroll-y">
                {events.length === 0 ? (
                    <div className="p-4 text-center text-[10px] text-slate-600">No events yet</div>
                ) : (
                    <div className="divide-y divide-white/[0.03]">
                        {events.slice(0, 20).map((event, i) => {
                            const icon = EVENT_ICONS[event.eventType] || '📋';
                            const color = SEVERITY_COLORS[event.severity] || '#3b82f6';
                            const time = new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                            return (
                                <div
                                    key={event.id}
                                    className="flex items-start gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
                                    style={{ opacity: 1 - i * 0.03 }}
                                >
                                    {/* Severity line */}
                                    <div className="w-0.5 h-8 rounded-full flex-shrink-0 mt-0.5" style={{ background: color }} />

                                    {/* Icon */}
                                    <span className="text-[11px] flex-shrink-0 mt-0.5">{icon}</span>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] text-white/80 leading-tight truncate">{event.title}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {event.agentName && (
                                                <span className="text-[8px] text-slate-500">🤖 {event.agentName}</span>
                                            )}
                                            {event.txHash && (
                                                <span className="text-[8px] text-slate-600 font-mono">
                                                    {event.txHash.slice(0, 8)}...
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <span className="text-[8px] text-slate-600 flex-shrink-0 tabular-nums mt-0.5">{time}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
