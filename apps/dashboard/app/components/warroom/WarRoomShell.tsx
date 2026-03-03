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
