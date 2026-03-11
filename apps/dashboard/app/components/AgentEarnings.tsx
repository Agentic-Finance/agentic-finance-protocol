'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    ArrowPathIcon, CpuChipIcon, TrophyIcon, BanknotesIcon,
    CheckBadgeIcon, ChevronRightIcon,
} from '@/app/components/icons';
import AgentDetailModal from './omni/AgentDetailModal';
import type { DiscoveredAgent } from '../hooks/useAgentMarketplace';

/* ── Types ─────────────────────────────────────────────────────── */

interface FullAgentData {
    id: string;
    name: string;
    description: string;
    category: string;
    skills: string[];
    basePrice: number;
    ownerWallet: string;
    avatarEmoji: string;
    avatarUrl?: string | null;
    isVerified: boolean;
    totalJobs: number;
    successRate: number;
    avgRating: number;
    ratingCount: number;
    responseTime: number;
    source?: string;
    sourceUrl?: string;
    nativeAgentId?: string | null;
    webhookUrl?: string | null;
}

interface AgentEarning {
    agentId: string;
    agentName: string;
    avatarEmoji: string;
    category: string;
    totalEarnings: number;
    completedJobs: number;
    totalJobs: number;
    successRate: number;
    avgJobValue: number;
    fullAgent: FullAgentData;
}

interface GlobalEarnings {
    totalEarnings: number;
    completedJobs: number;
    totalJobs: number;
    totalBudget: number;
}

