import React from 'react';
import { CheckBadgeIcon, ArrowRightIcon, BoltIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import type { DiscoveredAgent } from '../../hooks/useAgentMarketplace';

interface AgentCardProps {
    agent: DiscoveredAgent;
    rank: number;
    onHire: (agent: DiscoveredAgent) => void;
    isBrowseMode?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    security: 'text-rose-400 bg-rose-500/8 border-rose-500/15',
    defi: 'text-amber-400 bg-amber-500/8 border-amber-500/15',
    payroll: 'text-emerald-400 bg-emerald-500/8 border-emerald-500/15',
    analytics: 'text-cyan-400 bg-cyan-500/8 border-cyan-500/15',
    automation: 'text-violet-400 bg-violet-500/8 border-violet-500/15',
    compliance: 'text-blue-400 bg-blue-500/8 border-blue-500/15',
    governance: 'text-fuchsia-400 bg-fuchsia-500/8 border-fuchsia-500/15',
    tax: 'text-orange-400 bg-orange-500/8 border-orange-500/15',
    nft: 'text-pink-400 bg-pink-500/8 border-pink-500/15',
    deployment: 'text-lime-400 bg-lime-500/8 border-lime-500/15',
};

function AgentCard({ agent, rank, onHire, isBrowseMode = false }: AgentCardProps) {
    const a = agent.agent;
    const catColor = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.analytics;

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Hire ${a.name} - ${a.category} agent, ${a.basePrice} ALPHA`}
            className={`relative bg-white/[0.03] border rounded-2xl p-4 flex flex-col transition-all duration-200 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                rank === 0 && !isBrowseMode
                    ? 'border-indigo-500/30 bg-indigo-500/[0.04]'
                    : 'border-white/[0.06] hover:border-indigo-500/25 hover:bg-white/[0.05]'
            }`}
            onClick={() => onHire(agent)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHire(agent); } }}
        >
            {/* Best Match badge - only in AI search results */}
            {rank === 0 && !isBrowseMode && (
                <div className="absolute -top-2 right-3 bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 z-10">
                    <BoltIcon className="w-2.5 h-2.5" /> Best Match
                </div>
            )}

            {/* Row 1: Avatar + Name + Category */}
            <div className="flex items-center gap-3 mb-2.5">
                <span className="text-2xl shrink-0 w-9 h-9 flex items-center justify-center bg-white/[0.04] rounded-xl">
                    {a.avatarEmoji}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h4 className="text-white font-semibold text-sm truncate">{a.name}</h4>
                        {a.isVerified && (
                            <CheckBadgeIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                    </div>
                    <span className={`inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded border mt-0.5 capitalize ${catColor}`}>
                        {a.category}
                    </span>
                </div>
            </div>

            {/* Row 2: Meta line — rating · jobs · success */}
            <div className="flex items-center gap-3 mb-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                    <StarIcon className="w-3 h-3 text-amber-400" />
                    <span className="text-white font-semibold">{a.avgRating}</span>
                    {a.ratingCount > 0 && <span>({a.ratingCount})</span>}
                </span>
                <span className="text-slate-700">·</span>
                <span><span className="text-white font-semibold">{a.totalJobs}</span> jobs</span>
                <span className="text-slate-700">·</span>
                <span><span className="text-emerald-400 font-semibold">{a.successRate}%</span></span>
            </div>

            {/* Row 3: Skills */}
            {a.skills && a.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {a.skills.slice(0, 3).map((skill, i) => (
                        <span key={i} className="text-[9px] text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.04]">{skill}</span>
                    ))}
                    {a.skills.length > 3 && <span className="text-[9px] text-slate-600">+{a.skills.length - 3}</span>}
                </div>
            )}

            {/* Row 4: Description */}
            <p className="text-[11px] text-slate-400/80 leading-relaxed mb-3 flex-1 line-clamp-2">
                {isBrowseMode ? a.description : (agent.relevanceScore > 0 ? agent.reasoning : a.description)}
            </p>

            {/* Footer: Price + Hire */}
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between mt-auto">
                <div className="flex items-baseline gap-1">
                    <span className="text-white font-bold text-base">{a.basePrice}</span>
                    <span className="text-[10px] text-slate-500">ALPHA</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onHire(agent); }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1 opacity-80 group-hover:opacity-100"
                >
                    Hire <ArrowRightIcon className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

export default React.memo(AgentCard);
