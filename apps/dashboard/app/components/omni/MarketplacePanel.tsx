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
    { key: null, label: 'All' },
    { key: 'security', label: 'Security' },
    { key: 'defi', label: 'DeFi' },
    { key: 'payroll', label: 'Payroll' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'governance', label: 'Governance' },
    { key: 'tax', label: 'Tax' },
    { key: 'nft', label: 'NFT' },
    { key: 'deployment', label: 'Deploy' },
];

function SkeletonCard() {
    return (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-white/[0.04] rounded-xl shrink-0" />
                <div className="flex-1">
                    <div className="h-3.5 bg-white/[0.04] rounded w-2/3 mb-1.5" />
                    <div className="h-2.5 bg-white/[0.04] rounded w-1/3" />
                </div>
            </div>
            <div className="h-2.5 bg-white/[0.04] rounded w-full mb-1.5" />
            <div className="h-2.5 bg-white/[0.04] rounded w-3/4 mb-3" />
            <div className="pt-2.5 border-t border-white/[0.03] flex justify-between">
                <div className="h-4 bg-white/[0.04] rounded w-14" />
                <div className="h-7 bg-white/[0.04] rounded-lg w-16" />
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
            <div className="mt-4 bg-[#0A0E17] border border-white/[0.06] rounded-2xl overflow-hidden animate-in fade-in duration-500">

                {/* Header Bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                        <CpuChipIcon className="w-4.5 h-4.5 text-indigo-400" />
                        <h3 className="text-sm font-semibold text-white">Agent Marketplace</h3>
                        <span className="text-[10px] text-slate-500 font-mono">{allAgents.length} agents</span>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-1 px-5 py-2.5 border-b border-white/[0.03] overflow-x-auto scrollbar-hide">
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.key;
                        return (
                            <button
                                key={cat.label}
                                onClick={() => onFilterCategory(cat.key)}
                                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 whitespace-nowrap ${
                                    isActive
                                        ? 'bg-indigo-500/15 text-indigo-300 font-semibold'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                                }`}
                            >
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <div className="mx-5 mt-3 p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                        <p className="text-amber-400 text-xs">{error}</p>
                    </div>
                )}

                {/* Agent Grid */}
                <div className="p-4">
                    {isBrowseLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                        </div>
                    ) : displayAgents.length === 0 ? (
                        <div className="text-center py-12 text-slate-600 text-sm">
                            No agents in this category
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <div className="mt-4 bg-[#0A0E17] border border-white/[0.06] rounded-2xl overflow-hidden animate-in fade-in duration-500">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
                    <MagnifyingGlassIcon className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <div>
                        <h3 className="text-sm font-semibold text-white">Discovering Agents...</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">AI is matching the best agents for your task</p>
                    </div>
                </div>
                <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    // ── ERROR (idle) ──
    if (error && phase === 'idle') {
        return (
            <div className="mt-4 p-5 bg-rose-500/5 border border-rose-500/15 rounded-2xl animate-in fade-in duration-300">
                <p className="text-rose-400 text-sm text-center">{error}</p>
            </div>
        );
    }

    // ── RESULTS: AI-matched agents ──
    if (phase === 'results' && matchedAgents.length > 0) {
        return (
            <div className="mt-4 bg-[#0A0E17] border border-indigo-500/20 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                        <CpuChipIcon className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-semibold text-white">
                            {matchedAgents.length} agents matched
                        </h3>
                    </div>
                    <span className="text-[10px] text-indigo-400/60 font-mono">A2A Escrow Ready</span>
                </div>

                {/* Results Grid */}
                <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
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
