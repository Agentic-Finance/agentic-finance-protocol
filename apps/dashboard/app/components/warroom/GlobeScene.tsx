'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import GlobeCore from './GlobeCore';
import AgentNodes from './AgentNodes';
import PaymentArcs from './PaymentArcs';
import GlobeControls from './GlobeControls';
import type { AgentGeoNode, PaymentArc } from '../../lib/warroom-types';

interface Props {
    agents: AgentGeoNode[];
    arcs: PaymentArc[];
    selectedAgentId: string | null;
    onSelectAgent: (id: string | null) => void;
}

// Adaptive quality based on device capability
function useQuality(): 'low' | 'medium' | 'high' {
    const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const renderer = gl ? (gl as any).getParameter((gl as any).RENDERER) || '' : '';
        const isLowEnd = isMobile || renderer.toLowerCase().includes('intel') || renderer.toLowerCase().includes('swiftshader');

        if (isLowEnd && isMobile) setQuality('low');
        else if (isLowEnd) setQuality('medium');
        else setQuality('high');
    }, []);
    return quality;
}

// Loading skeleton while Three.js initializes
function GlobeLoading() {
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
                <div className="w-20 h-20 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-3" />
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Loading Globe...</div>
            </div>
        </div>
    );
}

export default function GlobeScene({ agents, arcs, selectedAgentId, onSelectAgent }: Props) {
    const quality = useQuality();
    const [ready, setReady] = useState(false);

    return (
        <div className="w-full h-full absolute inset-0">
            {!ready && <GlobeLoading />}
            <Canvas
                dpr={[1, quality === 'high' ? 2 : 1.5]}
                camera={{ position: [0, 0.3, 2.8], fov: 50 }}
                gl={{
                    antialias: quality !== 'low',
                    alpha: true,
                    powerPreference: 'high-performance',
                    stencil: false,
                    depth: true,
                }}
                style={{ background: 'transparent' }}
                onCreated={() => setReady(true)}
                frameloop={quality === 'low' ? 'demand' : 'always'}
            >
                <Suspense fallback={null}>
                    {/* Subtle ambient + directional lighting for blue marble visibility */}
                    <ambientLight intensity={0.35} />
                    <directionalLight
                        position={[5, 3, 5]}
                        intensity={0.8}
                        color="#e0e8ff"
                    />
                    <pointLight position={[-4, -2, 3]} intensity={0.2} color="#6366f1" />

                    <GlobeCore quality={quality} />
                    <AgentNodes
                        agents={agents}
                        quality={quality}
                        selectedAgentId={selectedAgentId}
                        onSelectAgent={onSelectAgent}
                    />
                    <PaymentArcs arcs={arcs} quality={quality} />
                    <GlobeControls autoRotate={!selectedAgentId} />
                </Suspense>
            </Canvas>

            {/* Selected Agent Info Overlay */}
            {selectedAgentId && (() => {
                const agent = agents.find(a => a.id === selectedAgentId);
                if (!agent) return null;
                return (
                    <div className="absolute top-3 left-3 z-10 w-[240px] rounded-xl overflow-hidden"
                        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="px-3 py-2 border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), transparent)' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{
                                        background: agent.status === 'active' ? '#10b981' : agent.status === 'idle' ? '#f59e0b' : '#ef4444',
                                        boxShadow: agent.status === 'active' ? '0 0 6px #10b981' : 'none',
                                    }} />
                                    <span className="text-xs font-bold text-white">{agent.name}</span>
                                </div>
                                <button onClick={() => onSelectAgent(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
                            </div>
                        </div>
                        <div className="px-3 py-2 space-y-1">
                            {[
                                { l: 'Role', v: agent.role, c: '#6366f1' },
                                { l: 'Location', v: `${agent.city} (${agent.region})`, c: '#94a3b8' },
                                { l: 'Volume', v: `$${Math.round(agent.totalVolume).toLocaleString()}`, c: '#06b6d4' },
                                { l: 'Wallet', v: `${agent.wallet.slice(0, 10)}…${agent.wallet.slice(-6)}`, c: '#64748b' },
                            ].map((row, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-[9px] text-slate-500 uppercase">{row.l}</span>
                                    <span className="text-[10px] font-bold tabular-nums" style={{ color: row.c }}>{row.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Quality indicator */}
            <div className="absolute bottom-2 left-3 z-10">
                <div className="text-[9px] text-slate-600 uppercase tracking-wider">
                    3D Globe • {agents.length} Agents • {arcs.length} Flows • {quality.toUpperCase()}
                </div>
            </div>
        </div>
    );
}
