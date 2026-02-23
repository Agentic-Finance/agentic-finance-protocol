import React from 'react';
import { CpuChipIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AgentCard from './AgentCard';
import type { DiscoveredAgent, MarketplacePhase } from '../../hooks/useAgentMarketplace';

interface MarketplacePanelProps {
    phase: MarketplacePhase;
    matchedAgents: DiscoveredAgent[];
    allAgents: DiscoveredAgent[];
    activeCategory: string | null;
    isBrowseLoading: boolean;
    onHireAgent: (agent: DiscoveredAgent) => void;
    onFilterCategory: (cat: string | null) => void;
    error: string | null;
}

const CATEGORIES = [
    { key: null, label: 'All', emoji: '🤖' },
    { key: 'security', label: 'Security', emoji: '🛡️' },
    { key: 'defi', label: 'DeFi', emoji: '💰' },
    { key: 'payroll', label: 'Payroll', emoji: '📊' },
    { key: 'analytics', label: 'Analytics', emoji: '📈' },
    { key: 'compliance', label: 'Compliance', emoji: '⚖️' },
    { key: 'governance', label: 'Governance', emoji: '🏛️' },
    { key: 'tax', label: 'Tax', emoji: '🧾' },
    { key: 'nft', label: 'NFT', emoji: '🎨' },
    { key: 'deployment', label: 'Deploy', emoji: '🚀' },
];

function SkeletonCard() {
    return (
        <div className="bg-black/40 border border-white/5 rounded-2xl p-5 animate-pulse">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 bg-white/5 rounded-xl shrink-0" />
                <div className="flex-1">
                    <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
            </div>
            <div className="h-3 bg-white/5 rounded w-full mb-2" />
            <div className="h-3 bg-white/5 rounded w-2/3 mb-3" />
            <div className="pt-3 border-t border-white/5 flex justify-between">
                <div className="h-5 bg-white/5 rounded w-16" />
                <div className="h-8 bg-white/5 rounded-xl w-20" />
            </div>
        </div>
    );
}

function MarketplacePanel({
    phase, matchedAgents, allAgents, activeCategory, isBrowseLoading,
    onHireAgent, onFilterCategory, error
}: MarketplacePanelProps) {

    // ── BROWSE MODE ──
    if (phase === 'browsing') {
        const displayAgents = activeCategory
            ? allAgents.filter(a => a.agent.category === activeCategory)
            : allAgents;

        return (
            <div className="mt-4 p-5 bg-[#0B0F19] border border-indigo-500/20 rounded-2xl animate-in fade-in duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none"></div>

                <div className="flex items-center justify-between mb-5 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                            <CpuChipIcon className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-wide">Agent Marketplace</h3>
                            <p className="text-xs text-indigo-300/70 mt-0.5">
                                <span className="text-white font-bold">{allAgents.length}</span> agents available for hire
                            </p>
                        </div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                        A2A Protocol
                    </span>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl relative z-10">
                        <p className="text-amber-400 text-xs">{error}</p>
                    </div>
                )}

                {/* Category Chips */}
                <div className="flex flex-wrap gap-2 mb-5 relative z-10">
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.key;
                        const count = cat.key
                            ? allAgents.filter(a => a.agent.category === cat.key).length
                            : allAgents.length;
                        return (
                            <button
                                key={cat.label}
                                onClick={() => onFilterCategory(cat.key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                                        : 'bg-white/[0.02] text-slate-500 border border-white/[0.04] hover:text-slate-300 hover:border-white/[0.08]'
                                }`}
                            >
                                <span className="text-sm">{cat.emoji}</span>
                                {cat.label}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.03] text-slate-600'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Agent Grid */}
                <div className="relative z-10">
                    {isBrowseLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                        </div>
                    ) : displayAgents.length === 0 ? (
                        <div className="text-center py-10 text-slate-600 text-sm font-mono">
                            No agents in this category
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayAgents.map((agent, i) => (
                                <AgentCard
                                    key={agent.agentId}
                                    agent={agent}
                                    rank={i}
                                    onHire={onHireAgent}
                                    isBrowseMode={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── ANALYZING ──
    if (phase === 'analyzing') {
        return (
            <div className="mt-4 p-6 bg-[#0B0F19] border border-indigo-500/20 rounded-2xl animate-in fade-in duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none"></div>
                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                        <MagnifyingGlassIcon className="w-6 h-6 text-indigo-400 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Discovering Agents...</h3>
                        <p className="text-sm text-indigo-300/60 mt-1">AI is analyzing your task and matching the best agents</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-6 animate-pulse">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-14 h-14 bg-white/5 rounded-xl shrink-0" />
                                <div className="flex-1">
                                    <div className="h-5 bg-white/5 rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-white/5 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="h-3 bg-white/5 rounded w-full mb-2" />
                            <div className="h-3 bg-white/5 rounded w-2/3 mb-4" />
                            <div className="h-16 bg-white/5 rounded-xl mb-4" />
                            <div className="pt-4 border-t border-white/5 flex justify-between">
                                <div className="h-6 bg-white/5 rounded w-20" />
                                <div className="h-10 bg-white/5 rounded-xl w-28" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── ERROR (idle) ──
    if (error && phase === 'idle') {
        return (
            <div className="mt-4 p-6 bg-rose-500/5 border border-rose-500/20 rounded-2xl animate-in fade-in duration-300">
                <p className="text-rose-400 text-sm text-center">{error}</p>
            </div>
        );
    }

    // ── RESULTS: AI-matched agents ──
    if (phase === 'results' && matchedAgents.length > 0) {
        return (
            <div className="mt-4 p-6 bg-[#0B0F19] border border-indigo-500/30 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none"></div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                            <CpuChipIcon className="w-7 h-7 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-wide">Agent Marketplace</h3>
                            <p className="text-sm text-indigo-300/80 mt-1">
                                AI found <span className="text-white font-bold">{matchedAgents.length}</span> agents matching your task
                            </p>
                        </div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                        A2A Escrow Ready
                    </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
                    {matchedAgents.map((agent, i) => (
                        <AgentCard
                            key={agent.agentId}
                            agent={agent}
                            rank={i}
                            onHire={onHireAgent}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return null;
}

export default React.memo(MarketplacePanel);
