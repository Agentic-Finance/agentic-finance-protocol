'use client';

import React from 'react';

// ── Shared Types ────────────────────────────────────────────────

export interface MilestoneData {
    id: string;
    index: number;
    amount: number;
    deliverable: string;
    proofHash: string | null;
    status: string;
    submitTxHash: string | null;
    approveTxHash: string | null;
    rejectReason: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
}

export interface StreamData {
    id: string;
    clientWallet: string;
    agentWallet: string;
    agentName: string | null;
    totalBudget: number;
    releasedAmount: number;
    status: string;
    onChainStreamId: number | null;
    streamTxHash: string | null;
    deadline: string | null;
    milestones: MilestoneData[];
    createdAt: string;
}

export const EXPLORER = 'https://explore.moderato.tempo.xyz';

// ── Helpers ─────────────────────────────────────────────────────

export function getDaysRemaining(deadline: string | null): number | null {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getAgentEmoji(name: string | null): string {
    if (!name) return '\u{1F916}';
    const n = name.toLowerCase();
    if (n.includes('design')) return '\u{1F3A8}';
    if (n.includes('contract') || n.includes('guard') || n.includes('audit')) return '\u{1F6E1}\uFE0F';
    if (n.includes('data') || n.includes('forge') || n.includes('analytics')) return '\u{1F4CA}';
    if (n.includes('translate')) return '\u{1F310}';
    if (n.includes('treasury')) return '\u{1F4B0}';
    return '\u{1F916}';
}

export function getStreamStatusColor(status: string): string {
    return status === 'COMPLETED' ? '#10b981' : status === 'CANCELLED' ? '#ef4444' : '#818cf8';
}

export interface StatusConfig {
    bg: string; text: string; border: string; label: string; icon: string; glow: string;
}

export function getStatusConfig(status: string): StatusConfig {
    const map: Record<string, StatusConfig> = {
        PENDING:   { bg: 'rgba(100,116,139,0.08)', text: '#94a3b8', border: 'rgba(100,116,139,0.15)', label: 'Pending', icon: '\u23F3', glow: 'none' },
        SUBMITTED: { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)',  label: 'Submitted', icon: '\u{1F4E4}', glow: '0 0 12px rgba(245,158,11,0.15)' },
        APPROVED:  { bg: 'rgba(16,185,129,0.1)',  text: '#10b981', border: 'rgba(16,185,129,0.25)',  label: 'Approved', icon: '\u2705', glow: '0 0 12px rgba(16,185,129,0.15)' },
        REJECTED:  { bg: 'rgba(239,68,68,0.08)',  text: '#ef4444', border: 'rgba(239,68,68,0.2)',    label: 'Rejected', icon: '\u274C', glow: 'none' },
    };
    return map[status] || map.PENDING;
}

// ── StreamStatCards ─────────────────────────────────────────────

interface StatCardsProps {
    streams: StreamData[];
}

export function StreamStatCards({ streams }: StatCardsProps) {
    const activeCount = streams.filter(s => s.status === 'ACTIVE').length;
    const totalBudget = streams.reduce((sum, s) => sum + s.totalBudget, 0);
    const totalReleased = streams.reduce((sum, s) => sum + s.releasedAmount, 0);
    const pendingReview = streams.reduce((sum, s) => sum + s.milestones.filter(m => m.status === 'SUBMITTED').length, 0);
    const releasedPercent = totalBudget > 0 ? (totalReleased / totalBudget) * 100 : 0;

    const cards = [
        {
            label: 'Active Streams',
            value: activeCount,
            sub: `${streams.length} total`,
            color: '#818cf8',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={1.5} opacity={0.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9.172 14.828a4 4 0 010-5.656m5.656 0a4 4 0 010 5.656" />
                </svg>
            ),
        },
        {
            label: 'Total Volume',
            value: `${totalBudget.toLocaleString()}`,
            sub: 'aUSD locked',
            color: '#d946ef',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#d946ef" strokeWidth={1.5} opacity={0.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            fillBar: { percent: releasedPercent, label: `${totalReleased.toLocaleString()} released` },
        },
        {
            label: 'Pending Review',
            value: pendingReview,
            sub: 'milestones awaiting',
            color: '#f59e0b',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={1.5} opacity={0.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            pulse: pendingReview > 0,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {cards.map((c) => (
                <div key={c.label} className="relative group rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition-all overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${c.color}08, transparent 60%)` }}>
                    <div className="px-5 py-4 relative">
                        {/* Icon top-right */}
                        <div className="absolute top-4 right-4">{c.icon}</div>

                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
                        <div className="flex items-baseline gap-2">
                            {c.pulse && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0 mt-1" />
                            )}
                            <p className="text-2xl sm:text-3xl font-black tabular-nums" style={{ color: c.color }}>{c.value}</p>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1">{c.sub}</p>

                        {/* Optional fill bar */}
                        {c.fillBar && (
                            <div className="mt-3">
                                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${Math.max(c.fillBar.percent, 2)}%`, background: `linear-gradient(to right, ${c.color}, ${c.color}80)` }} />
                                </div>
                                <p className="text-[9px] text-slate-600 mt-1">{c.fillBar.label}</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── ActionBanner ────────────────────────────────────────────────

export function ActionBanner({ pendingCount }: { pendingCount: number }) {
    if (pendingCount === 0) return null;
    return (
        <div className="mb-6 px-5 py-4 rounded-2xl border border-amber-500/20"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.04), transparent 60%)', boxShadow: '0 0 30px rgba(245,158,11,0.06)' }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-bold text-amber-300">
                        {pendingCount} milestone{pendingCount > 1 ? 's' : ''} awaiting review
                    </span>
                </div>
                <span className="text-[10px] text-slate-500 hidden sm:block">Click a stream to review</span>
            </div>
        </div>
    );
}

// ── StreamPipelineCard ──────────────────────────────────────────

interface PipelineCardProps {
    stream: StreamData;
    index: number;
    onClick: () => void;
}

function shortDeliverable(d: string): string {
    return d.replace(/^Phase \d+:\s*/, '').replace(/^(Design|Build|Deploy|Test|Audit|Create|Implement|Review)\s+/i, '');
}

export function StreamPipelineCard({ stream, index, onClick }: PipelineCardProps) {
    const approvedCount = stream.milestones.filter(m => m.status === 'APPROVED').length;
    const hasReviewable = stream.milestones.some(m => m.status === 'SUBMITTED');
    const progressPercent = stream.totalBudget > 0 ? (stream.releasedAmount / stream.totalBudget) * 100 : 0;
    const statusColor = getStreamStatusColor(stream.status);
    const accentColor = hasReviewable ? '#f59e0b' : statusColor;
    const daysLeft = getDaysRemaining(stream.deadline);
    const agentEmoji = getAgentEmoji(stream.agentName);

    return (
        <button onClick={onClick} className="w-full text-left group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.003]">
            {/* Hover glow */}
            <div className="absolute -inset-[1px] rounded-[1.1rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(135deg, ${accentColor}30, transparent 60%)` }} />

            <div className="relative border rounded-2xl transition-all overflow-hidden"
                style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)', borderLeftWidth: '4px', borderLeftColor: accentColor }}>

                <div className="p-5">
                    {/* Row 1: Agent Info + Budget */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-white/[0.08] shrink-0"
                                style={{ background: `linear-gradient(135deg, ${accentColor}15, transparent)` }}>
                                {agentEmoji}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                                    {stream.agentName || stream.agentWallet.slice(0, 10) + '...'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] text-slate-500 font-mono">
                                        {new Date(stream.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </p>
                                    {daysLeft !== null && (
                                        <>
                                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                                            <p className={`text-[10px] font-bold ${daysLeft <= 3 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                {daysLeft === 0 ? 'Expired' : `${daysLeft}d left`}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-lg font-black text-white tabular-nums">
                                    {stream.totalBudget.toLocaleString()} <span className="text-[10px] font-bold text-slate-500">aUSD</span>
                                </p>
                            </div>
                            <span className="text-[9px] font-black px-2.5 py-1.5 rounded-lg border uppercase tracking-wider shrink-0"
                                style={{ color: statusColor, backgroundColor: `${statusColor}12`, borderColor: `${statusColor}30` }}>
                                {stream.status}
                            </span>
                        </div>
                    </div>

                    {/* Row 2: Milestone Pipeline */}
                    <div className="flex items-start py-3 overflow-x-auto scrollbar-hide">
                        {stream.milestones.map((m, i) => {
                            const mConfig = getStatusConfig(m.status);
                            const isLast = i === stream.milestones.length - 1;
                            return (
                                <React.Fragment key={m.id}>
                                    <div className="flex flex-col items-center shrink-0" style={{ minWidth: '56px' }}>
                                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all"
                                            style={{ borderColor: mConfig.text, backgroundColor: mConfig.bg, color: mConfig.text, boxShadow: mConfig.glow }}>
                                            {m.status === 'APPROVED' ? '\u2713' : m.status === 'SUBMITTED' ? '!' : m.status === 'REJECTED' ? '\u2715' : (i + 1)}
                                        </div>
                                        <span className="text-[8px] mt-1 text-slate-500 max-w-[60px] text-center truncate leading-tight">
                                            {shortDeliverable(m.deliverable)}
                                        </span>
                                        <span className="text-[9px] font-bold tabular-nums mt-0.5"
                                            style={{ color: m.status === 'APPROVED' ? '#10b981' : '#64748b' }}>
                                            {m.amount.toLocaleString()}
                                        </span>
                                    </div>
                                    {!isLast && (
                                        <div className="flex-1 min-w-[16px] h-[2px] mt-[15px] mx-1 rounded-full"
                                            style={{ background: m.status === 'APPROVED' ? 'linear-gradient(to right, #10b981, #10b98160)' : 'rgba(255,255,255,0.06)' }} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Row 3: Progress bar */}
                    <div className="pt-3 border-t border-white/[0.04]">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-slate-500">
                                <span className="font-bold text-slate-300">{approvedCount}</span>/{stream.milestones.length} completed
                            </span>
                            <div className="flex items-center gap-2">
                                {hasReviewable && (
                                    <span className="text-[9px] text-amber-400/80 font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        review needed
                                    </span>
                                )}
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    Details
                                    <svg className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.max(progressPercent, 2)}%`, background: 'linear-gradient(to right, #818cf8, #a855f7, #d946ef)' }} />
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
}

// ── StreamOverviewPanel (Detail View Left Sidebar) ──────────────

interface OverviewPanelProps {
    stream: StreamData;
    walletAddress: string;
    onCancel: () => void;
    isLoading: boolean;
}

export function StreamOverviewPanel({ stream, walletAddress, onCancel, isLoading }: OverviewPanelProps) {
    const isClient = walletAddress.toLowerCase() === stream.clientWallet.toLowerCase();
    const progressPercent = stream.totalBudget > 0 ? (stream.releasedAmount / stream.totalBudget) * 100 : 0;
    const approvedCount = stream.milestones.filter(m => m.status === 'APPROVED').length;
    const submittedCount = stream.milestones.filter(m => m.status === 'SUBMITTED').length;
    const daysLeft = getDaysRemaining(stream.deadline);
    const statusColor = getStreamStatusColor(stream.status);
    const agentEmoji = getAgentEmoji(stream.agentName);

    // SVG progress ring
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeOffset = circumference * (1 - progressPercent / 100);

    return (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at top, rgba(17,27,46,0.98) 0%, rgba(15,23,36,1) 100%)' }}>

            {/* Agent Header */}
            <div className="p-6 border-b border-white/[0.06]"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), transparent 50%)' }}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.12)]"
                        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))' }}>
                        {agentEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white truncate">
                            {stream.agentName || stream.agentWallet.slice(0, 12) + '...'}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            ID: {stream.id.slice(0, 8)}...
                        </p>
                    </div>
                </div>
                <span className="inline-flex text-[10px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-wider"
                    style={{ color: statusColor, backgroundColor: `${statusColor}12`, borderColor: `${statusColor}30`, boxShadow: `0 0 15px ${statusColor}10` }}>
                    {stream.status}
                </span>
            </div>

            {/* Progress Ring */}
            <div className="p-6 flex flex-col items-center border-b border-white/[0.06]">
                <svg width="130" height="130" className="mb-3 -rotate-90">
                    <defs>
                        <linearGradient id={`ring-grad-${stream.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="50%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#d946ef" />
                        </linearGradient>
                    </defs>
                    {/* Background circle */}
                    <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
                    {/* Progress arc */}
                    <circle cx="65" cy="65" r={radius} fill="none"
                        stroke={`url(#ring-grad-${stream.id})`}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out" />
                </svg>
                <span className="text-3xl font-black text-white">{progressPercent.toFixed(0)}%</span>
                <span className="text-[10px] text-slate-500 mt-1">Payment Progress</span>
                <div className="flex items-center gap-3 mt-2 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {approvedCount} done</span>
                    {submittedCount > 0 && (
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> {submittedCount} review</span>
                    )}
                </div>
            </div>

            {/* Budget Details */}
            <div className="p-6 space-y-3 border-b border-white/[0.06]">
                <DetailRow label="Total Budget" value={`${stream.totalBudget.toLocaleString()} aUSD`} />
                <DetailRow label="Released" value={`${stream.releasedAmount.toLocaleString()} aUSD`} color="#10b981" />
                <DetailRow label="Remaining" value={`${(stream.totalBudget - stream.releasedAmount).toLocaleString()} aUSD`} />
                <DetailRow
                    label="Deadline"
                    value={daysLeft === null ? 'N/A' : daysLeft === 0 ? 'Expired' : `${daysLeft} days left`}
                    color={daysLeft !== null && daysLeft <= 3 ? '#ef4444' : daysLeft !== null && daysLeft <= 7 ? '#f59e0b' : undefined}
                />
            </div>

            {/* Wallet Addresses */}
            <div className="p-6 space-y-2 text-[10px] text-slate-500">
                <div className="flex items-center justify-between">
                    <span className="text-slate-600">Client</span>
                    <span className="font-mono">{stream.clientWallet.slice(0, 8)}...{stream.clientWallet.slice(-4)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-600">Agent</span>
                    <span className="font-mono">{stream.agentWallet.slice(0, 8)}...{stream.agentWallet.slice(-4)}</span>
                </div>
                {stream.streamTxHash && (
                    <a href={`${EXPLORER}/tx/${stream.streamTxHash}`} target="_blank" rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 mt-2 transition-colors">
                        View On-Chain
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                )}
            </div>

            {/* Cancel Button */}
            {isClient && stream.status === 'ACTIVE' && (
                <div className="p-6 border-t border-white/[0.06]">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="w-full py-2.5 rounded-xl bg-red-500/[0.05] text-red-400/60 border border-red-500/10 hover:bg-red-500/10 hover:text-red-400 text-[11px] font-bold transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Cancelling...' : 'Cancel Stream'}
                    </button>
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-black tabular-nums" style={{ color: color || '#e2e8f0' }}>{value}</span>
        </div>
    );
}

// ── StreamPageSkeleton ──────────────────────────────────────────

export function StreamPageSkeleton() {
    return (
        <>
            {/* Stat cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-28 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                        <div className="p-5 space-y-3">
                            <div className="w-20 h-3 rounded pp-skeleton" />
                            <div className="w-16 h-8 rounded pp-skeleton" />
                            <div className="w-12 h-2 rounded pp-skeleton" />
                        </div>
                    </div>
                ))}
            </div>
            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl pp-skeleton" />
                                <div className="flex-1 space-y-2">
                                    <div className="w-32 h-4 rounded pp-skeleton" />
                                    <div className="w-20 h-3 rounded pp-skeleton" />
                                </div>
                                <div className="w-24 h-6 rounded pp-skeleton" />
                            </div>
                            <div className="flex items-center gap-2 py-2">
                                {[1, 2, 3].map(j => (
                                    <React.Fragment key={j}>
                                        <div className="w-8 h-8 rounded-full pp-skeleton shrink-0" />
                                        {j < 3 && <div className="flex-1 h-1 rounded-full pp-skeleton" />}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="w-full h-1.5 rounded-full pp-skeleton" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
