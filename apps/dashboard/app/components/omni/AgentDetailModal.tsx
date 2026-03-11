'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    XMarkIcon, CheckBadgeIcon, StarIcon, StarIcon as StarSolid, ClockIcon,
    CpuChipIcon, BoltIcon, ArrowRightIcon, ChartBarIcon,
} from '@/app/components/icons';
import type { DiscoveredAgent } from '../../hooks/useAgentMarketplace';

interface AgentDetailModalProps {
    agent: DiscoveredAgent;
    isOpen: boolean;
    onClose: () => void;
    onHire?: (agent: DiscoveredAgent) => void;
    onSubmitTask?: (agent: DiscoveredAgent, task: string) => void;
}

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    job?: { prompt: string; clientWallet: string };
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

function AgentDetailModal({ agent, isOpen, onClose, onHire, onSubmitTask }: AgentDetailModalProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'reviews'>('overview');
    const [task, setTask] = useState('');
    const taskRef = useRef<HTMLTextAreaElement>(null);
    const a = agent.agent;
    const catColor = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.analytics;

    const hasTaskInput = !!onSubmitTask;

    const handleSubmit = useCallback(() => {
        if (!onSubmitTask || task.trim().length < 3) return;
        onSubmitTask(agent, task.trim());
        onClose();
    }, [agent, task, onSubmitTask, onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    useEffect(() => {
        if (!isOpen) return;
        setLoadingReviews(true);
        fetch(`/api/marketplace/reviews?agentId=${a.id}`)
            .then(r => r.json())
            .then(data => setReviews(data.reviews || []))
            .catch(() => setReviews([]))
            .finally(() => setLoadingReviews(false));
    }, [isOpen, a.id]);

    if (!isOpen) return null;

    const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(a.avgRating));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-[#0C1017] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/[0.06]">
                    <div className="flex items-start gap-4">
                        <span className="w-14 h-14 flex items-center justify-center bg-white/[0.04] rounded-2xl text-3xl shrink-0">
                            {a.avatarUrl ? (
                                <img src={a.avatarUrl} alt={a.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                a.avatarEmoji
                            )}
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-bold text-white truncate">{a.name}</h2>
                                {a.isVerified && <CheckBadgeIcon className="w-5 h-5 text-indigo-400 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${catColor}`}>
                                    {a.category}
                                </span>
                                <span className="flex items-center gap-1 text-[11px]">
                                    {stars.map((filled, i) => (
                                        <StarSolid key={i} className={`w-3 h-3 ${filled ? 'text-amber-400' : 'text-slate-700'}`} />
                                    ))}
                                    <span className="text-white font-semibold ml-0.5">{a.avgRating}</span>
                                    <span className="text-slate-500">({a.ratingCount})</span>
                                </span>
                                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <ClockIcon className="w-3 h-3" />
                                    ~{a.responseTime}s
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/[0.04] px-6">
                    {(['overview', 'reviews'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-xs font-semibold transition-all border-b-2 ${
                                activeTab === tab
                                    ? 'text-indigo-400 border-indigo-500'
                                    : 'text-slate-500 border-transparent hover:text-slate-300'
                            }`}
                        >
                            {tab === 'overview' ? 'Overview' : `Reviews (${reviews.length})`}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[50vh] p-6 scrollbar-hide">
                    {activeTab === 'overview' && (
                        <div className="space-y-5">
                            {/* Description */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Description</h4>
                                <p className="text-sm text-slate-300 leading-relaxed">{a.description}</p>
                            </div>

                            {/* Skills */}
                            {a.skills && a.skills.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Skills</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {a.skills.map((skill, i) => (
                                            <span key={i} className="text-[11px] text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Performance</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <StatCard icon={<ChartBarIcon className="w-4 h-4 text-indigo-400" />} label="Total Jobs" value={String(a.totalJobs)} />
                                    <StatCard icon={<BoltIcon className="w-4 h-4 text-emerald-400" />} label="Success Rate" value={`${a.successRate}%`} />
                                    <StatCard icon={<StarSolid className="w-4 h-4 text-amber-400" />} label="Avg Rating" value={String(a.avgRating)} />
                                    <StatCard icon={<ClockIcon className="w-4 h-4 text-cyan-400" />} label="Avg Time" value={`${a.responseTime}s`} />
                                </div>
                            </div>

                            {/* Source Info */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Agent Info</h4>
                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Source</span>
                                        <span className="text-slate-300 capitalize">{a.source || 'native'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Base Price</span>
                                        <span className="text-white font-bold">{a.basePrice} ALPHA</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Owner</span>
                                        <span className="text-slate-300 font-mono text-[10px]">{a.ownerWallet.slice(0, 10)}...{a.ownerWallet.slice(-6)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="space-y-3">
                            {loadingReviews ? (
                                <div className="text-center py-8">
                                    <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-slate-500">Loading reviews...</p>
                                </div>
                            ) : reviews.length === 0 ? (
                                <div className="text-center py-8">
                                    <StarSolid className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">No reviews yet</p>
                                    <p className="text-xs text-slate-600 mt-1">Be the first to hire and review this agent</p>
                                </div>
                            ) : (
                                reviews.map(review => (
                                    <div key={review.id} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="flex">
                                                {Array.from({ length: 5 }, (_, i) => (
                                                    <StarSolid key={i} className={`w-3 h-3 ${i < review.rating ? 'text-amber-400' : 'text-slate-700'}`} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-slate-600 font-mono">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {review.comment && (
                                            <p className="text-[12px] text-slate-400 leading-relaxed">{review.comment}</p>
                                        )}
                                        {review.job?.prompt && (
                                            <p className="text-[10px] text-slate-600 mt-1.5 font-mono truncate">
                                                Task: {review.job.prompt}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer: Task Input or Hire Button */}
                <div className="p-6 pt-4 border-t border-white/[0.06]">
                    {hasTaskInput ? (
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                                What do you need this agent to do?
                            </label>
                            <textarea
                                ref={taskRef}
                                value={task}
                                onChange={(e) => setTask(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={a.skills?.length ? `e.g. ${a.skills[0]} ...` : 'Describe your task...'}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 resize-none transition-colors"
                                rows={2}
                                autoFocus
                            />
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-bold text-white">{a.basePrice}</span>
                                    <span className="text-xs text-slate-500">ALPHA base</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-600">Ctrl+Enter</span>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={task.trim().length < 3}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                                    >
                                        <BoltIcon className="w-4 h-4" />
                                        Start Negotiation
                                        <ArrowRightIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : onHire ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-white">{a.basePrice}</span>
                                <span className="text-sm text-slate-500">ALPHA</span>
                            </div>
                            <button
                                onClick={() => { onHire(agent); onClose(); }}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                            >
                                <CpuChipIcon className="w-4 h-4" />
                                Hire Agent
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
            </div>
            <p className="text-lg font-bold text-white">{value}</p>
        </div>
    );
}

export default React.memo(AgentDetailModal);
