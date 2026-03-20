'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    ClockIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon,
    BriefcaseIcon, ChevronDownIcon, ChevronUpIcon,
    ArrowTopRightOnSquareIcon, CpuChipIcon, StarIcon,
} from '@/app/components/icons';

const EXPLORER = 'https://explore.moderato.tempo.xyz';

interface Job {
    id: string;
    agentId: string;
    clientWallet: string;
    prompt: string;
    taskDescription?: string;
    status: string;
    result?: string;
    executionTime?: number;
    negotiatedPrice?: number;
    platformFee?: number;
    budget: number;
    token: string;
    commitTxHash?: string;
    verifyTxHash?: string;
    escrowTxHash?: string;
    createdAt: string;
    completedAt?: string;
    agent: {
        id: string;
        name: string;
        avatarEmoji: string;
        category: string;
        successRate: number;
    };
}

interface JobHistoryProps {
    walletAddress?: string | null;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    MATCHED: { icon: <ClockIcon className="w-3.5 h-3.5" />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Matched' },
    ESCROW_LOCKED: { icon: <ClockIcon className="w-3.5 h-3.5" />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Escrowed' },
    EXECUTING: { icon: <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', label: 'Executing' },
    COMPLETED: { icon: <CheckCircleIcon className="w-3.5 h-3.5" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Completed' },
    SETTLED: { icon: <CheckCircleIcon className="w-3.5 h-3.5" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Settled' },
    FAILED: { icon: <XCircleIcon className="w-3.5 h-3.5" />, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', label: 'Failed' },
    DISPUTED: { icon: <XCircleIcon className="w-3.5 h-3.5" />, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', label: 'Disputed' },
    REFUNDED: { icon: <ArrowPathIcon className="w-3.5 h-3.5" />, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', label: 'Refunded' },
};

function JobHistory({ walletAddress }: JobHistoryProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedJob, setExpandedJob] = useState<string | null>(null);

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const url = walletAddress
                ? `/api/marketplace/jobs?wallet=${walletAddress}`
                : '/api/marketplace/jobs';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs || []);
            }
        } catch (err) {
            console.error('Failed to fetch job history:', err);
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    // Stats
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED' || j.status === 'SETTLED').length;
    const totalSpent = jobs
        .filter(j => j.status === 'COMPLETED' || j.status === 'SETTLED')
        .reduce((sum, j) => sum + (j.negotiatedPrice || j.budget || 0), 0);

    return (
        <div className="border border-white/[0.08] rounded-2xl bg-[#0C1017] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <BriefcaseIcon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Agent Job History</h3>
                        <p className="text-[10px] text-slate-500">All your agent marketplace interactions</p>
                    </div>
                </div>
                <button
                    onClick={fetchJobs}
                    className="p-2 rounded-lg hover:bg-white/[0.04] text-slate-500 hover:text-indigo-400 transition-all"
                    title="Refresh"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-px bg-white/[0.04]">
                <div className="bg-[#0C1017] px-4 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Total Jobs</p>
                    <p className="text-lg font-bold text-white">{totalJobs}</p>
                </div>
                <div className="bg-[#0C1017] px-4 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Completed</p>
                    <p className="text-lg font-bold text-emerald-400">{completedJobs}</p>
                </div>
                <div className="bg-[#0C1017] px-4 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Total Spent</p>
                    <p className="text-lg font-bold text-white">{totalSpent.toFixed(1)} <span className="text-xs text-slate-500">alphaUSD</span></p>
                </div>
            </div>

            {/* Job List */}
            <div className="divide-y divide-white/[0.04] max-h-[500px] overflow-y-auto scrollbar-hide">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Loading jobs...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-12 px-6">
                        <CpuChipIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 font-medium">No jobs yet</p>
                        <p className="text-xs text-slate-600 mt-1">Hire an agent from the Marketplace to get started</p>
                    </div>
                ) : (
                    jobs.map(job => {
                        const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.MATCHED;
                        const isExpanded = expandedJob === job.id;

                        return (
                            <div key={job.id} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                                <div
                                    className="flex items-center gap-3 cursor-pointer"
                                    onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                                >
                                    <span className="text-xl shrink-0">{job.agent.avatarEmoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white truncate">{job.agent.name}</span>
                                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusCfg.color}`}>
                                                {statusCfg.icon} {statusCfg.label}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{job.prompt}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-white">{(job.negotiatedPrice || job.budget).toFixed(1)}</p>
                                        <p className="text-[9px] text-slate-500">{job.token}</p>
                                    </div>
                                    {isExpanded
                                        ? <ChevronUpIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                        : <ChevronDownIcon className="w-4 h-4 text-slate-600 shrink-0" />
                                    }
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="mt-3 ml-9 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Created</span>
                                                <span className="text-slate-300">{new Date(job.createdAt).toLocaleString()}</span>
                                            </div>
                                            {job.completedAt && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Completed</span>
                                                    <span className="text-slate-300">{new Date(job.completedAt).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {job.executionTime != null && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Execution Time</span>
                                                    <span className="text-emerald-400 font-semibold">{job.executionTime}s</span>
                                                </div>
                                            )}
                                            {job.platformFee != null && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Platform Fee</span>
                                                    <span className="text-slate-300">{job.platformFee.toFixed(2)} alphaUSD</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* TX Links */}
                                        <div className="flex flex-wrap gap-2">
                                            {job.commitTxHash && (
                                                <a href={`${EXPLORER}/tx/${job.commitTxHash}`} target="_blank" rel="noopener noreferrer"
                                                    className="text-[10px] text-violet-400/70 hover:text-violet-400 font-mono flex items-center gap-1 transition-colors">
                                                    Commit TX <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                                </a>
                                            )}
                                            {job.verifyTxHash && (
                                                <a href={`${EXPLORER}/tx/${job.verifyTxHash}`} target="_blank" rel="noopener noreferrer"
                                                    className="text-[10px] text-violet-400/70 hover:text-violet-400 font-mono flex items-center gap-1 transition-colors">
                                                    Verify TX <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                                </a>
                                            )}
                                            {job.escrowTxHash && (
                                                <a href={`${EXPLORER}/tx/${job.escrowTxHash}`} target="_blank" rel="noopener noreferrer"
                                                    className="text-[10px] text-emerald-400/70 hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors">
                                                    Escrow TX <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>

                                        {/* Result Preview */}
                                        {job.result && (
                                            <div className="bg-black/30 rounded-lg p-2.5 text-[11px] text-slate-400 font-mono max-h-24 overflow-y-auto scrollbar-hide leading-relaxed">
                                                {(() => {
                                                    try {
                                                        const parsed = JSON.parse(job.result);
                                                        return parsed.output || parsed.error || JSON.stringify(parsed, null, 2).slice(0, 300);
                                                    } catch { return job.result.slice(0, 300); }
                                                })()}
                                            </div>
                                        )}

                                        <p className="text-[9px] text-slate-600 font-mono">Job ID: {job.id}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default React.memo(JobHistory);
