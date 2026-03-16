'use client';

import React from 'react';
import type { WarRoomStats } from '../../lib/warroom-types';

interface Props {
    stats: WarRoomStats | null;
}

const statDefs = [
    { key: 'activeAgents', label: 'Active Agents', color: '#3b82f6', icon: '🤖', format: (v: number) => `${v}` },
    { key: 'activeSwarms', label: 'Active Swarms', color: '#f59e0b', icon: '🐝', format: (v: number) => `${v}` },
    { key: 'a2aVolume', label: 'A2A Volume', color: '#06b6d4', icon: '⚡', format: (v: number) => `$${Math.round(v).toLocaleString()}` },
    { key: 'auditCount', label: 'Audit Events', color: '#10b981', icon: '📋', format: (v: number) => `${v.toLocaleString()}` },
    { key: 'totalBudgetLocked', label: 'Total Locked', color: '#d946ef', icon: '🔐', format: (v: number) => `$${Math.round(v).toLocaleString()}` },
] as const;

export default function WarRoomStatsBar({ stats }: Props) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            {statDefs.map((def) => {
                const value = stats ? (stats as any)[def.key] : null;
                return (
                    <div
                        key={def.key}
                        className="relative overflow-hidden rounded-xl border border-white/[0.06] p-3 sm:p-4"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                        {/* Glow accent */}
                        <div
                            className="absolute top-0 right-0 w-16 h-16 blur-[40px] opacity-20 pointer-events-none"
                            style={{ background: def.color }}
                        />
                        <div className="relative z-10">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-xs">{def.icon}</span>
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{def.label}</span>
                            </div>
                            {value != null ? (
                                <div className="text-lg sm:text-xl font-black tabular-nums" style={{ color: def.color }}>
                                    {def.format(value)}
                                </div>
                            ) : (
                                <div className="h-7 w-20 rounded-lg bg-white/[0.04] animate-pulse" />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
