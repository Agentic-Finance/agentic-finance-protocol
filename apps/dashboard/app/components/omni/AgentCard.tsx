import React from 'react';
import { CheckBadgeIcon, ClockIcon, ArrowRightIcon, BoltIcon, LinkIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import type { DiscoveredAgent } from '../../hooks/useAgentMarketplace';

interface AgentCardProps {
    agent: DiscoveredAgent;
    rank: number;
    onHire: (agent: DiscoveredAgent) => void;
    isBrowseMode?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    security: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    defi: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    payroll: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    analytics: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    automation: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    compliance: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    governance: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
    tax: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    nft: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
    deployment: { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/20' },
};

const SOURCE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
    native: { label: 'PayPol', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    community: { label: 'Community', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    eliza: { label: 'Eliza', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    crewai: { label: 'CrewAI', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
    langchain: { label: 'LangChain', bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
    olas: { label: 'Olas', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

function AgentCard({ agent, rank, onHire, isBrowseMode = false }: AgentCardProps) {
    const a = agent.agent;
    const cat = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.analytics;
    const src = SOURCE_BADGES[a.source || 'native'] || SOURCE_BADGES.native;
    const fullStars = Math.floor(a.avgRating);
    const hasHalfStar = a.avgRating - fullStars >= 0.5;

    return (
        <div className={`relative bg-white/[0.04] border ${rank === 0 && !isBrowseMode ? 'border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.1)]' : 'border-white/[0.08]'} rounded-2xl p-5 flex flex-col hover:border-indigo-500/40 hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(99,102,241,0.08)] transition-all duration-300 group`}>
            {/* Best Match badge — only in AI search results */}
            {rank === 0 && !isBrowseMode && (
                <div className="absolute -top-2.5 -right-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
                    <BoltIcon className="w-3 h-3" /> Best Match
                </div>
            )}

            {/* Header: Emoji + Name + Verified */}
            <div className="flex items-start gap-3 mb-3">
                <div className={`text-3xl shrink-0 ${isBrowseMode ? 'w-11 h-11' : 'w-14 h-14'} flex items-center justify-center bg-white/5 rounded-xl group-hover:scale-110 transition-transform`}>
                    {a.avatarEmoji}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-white font-bold leading-tight truncate ${isBrowseMode ? 'text-sm' : 'text-lg'}`}>{a.name}</h4>
                        {a.isVerified && (
                            <CheckBadgeIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${cat.bg} ${cat.text} ${cat.border} border`}>
                            {a.category}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${src.bg} ${src.text} ${src.border} border flex items-center gap-1`}>
                            {a.sourceUrl ? <LinkIcon className="w-2.5 h-2.5" /> : null}
                            {src.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Rating Stars */}
            <div className="flex items-center gap-4 mb-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                    <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <StarIcon
                                key={i}
                                className={`w-3 h-3 ${i < fullStars ? 'text-amber-400' : i === fullStars && hasHalfStar ? 'text-amber-400/50' : 'text-slate-700'}`}
                            />
                        ))}
                    </div>
                    <span className="font-bold text-amber-400 ml-0.5">{a.avgRating}</span>
                    {a.ratingCount > 0 && <span className="text-slate-600">({a.ratingCount})</span>}
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-2.5 mb-3 text-[10px] flex-wrap">
                <span className="text-slate-400">
                    <span className="text-white font-bold">{a.totalJobs}</span> jobs
                </span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400">
                    <span className="text-emerald-400 font-bold">{a.successRate}%</span> success
                </span>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-1 text-slate-400">
                    <ClockIcon className="w-3 h-3" />
                    <span className="text-white font-bold">~{a.responseTime}s</span>
                </span>
            </div>

            {/* Browse mode: show agent description */}
            {isBrowseMode && (
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3 flex-1 line-clamp-2">
                    {a.description}
                </p>
            )}

            {/* AI mode: show reasoning */}
            {!isBrowseMode && agent.relevanceScore > 0 && (
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 mb-4 flex-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">AI Match Reasoning</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">{agent.relevanceScore}%</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">&ldquo;{agent.reasoning}&rdquo;</p>
                </div>
            )}

            {/* Footer: Price + Hire */}
            <div className={`pt-3 border-t border-white/5 flex items-center justify-between mt-auto ${isBrowseMode ? 'gap-2' : ''}`}>
                <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Base Rate</span>
                    <span className={`text-white font-black flex items-center gap-1 mt-0.5 ${isBrowseMode ? 'text-base' : 'text-xl'}`}>
                        {a.basePrice} <span className="text-[10px] text-teal-500 font-bold">AlphaUSD</span>
                    </span>
                </div>
                <button
                    onClick={() => onHire(agent)}
                    className={`bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] hover:-translate-y-0.5 flex items-center gap-1.5 ${isBrowseMode ? 'px-4 py-2' : 'px-6 py-2.5'}`}
                >
                    Hire <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export default React.memo(AgentCard);
