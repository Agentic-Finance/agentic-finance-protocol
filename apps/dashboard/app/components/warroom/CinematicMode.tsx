'use client';

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import GlobeCore from './GlobeCore';
import AgentNodes from './AgentNodes';
import PaymentArcs from './PaymentArcs';
import GlobeControls from './GlobeControls';
import CameraDolly from './CameraDolly';
import type { AgentGeoNode, PaymentArc, WarRoomStats, AuditEvent } from '../../lib/warroom-types';

interface Props {
    agents: AgentGeoNode[];
    arcs: PaymentArc[];
    stats: WarRoomStats | null;
    auditEvents: AuditEvent[];
    onExit: () => void;
}

const EVENT_ICONS: Record<string, string> = {
    SWARM_CREATED: '🐝', SWARM_COMPLETED: '🎉', AGENT_JOINED: '🤖',
    A2A_TRANSFER: '⚡', INTEL_SUBMITTED: '🛡️', ESCROW_LOCKED: '🔐',
    ESCROW_RELEASED: '🔓', MILESTONE_APPROVED: '✅',
};

export default function CinematicMode({ agents, arcs, stats, auditEvents, onExit }: Props) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);

    // Fullscreen toggle
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch { /* ignore */ }
    }, []);

    // Fullscreen change listener
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Escape key handler
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onExit();
            if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onExit, toggleFullscreen]);

    // Auto-highlight agents every 8s
    useEffect(() => {
        if (agents.length === 0) return;
        const timer = setInterval(() => {
            setHighlightIdx(prev => (prev + 1) % agents.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [agents.length]);

    const highlightedAgent = highlightIdx >= 0 && highlightIdx < agents.length ? agents[highlightIdx] : null;

    return (
        <div className="fixed inset-0 z-50" style={{ background: '#000' }}>
            {/* 3D Globe — full screen with camera dolly */}
            <Canvas
                dpr={[1, 2]}
                camera={{ position: [0, 0.4, 5], fov: 45 }}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
                style={{ background: 'radial-gradient(ellipse at center, #0d1117 0%, #000 100%)' }}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.35} />
                    <directionalLight position={[5, 3, 5]} intensity={0.8} color="#e0e8ff" />
                    <pointLight position={[-3, -2, 4]} intensity={0.2} color="#6366f1" />
                    <pointLight position={[3, 4, -3]} intensity={0.15} color="#d946ef" />

                    {/* Starfield background */}
                    <Stars radius={80} depth={40} count={1500} factor={3} saturation={0} fade speed={0.8} />

                    {/* Camera dolly entry animation */}
                    <CameraDolly
                        startPosition={[0, 0.4, 5]}
                        endPosition={[0, 0.3, 2.8]}
                        duration={2.5}
                    />

                    <GlobeCore quality="high" />
                    <AgentNodes agents={agents} quality="high" selectedAgentId={null} onSelectAgent={() => {}} />
                    <PaymentArcs arcs={arcs} quality="high" />
                    <GlobeControls autoRotate={true} />
                </Suspense>
            </Canvas>

            {/* LIVE indicator — top left */}
            <div className="absolute top-4 left-4 z-10">
                <div className="flex items-center gap-2 mb-1">
                    <div className="relative">
                        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 12px #10b981, 0 0 30px #10b98140' }} />
                        <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping" style={{ background: '#10b981', opacity: 0.3 }} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">LIVE</span>
                </div>
                <h1 className="text-2xl font-black text-white/90 tracking-tight" style={{ animation: 'glowPulse 4s ease-in-out infinite' }}>
                    Agentic Finance War Room
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Real-time Agent Economy</p>
            </div>

            {/* Stats — top right */}
            {stats && (
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
                    {[
                        { label: 'Agents', value: stats.activeAgents, color: '#3b82f6' },
                        { label: 'A2A Vol', value: `$${Math.round(stats.a2aVolume).toLocaleString()}`, color: '#06b6d4' },
                        { label: 'Swarms', value: stats.activeSwarms, color: '#f59e0b' },
                        { label: 'Locked', value: `$${Math.round(stats.totalBudgetLocked).toLocaleString()}`, color: '#d946ef' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span>
                            <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Agent spotlight — auto-cycling */}
            {highlightedAgent && (
                <div className="absolute top-1/2 left-4 -translate-y-1/2 z-10"
                    style={{
                        animation: 'slideInFromLeft 0.5s ease-out',
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)',
                        borderRadius: '14px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.06)',
                        maxWidth: '200px',
                    }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{
                            background: highlightedAgent.status === 'active' ? '#10b981' : highlightedAgent.status === 'idle' ? '#f59e0b' : '#ef4444',
                        }} />
                        <span className="text-[10px] font-bold text-white">{highlightedAgent.name}</span>
                    </div>
                    <div className="space-y-0.5">
                        <div className="flex justify-between"><span className="text-[8px] text-slate-500">Role</span><span className="text-[9px] text-indigo-400 font-bold">{highlightedAgent.role}</span></div>
                        <div className="flex justify-between"><span className="text-[8px] text-slate-500">City</span><span className="text-[9px] text-slate-300">{highlightedAgent.city}</span></div>
                        <div className="flex justify-between"><span className="text-[8px] text-slate-500">Vol</span><span className="text-[9px] text-cyan-400 font-bold">${Math.round(highlightedAgent.totalVolume).toLocaleString()}</span></div>
                    </div>
                </div>
            )}

            {/* Event feed — bottom left */}
            <div className="absolute bottom-4 left-4 z-10 w-[280px] max-h-[200px] overflow-hidden">
                <div className="space-y-1">
                    {auditEvents.slice(0, 6).map((event, i) => (
                        <div key={event.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-opacity"
                            style={{
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(12px)',
                                opacity: 1 - i * 0.12,
                            }}>
                            <span className="text-xs">{EVENT_ICONS[event.eventType] || '📋'}</span>
                            <span className="text-[10px] text-slate-300 truncate flex-1">{event.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls — bottom right */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleFullscreen}
                        className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}
                    >
                        {isFullscreen ? '⊡ Exit FS' : '⊞ Fullscreen'}
                    </button>
                    <button
                        onClick={onExit}
                        className="px-3 py-2 rounded-xl text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{ background: 'rgba(239,68,68,0.1)', backdropFilter: 'blur(12px)' }}
                    >
                        ✕ Exit
                    </button>
                </div>
                {/* Watermark */}
                <div className="text-[9px] text-slate-600 font-mono tracking-wider" style={{ opacity: 0.35 }}>
                    agt.finance
                </div>
            </div>
        </div>
    );
}
