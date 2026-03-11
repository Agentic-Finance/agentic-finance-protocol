import React from 'react';
import { CheckBadgeIcon, ArrowRightIcon, BoltIcon, InformationCircleIcon, StarIcon } from '@/app/components/icons';
import type { DiscoveredAgent } from '../../hooks/useAgentMarketplace';
import { CATEGORY_COLORS } from './constants';

interface AgentCardProps {
    agent: DiscoveredAgent;
    rank: number;
    onHire: (agent: DiscoveredAgent) => void;
    onShowDetail?: (agent: DiscoveredAgent) => void;
    isBrowseMode?: boolean;
}

type AgentStatus = 'online' | 'offline' | 'unknown';

function getAgentStatus(agent: DiscoveredAgent['agent']): { status: AgentStatus; label: string; color: string; dotColor: string } {
    // Native agents (built-in Claude-powered) are always online
    if (agent.nativeAgentId || agent.source === 'native') {
        return { status: 'online', label: 'Online', color: 'text-emerald-400', dotColor: 'bg-emerald-400' };
    }
    // Community agents with webhook — show as available
    if (agent.webhookUrl) {
        return { status: 'online', label: 'Available', color: 'text-emerald-400', dotColor: 'bg-emerald-400' };
    }
    // Demo agents (no endpoint) — show as demo
    return { status: 'unknown', label: 'Demo', color: 'text-slate-500', dotColor: 'bg-slate-500' };
}

function getTrustScore(avgRating: number, successRate: number, totalJobs: number): { score: number; label: string; color: string; barColor: string } {
    // Weighted: 40% rating (normalized to 100), 40% success rate, 20% job volume (capped at 100 jobs)
    const ratingNorm = (avgRating / 5) * 100;
    const jobNorm = Math.min(totalJobs / 100, 1) * 100;
    const score = Math.round(ratingNorm * 0.4 + successRate * 0.4 + jobNorm * 0.2);

    if (totalJobs < 3) return { score, label: 'New', color: 'text-slate-400', barColor: 'bg-slate-500' };
    if (score >= 80) return { score, label: 'Highly Trusted', color: 'text-emerald-400', barColor: 'bg-emerald-500' };
    if (score >= 50) return { score, label: 'Trusted', color: 'text-amber-400', barColor: 'bg-amber-500' };
    return { score, label: 'Building Trust', color: 'text-orange-400', barColor: 'bg-orange-500' };
}

function AgentCard({ agent, rank, onHire, onShowDetail, isBrowseMode = false }: AgentCardProps) {
    const a = agent.agent;
    const catColor = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.analytics;
    const trust = getTrustScore(a.avgRating, a.successRate, a.totalJobs);
    const agentStatus = getAgentStatus(a);

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Hire ${a.name} - ${a.category} agent, ${a.basePrice} alphaUSD`}
            className={`relative bg-white/[0.03] border rounded-2xl p-4 flex flex-col transition-all duration-200 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                rank === 0 && !isBrowseMode
                    ? 'border-indigo-500/30 bg-indigo-500/[0.04]'
                    : 'border-white/[0.10] hover:border-indigo-500/25 hover:bg-white/[0.05]'
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
                <span className="shrink-0 w-9 h-9 flex items-center justify-center bg-white/[0.04] rounded-xl overflow-hidden">
                    {a.avatarUrl ? (
                        <img src={a.avatarUrl} alt={a.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                        <span className="text-2xl">{a.avatarEmoji}</span>
                    )}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h4 className="text-white font-semibold text-sm truncate">{a.name}</h4>
                        {a.isVerified && (
                            <CheckBadgeIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                        {/* Online/Offline status */}
                        <span className="flex items-center gap-1 shrink-0" title={agentStatus.label}>
                            <span className={`w-1.5 h-1.5 rounded-full ${agentStatus.dotColor} ${agentStatus.status === 'online' ? 'animate-pulse' : ''}`} />
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${agentStatus.color}`}>{agentStatus.label}</span>
                        </span>
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

            {/* Trust Score Bar */}
            <div className="mb-2.5">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500 font-medium">Trust Score</span>
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold ${trust.color}`}>{trust.score}%</span>
                        <span className={`text-[9px] font-semibold ${trust.color}`}>{trust.label}</span>
                    </div>
                </div>
                <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${trust.barColor}`}
                        style={{ width: `${trust.score}%` }}
                    />
                </div>
            </div>

            {/* Row 4: Description */}
            <p className="text-[11px] text-slate-400/80 leading-relaxed mb-3 flex-1 line-clamp-2">
                {isBrowseMode ? a.description : (agent.relevanceScore > 0 ? agent.reasoning : a.description)}
            </p>

            {/* Footer: Price + Actions */}
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between mt-auto">
                <div className="flex items-baseline gap-1">
                    <span className="text-white font-bold text-base">{a.basePrice}</span>
                    <span className="text-[10px] text-slate-500">alphaUSD</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {onShowDetail && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onShowDetail(agent); }}
                            className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.10] text-slate-500 hover:text-indigo-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="View details"
                        >
                            <InformationCircleIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onHire(agent); }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1 opacity-80 group-hover:opacity-100"
                    >
                        Hire <ArrowRightIcon className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(AgentCard);
