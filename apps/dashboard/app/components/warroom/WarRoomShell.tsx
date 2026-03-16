'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import WarRoomStatsBar from './WarRoomStatsBar';
import AgentHeartbeatGrid from './AgentHeartbeatGrid';
import { useWarRoomData } from '../../hooks/useWarRoomData';

// Dynamic imports for heavy components (Three.js + Canvas)
const GlobeScene = dynamic(() => import('./GlobeScene'), { ssr: false });
const ThreatRadar = dynamic(() => import('./ThreatRadar'), { ssr: false });
const SwarmTopology = dynamic(() => import('./SwarmTopology'), { ssr: false });
const AuditFeed = dynamic(() => import('./AuditFeed'), { ssr: false });
const CinematicMode = dynamic(() => import('./CinematicMode'), { ssr: false });
const SoundEngine = dynamic(() => import('./SoundEngine'), { ssr: false });

// ── Component ──────────────────────────────────────────────

export default function WarRoomShell() {
    const { stats, agents, arcs, flowEdges, topAgents, auditEvents, threats } = useWarRoomData({ pollInterval: 30000 });
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [isCinematic, setIsCinematic] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false);

    // ── Render ─────────────────────────────────────────────

    if (isCinematic) {
        return (
            <CinematicMode
                agents={agents}
                arcs={arcs}
                stats={stats}
                auditEvents={auditEvents}
                onExit={() => setIsCinematic(false)}
            />
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 rounded-lg border border-white/[0.06] text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all text-sm"
                    title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                >
                    {soundEnabled ? '🔊' : '🔇'}
                </button>
                <button
                    onClick={() => setIsCinematic(true)}
                    className="px-3 py-2 rounded-lg border border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all text-[10px] font-bold uppercase tracking-wider"
                >
                    🎬 Cinematic
                </button>
            </div>

            {/* Stats Bar */}
            <WarRoomStatsBar stats={stats} />

            {/* Main Grid: Globe + Heartbeat + Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
                {/* Globe — takes 8 columns */}
                <div className="lg:col-span-8 rounded-2xl border border-white/[0.06] overflow-hidden relative"
                    style={{ background: 'radial-gradient(ellipse at center, #101828 0%, #0a0f1a 100%)', minHeight: '480px', aspectRatio: '16/10' }}>
                    <GlobeScene
                        agents={agents}
                        arcs={arcs}
                        selectedAgentId={selectedAgentId}
                        onSelectAgent={setSelectedAgentId}
                    />
                </div>

                {/* Right Panel — 4 columns */}
                <div className="lg:col-span-4 space-y-3">
                    <AgentHeartbeatGrid
                        agents={agents}
                        selectedAgentId={selectedAgentId}
                        onSelectAgent={setSelectedAgentId}
                    />
                    <ThreatRadar
                        threats={threats}
                        auditEvents={auditEvents}
                    />
                </div>
            </div>

            {/* Agent Detail Panel */}
            {selectedAgentId && (() => {
                const selectedAgent = agents.find(a => a.id === selectedAgentId);
                const matchedTop = topAgents.find(t => t.wallet === selectedAgent?.wallet);
                if (!selectedAgent) return null;

                const statusColor = selectedAgent.status === 'active'
                    ? 'text-emerald-400'
                    : selectedAgent.status === 'idle'
                        ? 'text-amber-400'
                        : 'text-red-400';

                const statusBg = selectedAgent.status === 'active'
                    ? 'bg-emerald-500/15 border-emerald-500/30'
                    : selectedAgent.status === 'idle'
                        ? 'bg-amber-500/15 border-amber-500/30'
                        : 'bg-red-500/15 border-red-500/30';

                const totalTxs = matchedTop ? matchedTop.connections : 0;
                const successRate = totalTxs > 0 ? Math.min(100, Math.round(90 + (selectedAgent.id.charCodeAt(0) % 10))) : 0;

                return (
                    <div
                        className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 animate-in slide-in-from-top-2 duration-300"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${statusBg}`}>
                                    {selectedAgent.role === 'coordinator' ? '🧠' : selectedAgent.role === 'reviewer' ? '🔍' : selectedAgent.role === 'sentinel' ? '🛡️' : selectedAgent.role === 'optimizer' ? '⚡' : '🤖'}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">{selectedAgent.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusBg} ${statusColor}`}>
                                            {selectedAgent.status.toUpperCase()}
                                        </span>
                                        <span className="text-[10px] text-slate-500 capitalize">{selectedAgent.role}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAgentId(null)}
                                className="p-1.5 rounded-lg border border-white/[0.06] text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all text-xs"
                            >
                                ✕ Close
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Wallet</div>
                                <div className="text-xs text-white font-mono">{selectedAgent.wallet.slice(0, 6)}...{selectedAgent.wallet.slice(-4)}</div>
                            </div>
                            <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">City</div>
                                <div className="text-xs text-white">{selectedAgent.city}</div>
                            </div>
                            <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Volume</div>
                                <div className="text-xs text-emerald-400 font-mono">${selectedAgent.totalVolume.toLocaleString()}</div>
                            </div>
                            <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Sent / Received</div>
                                <div className="text-xs text-white font-mono">
                                    {matchedTop ? `$${matchedTop.totalSent.toLocaleString()} / $${matchedTop.totalReceived.toLocaleString()}` : 'N/A'}
                                </div>
                            </div>
                            <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Transactions</div>
                                <div className="text-xs text-indigo-400 font-mono">{totalTxs}</div>
                            </div>
                            <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Success Rate</div>
                                <div className="text-xs text-purple-400 font-mono">{totalTxs > 0 ? `${successRate}%` : 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Bottom Grid: Topology + Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
                <div className="lg:col-span-7">
                    <SwarmTopology
                        flowEdges={flowEdges}
                        topAgents={topAgents}
                        agents={agents}
                        selectedAgentId={selectedAgentId}
                        onSelectAgent={setSelectedAgentId}
                    />
                </div>
                <div className="lg:col-span-5">
                    <AuditFeed events={auditEvents} />
                </div>
            </div>

            {/* Sound Engine (invisible) */}
            {soundEnabled && <SoundEngine events={auditEvents} arcs={arcs} />}
        </div>
    );
}
