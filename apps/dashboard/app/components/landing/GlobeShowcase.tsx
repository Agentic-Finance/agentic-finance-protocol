'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import GlobeCore from '../warroom/GlobeCore';
import AgentNodes from '../warroom/AgentNodes';
import PaymentArcs from '../warroom/PaymentArcs';
import GlobeControls from '../warroom/GlobeControls';
import { useWarRoomData } from '../../hooks/useWarRoomData';

// ── Globe Showcase Section for Landing Page ──

function GlobeLoading() {
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-3" />
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Initializing Globe...</div>
            </div>
        </div>
    );
}

function StatItem({ label, value, color, delay }: { label: string; value: string | number; color: string; delay: number }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5"
            style={{ animation: `countUp 0.6s ease-out ${delay}s both` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
            <span className="text-xs font-black tabular-nums" style={{ color }}>{value}</span>
        </div>
    );
}

export default function GlobeShowcase() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [canvasReady, setCanvasReady] = useState(false);

    // IntersectionObserver — only activate when scrolled into view
    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
            { threshold: 0.1, rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Fetch data only when visible — polling every 60s (landing page)
    const { stats, agents, arcs } = useWarRoomData({ pollInterval: 60000, enabled: isVisible });

    // Quality detection
    const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
        setQuality(isMobile ? 'low' : 'medium');
    }, []);

    return (
        <section ref={sectionRef} style={{ padding: '100px 20px', position: 'relative', zIndex: 10, overflow: 'hidden' }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '800px', height: '800px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
                {/* Section header */}
                <div className="reveal" style={{ textAlign: 'center', marginBottom: '48px' }}>
                    {/* LIVE NETWORK badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '100px', marginBottom: '24px',
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981',
                            boxShadow: '0 0 8px #10b981', animation: 'pulse-glow 2s ease-in-out infinite' }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#10b981', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                            Live Network
                        </span>
                    </div>

                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3.2rem)', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '16px' }}>
                        Watch AI Agents Move Money<br />
                        <span className="gradient-text">Across the Globe</span>
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
                        {stats?.activeAgents || 32} agents &middot; Real transactions &middot; Real-time settlement
                    </p>
                </div>

                {/* Globe container */}
                <div style={{
                    position: 'relative', maxWidth: '960px', margin: '0 auto', borderRadius: '20px', overflow: 'hidden',
                    border: '1px solid rgba(99,102,241,0.15)',
                    background: 'radial-gradient(ellipse at center, #0a0f1a 0%, #060810 100%)',
                    aspectRatio: '16/10', minHeight: '380px',
                    animation: canvasReady ? 'globeReveal 1s ease-out' : 'none',
                    boxShadow: '0 0 80px rgba(99,102,241,0.08), 0 20px 60px rgba(0,0,0,0.4)',
                }}>
                    {!canvasReady && <GlobeLoading />}

                    {isVisible && (
                        <Canvas
                            dpr={[1, quality === 'high' ? 2 : 1.5]}
                            camera={{ position: [0, 0.3, 3.2], fov: 50 }}
                            gl={{ antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance', stencil: false }}
                            style={{ background: 'transparent', opacity: canvasReady ? 1 : 0, transition: 'opacity 0.8s ease' }}
                            onCreated={() => setCanvasReady(true)}
                            frameloop={quality === 'low' ? 'demand' : 'always'}
                        >
                            <Suspense fallback={null}>
                                <ambientLight intensity={0.35} />
                                <directionalLight position={[5, 3, 5]} intensity={0.8} color="#e0e8ff" />
                                <pointLight position={[-4, -2, 3]} intensity={0.15} color="#6366f1" />

                                <Stars radius={80} depth={40} count={1500} factor={3} saturation={0} fade speed={0.5} />

                                <GlobeCore quality={quality} />
                                <AgentNodes agents={agents} quality={quality} selectedAgentId={null} onSelectAgent={() => {}} />
                                <PaymentArcs arcs={arcs} quality={quality} />
                                <GlobeControls autoRotate={true} />
                            </Suspense>
                        </Canvas>
                    )}

                    {/* Stats overlay — bottom */}
                    {canvasReady && stats && (
                        <div style={{
                            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)', borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '2px', padding: '2px 4px',
                        }}>
                            <StatItem label="Agents" value={stats.activeAgents || 32} color="#3b82f6" delay={0.2} />
                            <StatItem label="Volume" value={`$${Math.round(stats.a2aVolume || 0).toLocaleString()}`} color="#06b6d4" delay={0.4} />
                            <StatItem label="Swarms" value={stats.activeSwarms || 0} color="#f59e0b" delay={0.6} />
                            <StatItem label="Locked" value={`$${Math.round(stats.totalBudgetLocked || 0).toLocaleString()}`} color="#d946ef" delay={0.8} />
                        </div>
                    )}
                </div>

                {/* CTA buttons */}
                <div className="reveal" style={{ textAlign: 'center', marginTop: '36px' }}>
                    <a href="/showcase" target="_blank" rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px',
                            borderRadius: '100px', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '0.05em',
                            color: '#fff', textDecoration: 'none', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(217,70,239,0.2), rgba(6,182,212,0.2))',
                            border: '1px solid rgba(99,102,241,0.3)',
                            boxShadow: '0 0 30px rgba(99,102,241,0.15)',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.boxShadow = '0 0 50px rgba(99,102,241,0.3)';
                            (e.target as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)';
                        }}
                        onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(99,102,241,0.15)';
                            (e.target as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                        }}
                    >
                        <span style={{ fontSize: '1.1rem' }}>&#x2728;</span>
                        Enter Cinematic Mode
                    </a>
                    <div style={{ marginTop: '12px' }}>
                        <a href="/sentinel" style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#94a3b8'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#64748b'}
                        >
                            or explore Sentinel &rarr;
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