interface AgentEarningsProps {
    walletAddress?: string | null;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function extractFullAgent(agent: any): FullAgentData {
    return {
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        category: agent.category,
        skills: Array.isArray(agent.skills)
            ? agent.skills
            : typeof agent.skills === 'string'
                ? (() => { try { return JSON.parse(agent.skills); } catch { return []; } })()
                : [],
        basePrice: agent.basePrice ?? 0,
        ownerWallet: agent.ownerWallet || '',
        avatarEmoji: agent.avatarEmoji || '',
        avatarUrl: agent.avatarUrl || null,
        isVerified: agent.isVerified ?? false,
        totalJobs: agent.totalJobs ?? 0,
        successRate: agent.successRate ?? 0,
        avgRating: agent.avgRating ?? 0,
        ratingCount: agent.ratingCount ?? 0,
        responseTime: agent.responseTime ?? 0,
        source: agent.source,
        sourceUrl: agent.sourceUrl || undefined,
        nativeAgentId: agent.nativeAgentId,
        webhookUrl: agent.webhookUrl,
    };
}

/* ── Main Component ────────────────────────────────────────────── */

function AgentEarnings({ walletAddress }: AgentEarningsProps) {
    const [globalEarnings, setGlobalEarnings] = useState<GlobalEarnings | null>(null);
    const [agentEarnings, setAgentEarnings] = useState<AgentEarning[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detailAgent, setDetailAgent] = useState<DiscoveredAgent | null>(null);

    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [earningsResult, jobsResult] = await Promise.allSettled([
                fetch('/api/marketplace/earnings'),
                fetch('/api/marketplace/jobs'),
            ]);

            let globalData: GlobalEarnings | null = null;
            let jobs: any[] = [];

            if (earningsResult.status === 'fulfilled') {
                if (earningsResult.value.ok) {
                    try { globalData = await earningsResult.value.json(); } catch (e) { console.error('Failed to parse earnings', e); }
                } else {
                    console.error('Earnings fetch failed:', earningsResult.value.status);
                }
            } else {
                console.error('Earnings fetch error:', earningsResult.reason);
            }

            if (jobsResult.status === 'fulfilled') {
                if (jobsResult.value.ok) {
                    try {
                        const jobsData = await jobsResult.value.json();
                        jobs = jobsData.jobs || [];
                    } catch (e) { console.error('Failed to parse jobs', e); }
                } else {
                    console.error('Jobs fetch failed:', jobsResult.value.status);
                }
            } else {
                console.error('Jobs fetch error:', jobsResult.reason);
            }

            if (globalData === null && jobs.length === 0) {
                setError('Unable to load earnings data. Please try again.');
            }

            // Group by agent — preserve full agent data for modal
            const agentMap = new Map<string, {
                agentId: string; agentName: string; avatarEmoji: string; category: string;
                totalEarnings: number; completedJobs: number; totalJobs: number;
                fullAgent: FullAgentData;
            }>();

            for (const job of jobs) {
                const key = job.agentId;
                const full = extractFullAgent(job.agent);

                if (!agentMap.has(key)) {
                    agentMap.set(key, {
                        agentId: key,
                        agentName: full.name,
                        avatarEmoji: full.avatarEmoji,
                        category: full.category,
                        totalEarnings: 0,
                        completedJobs: 0,
                        totalJobs: 0,
                        fullAgent: full,
                    });
                } else {
                    // Always update to latest agent metadata (fixes avatar mismatch)
                    const entry = agentMap.get(key)!;
                    entry.agentName = full.name;
                    entry.avatarEmoji = full.avatarEmoji;
                    entry.fullAgent = full;
                }

                const entry = agentMap.get(key)!;
                entry.totalJobs++;
                if (job.status === 'COMPLETED' || job.status === 'SETTLED') {
                    entry.completedJobs++;
                    entry.totalEarnings += job.negotiatedPrice || job.budget || 0;
                }
            }

            const earnings: AgentEarning[] = Array.from(agentMap.values())
                .map(e => ({
                    ...e,
                    successRate: e.totalJobs > 0 ? Math.round((e.completedJobs / e.totalJobs) * 100) : 0,
                    avgJobValue: e.completedJobs > 0 ? Math.round(e.totalEarnings / e.completedJobs * 10) / 10 : 0,
                }))
                .sort((a, b) => b.totalEarnings - a.totalEarnings);

            setAgentEarnings(earnings);
        } catch (err) {
            console.error('Failed to fetch earnings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

    /* ── Click → Detail Modal ──────────────────────────────────── */

    const openAgentDetail = useCallback((agent: AgentEarning) => {
        const discovered: DiscoveredAgent = {
            agentId: agent.agentId,
            relevanceScore: 0,
            reasoning: '',
            agent: agent.fullAgent,
        };
        setDetailAgent(discovered);
    }, []);

    const handleSubmitTask = useCallback((agent: DiscoveredAgent, task: string) => {
        setDetailAgent(null);
        // Dispatch event to OmniTerminal → switch to A2A tab + select agent + start negotiation
        window.dispatchEvent(new CustomEvent('paypol:hireAgent', { detail: { agent, task } }));
        // Scroll to OmniTerminal
        document.querySelector('[data-section="omni-terminal"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    /* ── Derived values ────────────────────────────────────────── */

    const topEarner = agentEarnings[0];
    const platformFeeRate = 0.08;
    const platformRevenue = globalEarnings ? globalEarnings.totalEarnings * platformFeeRate : 0;

    return (
        <div className="border border-white/[0.08] rounded-2xl bg-[#0C1017] overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.04), transparent 60%)' }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <BanknotesIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Agent Earnings</h3>
                        <p className="text-[10px] text-slate-500">Revenue breakdown by agent</p>
                    </div>
                </div>
                <button
                    onClick={fetchEarnings}
                    className="p-2 rounded-lg hover:bg-white/[0.04] text-slate-500 hover:text-emerald-400 transition-all"
                    title="Refresh"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Error state */}
            {error && (
                <div className="mx-5 mt-3 mb-2">
                    <p className="text-rose-400 text-xs">{error}</p>
                </div>
            )}

            {/* Global Stats */}
            {globalEarnings && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04]">
                    <StatCell label="Total Revenue" value={`${globalEarnings.totalEarnings.toFixed(1)}`} unit="alphaUSD" color="text-emerald-400" />
                    <StatCell label="Completed Jobs" value={String(globalEarnings.completedJobs)} color="text-white" />
                    <StatCell label="Platform Fee (8%)" value={`${platformRevenue.toFixed(1)}`} unit="alphaUSD" color="text-amber-400" />
                    <StatCell label="Active Agents" value={String(agentEarnings.length)} color="text-indigo-400" />
                </div>
            )}

            {/* Top Earner Highlight */}
            {topEarner && topEarner.totalEarnings > 0 && (
                <div
                    onClick={() => openAgentDetail(topEarner)}
                    className="mx-5 mt-4 p-4 bg-gradient-to-r from-amber-500/[0.06] to-emerald-500/[0.06] border border-amber-500/15 rounded-xl cursor-pointer hover:border-amber-500/30 hover:from-amber-500/[0.08] hover:to-emerald-500/[0.08] transition-all duration-200 group"
                >
                    <div className="flex items-center gap-3">
                        <TrophyIcon className="w-5 h-5 text-amber-400 shrink-0" />
                        <span className="w-8 h-8 flex items-center justify-center bg-white/[0.06] rounded-xl text-lg shrink-0 group-hover:scale-110 transition-transform">
                            {topEarner.fullAgent.avatarUrl ? (
                                <img src={topEarner.fullAgent.avatarUrl} alt={topEarner.agentName} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                topEarner.avatarEmoji
                            )}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-400">Top Earner</p>
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">{topEarner.agentName}</p>
                                {topEarner.fullAgent.isVerified && <CheckBadgeIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-base font-bold text-emerald-400 tabular-nums">{topEarner.totalEarnings.toFixed(1)}</p>
                            <p className="text-[9px] text-slate-500">alphaUSD earned</p>
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                </div>
            )}

            {/* Agent Breakdown */}
            <div className="p-5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Per-Agent Breakdown</h4>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Loading earnings...</p>
                    </div>
                ) : agentEarnings.length === 0 ? (
                    <div className="text-center py-8">
                        <CpuChipIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No earnings data yet</p>
                        <p className="text-xs text-slate-600 mt-1">Agents earn revenue when jobs are completed</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {agentEarnings.map((agent, idx) => {
                            const maxEarnings = agentEarnings[0].totalEarnings || 1;
                            const barWidth = Math.max(5, (agent.totalEarnings / maxEarnings) * 100);
                            const rankColor = idx === 0
                                ? 'text-amber-400'
                                : idx === 1
                                    ? 'text-slate-300'
                                    : idx === 2
                                        ? 'text-amber-600'
                                        : 'text-slate-600';

                            return (
                                <div
                                    key={agent.agentId}
                                    onClick={() => openAgentDetail(agent)}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.06] transition-all duration-200 cursor-pointer group"
                                >
                                    <span className={`text-[10px] font-bold w-5 text-right shrink-0 tabular-nums ${rankColor}`}>
                                        #{idx + 1}
                                    </span>
                                    <span className="w-8 h-8 flex items-center justify-center bg-white/[0.04] rounded-xl text-lg shrink-0 group-hover:scale-110 transition-transform">
                                        {agent.fullAgent.avatarUrl ? (
                                            <img src={agent.fullAgent.avatarUrl} alt={agent.agentName} className="w-full h-full object-cover rounded-xl" />
                                        ) : (
                                            agent.avatarEmoji
                                        )}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                                                {agent.agentName}
                                            </span>
                                            {agent.fullAgent.isVerified && (
                                                <CheckBadgeIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                            )}
                                            <span className="text-[8px] text-slate-500 capitalize bg-white/[0.04] px-1.5 py-0.5 rounded">
                                                {agent.category}
                                            </span>
                                        </div>
                                        {/* Earnings bar */}
                                        <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 tabular-nums">
                                            <span>{agent.completedJobs}/{agent.totalJobs} jobs</span>
                                            <span>{agent.successRate}% success</span>
                                            <span>avg {agent.avgJobValue} alphaUSD/job</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-emerald-400 tabular-nums">{agent.totalEarnings.toFixed(1)}</p>
                                        <p className="text-[9px] text-slate-500">alphaUSD</p>
                                    </div>
                                    <ChevronRightIcon className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Agent Detail Modal — unified with task input */}
            {detailAgent && (
                <AgentDetailModal
                    agent={detailAgent}
                    isOpen={!!detailAgent}
                    onClose={() => setDetailAgent(null)}
                    onSubmitTask={handleSubmitTask}
                />
            )}
        </div>
    );
}

/* ── Sub-components ────────────────────────────────────────────── */

function StatCell({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
    return (
        <div className="bg-[#0C1017] px-4 py-3.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
            <p className={`text-lg font-bold tabular-nums ${color}`}>
                {value}
                {unit && <span className="text-[10px] text-slate-500 ml-1 font-normal">{unit}</span>}
            </p>
        </div>
    );
}

export default React.memo(AgentEarnings);
