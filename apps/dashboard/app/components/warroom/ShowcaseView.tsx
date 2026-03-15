'use client';

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import GlobeCore from './GlobeCore';
import AgentNodes from './AgentNodes';
import PaymentArcs from './PaymentArcs';
import GlobeControls from './GlobeControls';
import CameraDolly from './CameraDolly';
import { useWarRoomData } from '../../hooks/useWarRoomData';
import type { AuditEvent } from '../../lib/warroom-types';

// ── Showcase View — Full-screen marketing cinematic ──

const EVENT_ICONS: Record<string, string> = {
    SWARM_CREATED: '🐝', SWARM_COMPLETED: '🎉', AGENT_JOINED: '🤖',
    A2A_TRANSFER: '⚡', INTEL_SUBMITTED: '🛡️', ESCROW_LOCKED: '🔐',
    ESCROW_RELEASED: '🔓', MILESTONE_APPROVED: '✅',
};

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
    const [display, setDisplay] = useState(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const start = display;
        const diff = value - start;
        if (diff === 0) return;
        const duration = 1500;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setDisplay(Math.round(start + diff * eased));
            if (progress < 1) frameRef.current = requestAnimationFrame(animate);
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    }, [value]);

    return <>{prefix}{display.toLocaleString()}</>;
}

export default function ShowcaseView() {
    const { stats, agents, arcs, auditEvents } = useWarRoomData({ pollInterval: 30000 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showTagline, setShowTagline] = useState(true);
    const [autoRotate, setAutoRotate] = useState(true);
    const [highlightIdx, setHighlightIdx] = useState(-1);

    // Auto-fade tagline after 5s
    useEffect(() => {
        const timer = setTimeout(() => setShowTagline(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // Auto-highlight agent cycle every 8s
    useEffect(() => {
        if (agents.length === 0) return;
        const timer = setInterval(() => {
            setHighlightIdx(prev => (prev + 1) % agents.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [agents.length]);

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

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'f' || e.key === 'F') toggleFullscreen();
            if (e.key === ' ') { e.preventDefault(); setAutoRotate(r => !r); }
            if (e.key === 'Escape' && document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        };
        window.addEventListener('keydown', handler);
        const fsHandler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', fsHandler);
        return () => {
            window.removeEventListener('keydown', handler);
            document.removeEventListener('fullscreenchange', fsHandler);
        };
    }, [toggleFullscreen]);

    const highlightedAgent = highlightIdx >= 0 && highlightIdx < agents.length ? agents[highlightIdx] : null;

    return (
        <div className="fixed inset-0 z-50" style={{ background: '#000' }}>
            {/* 3D Canvas — full screen */}
            <Canvas
                dpr={[1, 2]}
                camera={{ position: [0, 0.5, 8], fov: 45 }}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
                style={{ background: 'radial-gradient(ellipse at center, #0d1117 0%, #000 100%)' }}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.35} />
                    <directionalLight position={[5, 3, 5]} intensity={0.8} color="#e0e8ff" />
                    <pointLight position={[-4, -2, 3]} intensity={0.2} color="#6366f1" />
                    <pointLight position={[3, 4, -3]} intensity={0.15} color="#d946ef" />

                    <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

                    <CameraDolly
                        startPosition={[0, 0.5, 8]}
                        endPosition={[0, 0.3, 2.8]}
                        duration={3.5}
                    />

                    <GlobeCore quality="high" />
                    <AgentNodes agents={agents} quality="high" selectedAgentId={null} onSelectAgent={() => {}} />
                    <PaymentArcs arcs={arcs} quality="high" />
                    <GlobeControls autoRotate={autoRotate} />
                </Suspense>
            </Canvas>

            {/* Marketing Tagline — fades after 5s */}
            {showTagline && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                    style={{ animation: 'fadeOutTagline 5s ease-out forwards' }}>
                    <div className="text-center">
                        <h1 style={{
                            fontSize: 'clamp(1.8rem, 4vw, 3.5rem)', fontWeight: '900', color: 'rgba(255,255,255,0.9)',
                            letterSpacing: '-0.03em', lineHeight: 1.2, textShadow: '0 0 60px rgba(99,102,241,0.3)',
                        }}>
                            The Financial OS<br />for the Agentic Economy
                        </h1>
                        <p style={{
                            marginTop: '16px', fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
                            color: 'rgba(148,163,184,0.8)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600',
                        }}>
                            {agents.length || 32} Agents &middot; Real-Time &middot; On-Chain
                        </p>
                    </div>
                </div>
            )}

            {/* LIVE badge — top left */}
            <div className="absolute top-5 left-5 z-10" style={{ animation: 'slideInFromLeft 0.8s ease-out 3s both' }}>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="relative">
                        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 12px #10b981, 0 0 30px #10b98140' }} />
                        <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping" style={{ background: '#10b981', opacity: 0.3 }} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">LIVE</span>
                </div>
                <h2 className="text-xl font-black text-white/90 tracking-tight" style={{ animation: 'glowPulse 4s ease-in-out infinite' }}>
                    PayPol War Room
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Real-time Agent Economy</p>
            </div>

            {/* Stats — top right */}
            {stats && (
                <div className="absolute top-5 right-5 z-10 flex flex-col gap-1.5" style={{ animation: 'slideInFromLeft 0.8s ease-out 3.2s both' }}>
                    {[
                        { label: 'Agents', value: stats.activeAgents, color: '#3b82f6', isNum: true },
                        { label: 'A2A Vol', value: stats.a2aVolume, color: '#06b6d4', prefix: '$', isNum: true },
                        { label: 'Swarms', value: stats.activeSwarms, color: '#f59e0b', isNum: true },
                        { label: 'Locked', value: stats.totalBudgetLocked, color: '#d946ef', prefix: '$', isNum: true },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span>
                            <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>
                                <AnimatedNumber value={Math.round(s.value as number)} prefix={s.prefix} />
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Agent spotlight — appears during auto-highlight */}
            {highlightedAgent && !showTagline && (
                <div className="absolute top-1/2 left-5 -translate-y-1/2 z-10"
                    style={{
                        animation: 'slideInFromLeft 0.5s ease-out',
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)',
                        borderRadius: '16px', padding: '14px 18px', border: '1px solid rgba(255,255,255,0.06)',
                        maxWidth: '220px',
                    }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{
                            background: highlightedAgent.status === 'active' ? '#10b981' : highlightedAgent.status === 'idle' ? '#f59e0b' : '#ef4444',
                            boxShadow: `0 0 8px ${highlightedAgent.status === 'active' ? '#10b981' : highlightedAgent.status === 'idle' ? '#f59e0b' : '#ef4444'}`,
                        }} />
                        <span className="text-xs font-bold text-white">{highlightedAgent.name}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between"><span className="text-[9px] text-slate-500">Role</span><span className="text-[10px] text-indigo-400 font-bold">{highlightedAgent.role}</span></div>
                        <div className="flex justify-between"><span className="text-[9px] text-slate-500">Region</span><span className="text-[10px] text-slate-300 font-bold">{highlightedAgent.city}</span></div>
                        <div className="flex justify-between"><span className="text-[9px] text-slate-500">Volume</span><span className="text-[10px] text-cyan-400 font-bold">${Math.round(highlightedAgent.totalVolume).toLocaleString()}</span></div>
                    </div>
                </div>
            )}

            {/* Event feed — bottom left */}
            <div className="absolute bottom-5 left-5 z-10 w-[260px] max-h-[180px] overflow-hidden"
                style={{ animation: 'slideInFromLeft 0.8s ease-out 3.5s both' }}>
                <div className="space-y-1">
                    {auditEvents.slice(0, 6).map((event: AuditEvent, i: number) => (
                        <div key={event.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                            style={{
                                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
                                opacity: 1 - i * 0.12,
                                animation: `slideInFromLeft 0.4s ease-out ${3.5 + i * 0.1}s both`,
                            }}>
                            <span className="text-xs">{EVENT_ICONS[event.eventType] || '📋'}</span>
                            <span className="text-[10px] text-slate-300 truncate flex-1">{event.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls + Watermark — bottom right */}
            <div className="absolute bottom-5 right-5 z-10 flex flex-col items-end gap-3"
                style={{ animation: 'slideInFromLeft 0.8s ease-out 3.5s both' }}>
                {/* Navigation links */}
                <div className="flex items-center gap-2">
                    <a href="/"
                        className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', textDecoration: 'none' }}
                    >
                        Explore PayPol
                    </a>
                    <a href="/?app=1"
                        className="px-3 py-2 rounded-xl text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{ background: 'rgba(99,102,241,0.1)', backdropFilter: 'blur(12px)', textDecoration: 'none', border: '1px solid rgba(99,102,241,0.2)' }}
                    >
                        Open Dashboard
                    </a>
                    <button
                        onClick={toggleFullscreen}
                        className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}
                    >
                        {isFullscreen ? '⊡ Exit FS' : '⊞ Fullscreen'}
                    </button>
                </div>

                {/* Watermark */}
                <div className="text-right">
                    <div className="text-[9px] text-slate-600 font-mono tracking-wider" style={{ opacity: 0.4 }}>
                        agt.finance
                    </div>
                </div>
            </div>

            {/* Keyboard hints — appears once, then fades */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10"
                style={{ animation: 'fadeOutTagline 8s ease-out 4s forwards' }}>
                <div className="flex items-center gap-4 text-[9px] text-slate-600 uppercase tracking-wider">
                    <span><kbd className="text-slate-500 bg-white/5 px-1.5 py-0.5 rounded text-[8px]">F</kbd> Fullscreen</span>
                    <span><kbd className="text-slate-500 bg-white/5 px-1.5 py-0.5 rounded text-[8px]">Space</kbd> Pause</span>
                </div>
            </div>
        </div>
    );
}
