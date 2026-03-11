'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    ArrowRightIcon, ArrowLeftIcon, CheckBadgeIcon, ClockIcon,
    CpuChipIcon, BoltIcon, ChartBarIcon, ChevronDownIcon, ChevronUpIcon,
    StarIcon,
} from '@/app/components/icons';
import type { DiscoveredAgent } from '../../hooks/useAgentMarketplace';

interface TaskPromptPanelProps {
    agent: DiscoveredAgent;
    onSubmit: (taskPrompt: string) => void;
    onBack: () => void;
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

function TaskPromptPanel({ agent, onSubmit, onBack }: TaskPromptPanelProps) {
    const [task, setTask] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'reviews'>('overview');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [showFullDetail, setShowFullDetail] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const a = agent.agent;
    const catColor = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.analytics;
    const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(a.avgRating));

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // Fetch reviews on mount
    useEffect(() => {
        setLoadingReviews(true);
        fetch(`/api/marketplace/reviews?agentId=${a.id}`)
            .then(r => r.json())
            .then(data => setReviews(data.reviews || []))
            .catch(() => setReviews([]))
            .finally(() => setLoadingReviews(false));
    }, [a.id]);

    const handleSubmit = () => {
        if (task.trim().length < 3) return;
        onSubmit(task.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="mt-4 bg-[#141926] border border-indigo-500/20 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500" />

            {/* ── Agent Header ── */}
            <div className="p-5 pb-3 border-b border-white/[0.10]">
                <div className="flex items-start gap-3.5">
                    <span className="shrink-0 w-12 h-12 flex items-center justify-center bg-white/[0.04] rounded-2xl overflow-hidden">
                        {a.avatarUrl ? (
                            <img src={a.avatarUrl} alt={a.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                            <span className="text-2xl">{a.avatarEmoji}</span>
                        )}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-lg font-bold text-white truncate">{a.name}</h3>
                            {a.isVerified && <CheckBadgeIcon className="w-4.5 h-4.5 text-indigo-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${catColor}`}>
                                {a.category}
                            </span>
                            <span className="flex items-center gap-0.5 text-[11px]">
                                {stars.map((filled, i) => (
                                    <StarIcon key={i} className={`w-3 h-3 ${filled ? 'text-amber-400' : 'text-slate-700'}`} />
                                ))}
                                <span className="text-white font-semibold ml-0.5">{a.avgRating}</span>
                                <span className="text-slate-500">({a.ratingCount})</span>
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <ClockIcon className="w-3 h-3" /> ~{a.responseTime}s
                            </span>
                            <span className="text-indigo-400 font-bold text-[11px]">{a.basePrice} alphaUSD</span>
                        </div>
                    </div>
                    {/* Toggle detail section */}
                    <button
                        onClick={() => setShowFullDetail(v => !v)}
                        className="shrink-0 p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-slate-300 transition-all"
                        title={showFullDetail ? 'Collapse details' : 'Expand details'}
                    >
                        {showFullDetail ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* ── Collapsible Agent Detail ── */}
            {showFullDetail && (
                <div className="border-b border-white/[0.10] animate-in fade-in duration-300">
                    {/* Tabs */}
                    <div className="flex border-b border-white/[0.04] px-5">
                        {(['overview', 'reviews'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2.5 text-[11px] font-semibold transition-all border-b-2 ${
                                    activeTab === tab
                                        ? 'text-indigo-400 border-indigo-500'
                                        : 'text-slate-500 border-transparent hover:text-slate-300'
                                }`}
                            >
                                {tab === 'overview' ? 'Overview' : `Reviews (${reviews.length})`}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="px-5 py-4 max-h-[280px] overflow-y-auto scrollbar-hide">
                        {activeTab === 'overview' && (
                            <div className="space-y-4">
                                {/* Description */}
                                <div>
                                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Description</h4>
                                    <p className="text-[12px] text-slate-300 leading-relaxed">{a.description}</p>
                                </div>

                                {/* Skills */}
                                {a.skills && a.skills.length > 0 && (
                                    <div>
                                        <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Skills</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {a.skills.map((skill, i) => (
                                                <span key={i} className="text-[10px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.10]">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Performance Stats */}
                                <div>
                                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Performance</h4>
                                    <div className="grid grid-cols-4 gap-2">
                                        <MiniStat icon={<ChartBarIcon className="w-3.5 h-3.5 text-indigo-400" />} label="Jobs" value={String(a.totalJobs)} />
                                        <MiniStat icon={<BoltIcon className="w-3.5 h-3.5 text-emerald-400" />} label="Success" value={`${a.successRate}%`} />
                                        <MiniStat icon={<StarIcon className="w-3.5 h-3.5 text-amber-400" />} label="Rating" value={String(a.avgRating)} />
                                        <MiniStat icon={<ClockIcon className="w-3.5 h-3.5 text-cyan-400" />} label="Avg Time" value={`${a.responseTime}s`} />
                                    </div>
                                </div>

                                {/* Agent Info */}
                                <div className="text-[11px] space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Source</span>
                                        <span className="text-slate-400 capitalize">{a.source || 'native'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Owner</span>
                                        <span className="text-slate-400 font-mono text-[10px]">{a.ownerWallet.slice(0, 10)}...{a.ownerWallet.slice(-6)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="space-y-2.5">
                                {loadingReviews ? (
                                    <div className="text-center py-6">
                                        <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                                        <p className="text-[11px] text-slate-500">Loading reviews...</p>
                                    </div>
                                ) : reviews.length === 0 ? (
                                    <div className="text-center py-6">
                                        <StarIcon className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                                        <p className="text-[12px] text-slate-400">No reviews yet</p>
                                        <p className="text-[10px] text-slate-600 mt-0.5">Be the first to hire and review this agent</p>
                                    </div>
                                ) : (
                                    reviews.map(review => (
                                        <div key={review.id} className="p-2.5 bg-white/[0.04] border border-white/[0.05] rounded-xl">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex">
                                                    {Array.from({ length: 5 }, (_, i) => (
                                                        <StarIcon key={i} className={`w-2.5 h-2.5 ${i < review.rating ? 'text-amber-400' : 'text-slate-700'}`} />
                                                    ))}
                                                </div>
                                                <span className="text-[9px] text-slate-600 font-mono">
                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {review.comment && (
                                                <p className="text-[11px] text-slate-400 leading-relaxed">{review.comment}</p>
                                            )}
                                            {review.job?.prompt && (
                                                <p className="text-[9px] text-slate-600 mt-1 font-mono truncate">
                                                    Task: {review.job.prompt}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Task Input Section ── */}
            <div className="p-5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">
                    What do you need this agent to do?
                </label>
                <textarea
                    ref={textareaRef}
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`e.g. "${a.skills?.[0] ? `Help me with ${a.skills[0].toLowerCase()}` : 'Describe your task here...'}"`}
                    className="w-full bg-black/30 border border-white/[0.10] rounded-xl p-3 text-white text-sm placeholder:text-slate-600 outline-none focus:border-indigo-500/30 resize-none transition-colors min-h-[80px]"
                    rows={3}
                />

                {/* Actions */}
                <div className="flex items-center justify-between mt-3">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-4 py-2 text-slate-500 hover:text-slate-300 text-[11px] font-semibold transition-all"
                    >
                        <ArrowLeftIcon className="w-3 h-3" /> Back to Catalog
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={task.trim().length < 3}
                        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            task.trim().length >= 3
                                ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                : 'bg-white/[0.03] text-slate-600 cursor-not-allowed'
                        }`}
                    >
                        Start Negotiation <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="p-2 bg-white/[0.04] border border-white/[0.05] rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
                {icon}
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-600">{label}</span>
            </div>
            <p className="text-sm font-bold text-white">{value}</p>
        </div>
    );
}

export default React.memo(TaskPromptPanel);
