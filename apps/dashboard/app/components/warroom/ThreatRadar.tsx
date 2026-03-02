'use client';

import React, { useMemo } from 'react';
import type { ThreatItem, AuditEvent } from '../../lib/warroom-types';

interface Props {
    threats: ThreatItem[];
    auditEvents: AuditEvent[];
}

const SEVERITY_CONFIG = {
    WARNING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'WARN' },
    ERROR: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'CRIT' },
};

const TYPE_ICONS: Record<string, string> = {
    HIGH_VALUE: '💰',
    FAILED_TX: '❌',
    RAPID_CHAIN: '⚡',
    ANOMALY: '🔍',
};

export default function ThreatRadar({ threats, auditEvents }: Props) {
    // Severity counts from audit events
    const severityCounts = useMemo(() => {
        const counts = { INFO: 0, SUCCESS: 0, WARNING: 0, ERROR: 0 };
        for (const event of auditEvents) {
            if (event.severity in counts) {
                counts[event.severity as keyof typeof counts]++;
            }
        }
        return counts;
    }, [auditEvents]);

    // Blip positions on radar (normalized 0-1 from center)
    const blips = useMemo(() => {
        return threats.slice(0, 8).map((threat, i) => {
            const angle = (i / Math.max(threats.length, 1)) * Math.PI * 2;
            const dist = 0.3 + (threat.severity === 'ERROR' ? 0.15 : 0.35) + Math.random() * 0.2;
            return {
                ...threat,
                cx: 50 + Math.cos(angle) * dist * 45,
                cy: 50 + Math.sin(angle) * dist * 45,
            };
        });
    }, [threats]);

    return (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs">📡</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Threat Radar</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-amber-400 font-bold tabular-nums">{severityCounts.WARNING}W</span>
                    <span className="text-[9px] text-red-400 font-bold tabular-nums">{severityCounts.ERROR}E</span>
                </div>
            </div>

            {/* Radar Display */}
            <div className="p-3">
                <div className="relative aspect-square max-w-[220px] mx-auto">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Concentric rings */}
                        {[20, 35, 50].map((r, i) => (
                            <circle key={i} cx="50" cy="50" r={r * 0.9}
                                fill="none" stroke="rgba(99,102,241,0.08)" strokeWidth="0.3" />
                        ))}

                        {/* Cross lines */}
                        <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(99,102,241,0.06)" strokeWidth="0.3" />
                        <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(99,102,241,0.06)" strokeWidth="0.3" />

                        {/* Sweep line */}
                        <line x1="50" y1="50" x2="50" y2="5"
                            stroke="rgba(16,185,129,0.5)" strokeWidth="0.8"
                            className="origin-center"
                            style={{ transformOrigin: '50px 50px', animation: 'spin 4s linear infinite' }}
                        />

                        {/* Sweep cone (gradient effect via polygon) */}
                        <path
                            d="M 50 50 L 50 5 A 45 45 0 0 1 85 22 Z"
                            fill="rgba(16,185,129,0.04)"
                            className="origin-center"
                            style={{ transformOrigin: '50px 50px', animation: 'spin 4s linear infinite' }}
                        />

                        {/* Threat blips */}
                        {blips.map((blip, i) => {
                            const conf = SEVERITY_CONFIG[blip.severity];
                            return (
                                <g key={blip.id}>
                                    {/* Glow */}
                                    <circle cx={blip.cx} cy={blip.cy} r="3"
                                        fill={conf.color} opacity={0.15} />
                                    {/* Dot */}
                                    <circle cx={blip.cx} cy={blip.cy} r="1.5"
                                        fill={conf.color} opacity={0.8}>
                                        <animate attributeName="r" values="1.5;2.2;1.5" dur="2s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
                                        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
                                    </circle>
                                </g>
                            );
                        })}

                        {/* Center dot */}
                        <circle cx="50" cy="50" r="2" fill="#6366f1" opacity={0.6} />
                        <circle cx="50" cy="50" r="1" fill="#a5b4fc" />
                    </svg>
                </div>

                {/* Threat list */}
                <div className="mt-2 space-y-1 max-h-[120px] overflow-y-auto cyber-scroll-y">
                    {threats.length === 0 ? (
                        <div className="text-[10px] text-slate-600 text-center py-2">No threats detected</div>
                    ) : (
                        threats.slice(0, 5).map((threat) => {
                            const conf = SEVERITY_CONFIG[threat.severity];
                            return (
                                <div key={threat.id} className="flex items-center gap-2 px-2 py-1 rounded-lg"
                                    style={{ background: conf.bg }}>
                                    <span className="text-[10px]">{TYPE_ICONS[threat.type] || '⚠️'}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[9px] font-bold truncate" style={{ color: conf.color }}>{threat.title}</div>
                                        <div className="text-[8px] text-slate-600 truncate">{threat.detail}</div>
                                    </div>
                                    <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)', color: conf.color }}>
                                        {conf.label}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
