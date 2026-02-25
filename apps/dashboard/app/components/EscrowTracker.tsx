'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────

interface TrackerItem {
    jobId: string;
    agentName: string;
    agentEmoji: string;
    agentCategory: string;
    amount: number;
    negotiatedPrice: number | null;
    platformFee: number | null;
    token: string;
    status: string;
    onChainJobId: number | null;
    escrowTxHash: string | null;
    settleTxHash: string | null;
    deadline: string | null;
    disputeReason: string | null;
    createdAt: string;
    completedAt: string | null;
    prompt: string;
}

interface EscrowTrackerProps {
    walletAddress: string | null;
}

// ── Lifecycle Steps ───────────────────────────────────────

const LIFECYCLE_STEPS = [
    { key: 'MATCHED',       label: 'Agent Matched',      money: 'In your wallet' },
    { key: 'ESCROW_LOCKED', label: 'Escrow Locked',      money: 'Locked in NexusV2 contract' },
    { key: 'EXECUTING',     label: 'Agent Working',      money: 'Locked in NexusV2 contract' },
    { key: 'COMPLETED',     label: 'Work Submitted',     money: 'Locked - awaiting review' },
    { key: 'SETTLED',       label: 'Released to Agent',  money: 'Paid to agent (minus 8% platform fee)' },
];

const STATUS_ORDER = ['CREATED', 'MATCHED', 'ESCROW_LOCKED', 'EXECUTING', 'COMPLETED', 'SETTLED'];

function getStepState(stepKey: string, currentStatus: string): 'done' | 'current' | 'pending' {
    const stepIdx = STATUS_ORDER.indexOf(stepKey);
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);

    // Branch statuses
    if (currentStatus === 'DISPUTED') {
        const completedIdx = STATUS_ORDER.indexOf('COMPLETED');
        if (stepIdx <= completedIdx) return 'done';
        return 'pending';
    }
    if (currentStatus === 'REFUNDED') {
        const lockedIdx = STATUS_ORDER.indexOf('ESCROW_LOCKED');
        if (stepIdx <= lockedIdx) return 'done';
        return 'pending';
    }

    if (currentIdx === -1) return 'pending';
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
}

// ── Helpers ───────────────────────────────────────────────

function formatDeadline(deadline: string | null, now: number): { text: string; isExpired: boolean; percent: number } {
    if (!deadline) return { text: 'No deadline', isExpired: false, percent: 0 };
    const deadlineMs = new Date(deadline).getTime();
    const diff = deadlineMs - now * 1000;
    const totalDuration = 48 * 60 * 60 * 1000;
    const elapsed = totalDuration - diff;
    const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    if (diff <= 0) return { text: 'EXPIRED', isExpired: true, percent: 100 };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${minutes}m remaining`, isExpired: false, percent };
}

function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function truncateHash(hash: string | null): string {
    if (!hash) return '-';
    return hash.substring(0, 8) + '...' + hash.substring(hash.length - 6);
}

// ── Status Badge ──────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; label: string }> = {
        ESCROW_LOCKED: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'LOCKED' },
        EXECUTING:     { bg: 'bg-blue-500/15',  text: 'text-blue-400',  label: 'EXECUTING' },
        COMPLETED:     { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'REVIEW' },
        DISPUTED:      { bg: 'bg-red-500/15',   text: 'text-red-400',   label: 'DISPUTED' },
        SETTLED:       { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'SETTLED' },
        REFUNDED:      { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'REFUNDED' },
    };
    const c = config[status] || { bg: 'bg-slate-500/15', text: 'text-slate-400', label: status };

    return (
        <span className={`${c.bg} ${c.text} text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-current/20`}>
            {c.label}
        </span>
    );
}

// ── Escrow Card (Active) ─────────────────────────────────

function ActiveEscrowCard({ item, isExpanded, onToggle, now }: {
    item: TrackerItem;
    isExpanded: boolean;
    onToggle: () => void;
    now: number;
}) {
    const dl = formatDeadline(item.deadline, now);
    const displayAmount = item.negotiatedPrice || item.amount;

    return (
        <div
            className="bg-[#0f1522]/90 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-emerald-500/20"
        >
            {/* Header - always visible, clickable */}
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-start justify-between text-left group"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{item.agentEmoji}</span>
                    <div className="min-w-0">
                        <h4 className="text-white font-bold text-sm truncate group-hover:text-emerald-300 transition-colors">
                            {item.agentName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            {item.onChainJobId != null && (
                                <span className="text-[10px] text-slate-500 font-mono">Job #{item.onChainJobId}</span>
                            )}
                            <span className="text-[10px] text-slate-500">·</span>
                            <span className="text-xs text-white/80 font-semibold">{displayAmount.toFixed(2)} <span className="text-slate-500 text-[10px]">{item.token}</span></span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={item.status} />
                    <span className={`text-slate-500 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-5 border-t border-white/5">
                    {/* Lifecycle Stepper */}
                    <div className="pt-4 pb-2">
                        {LIFECYCLE_STEPS.map((step, idx) => {
                            const state = getStepState(step.key, item.status);
                            const isLast = idx === LIFECYCLE_STEPS.length - 1;

                            return (
                                <div key={step.key} className="flex gap-3">
                                    {/* Vertical line + node */}
                                    <div className="flex flex-col items-center w-5 flex-shrink-0">
                                        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all duration-300 ${
                                            state === 'done'    ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                            state === 'current' ? 'bg-emerald-400 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse' :
                                                                  'bg-transparent border-slate-600'
                                        }`} />
                                        {!isLast && (
                                            <div className={`w-0.5 flex-1 min-h-[28px] transition-colors duration-300 ${
                                                state === 'done' ? 'bg-emerald-500/40' : 'bg-slate-700/50'
                                            }`} />
                                        )}
                                    </div>

                                    {/* Step label + money location */}
                                    <div className={`pb-3 ${isLast ? '' : ''}`}>
                                        <p className={`text-xs font-semibold leading-none ${
                                            state === 'done'    ? 'text-emerald-400' :
                                            state === 'current' ? 'text-white' :
                                                                  'text-slate-600'
                                        }`}>
                                            {state === 'done' && '✓ '}{step.label}
                                            {state === 'current' && <span className="text-emerald-400 ml-1.5 text-[10px]">← now</span>}
                                        </p>
                                        {(state === 'done' || state === 'current') && (
                                            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                                💰 {step.money}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Branch: DISPUTED */}
                        {item.status === 'DISPUTED' && (
                            <div className="flex gap-3 mt-1">
                                <div className="flex flex-col items-center w-5 flex-shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-red-400">⚠️ Disputed</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">💰 Held in contract - 3% penalty on losing party (max $10)</p>
                                    {item.disputeReason && (
                                        <p className="text-[10px] text-red-400/70 mt-1 italic">"{item.disputeReason}"</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Branch: REFUNDED */}
                        {item.status === 'REFUNDED' && (
                            <div className="flex gap-3 mt-1">
                                <div className="flex flex-col items-center w-5 flex-shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-orange-400">🔙 Refunded</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">💰 Returned to your wallet</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Deadline Bar */}
                    {item.deadline && (item.status === 'ESCROW_LOCKED' || item.status === 'EXECUTING' || item.status === 'COMPLETED') && (
                        <div className="mt-2 bg-black/30 rounded-xl p-3 border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-slate-500 uppercase font-medium">Deadline (48h)</span>
                                <span className={`text-[10px] font-bold font-mono ${dl.isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {dl.isExpired ? '⚠️ ' : '⏱ '}{dl.text}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                        dl.isExpired
                                            ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                            : dl.percent > 75
                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                                : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                    }`}
                                    style={{ width: `${dl.percent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* TX Hash */}
                    {item.escrowTxHash && (
                        <div className="mt-2 flex justify-between items-center text-[10px] px-1">
                            <span className="text-slate-600">ESCROW TX</span>
                            <span className="text-slate-400 font-mono">{truncateHash(item.escrowTxHash)}</span>
                        </div>
                    )}
                    {item.settleTxHash && (
                        <div className="mt-1 flex justify-between items-center text-[10px] px-1">
                            <span className="text-slate-600">SETTLE TX</span>
                            <span className="text-emerald-400/70 font-mono">{truncateHash(item.settleTxHash)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Recently Settled Card ─────────────────────────────────

function RecentCard({ item }: { item: TrackerItem }) {
    const isSettled = item.status === 'SETTLED';

    return (
        <div className="flex items-center gap-3 p-3 bg-[#0f1522]/60 rounded-xl border border-white/5">
            <span className="text-lg flex-shrink-0">{item.agentEmoji}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80 font-semibold truncate">{item.agentName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{(item.negotiatedPrice || item.amount).toFixed(2)} {item.token}</span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[10px] text-slate-500">{formatTimeAgo(item.completedAt || item.createdAt)}</span>
                </div>
            </div>
            <span className={`text-[10px] font-bold ${isSettled ? 'text-emerald-400' : 'text-orange-400'}`}>
                {isSettled ? '✅ Paid' : '🔙 Refund'}
            </span>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────

function EscrowTracker({ walletAddress }: EscrowTrackerProps) {
    const [activeEscrows, setActiveEscrows] = useState<TrackerItem[]>([]);
    const [recentEscrows, setRecentEscrows] = useState<TrackerItem[]>([]);
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));

    // 1-second timer for deadline countdown
    useEffect(() => {
        const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(timer);
    }, []);

    // Self-contained polling (10s)
    const fetchTracker = useCallback(async () => {
        if (!walletAddress) return;
        try {
            const res = await fetch(`/api/escrow/tracker?wallet=${walletAddress}`);
            if (res.ok) {
                const data = await res.json();
                setActiveEscrows(data.active || []);
                setRecentEscrows(data.recent || []);
                // Auto-expand first active if none expanded
                if (data.active?.length > 0 && !expandedJobId) {
                    setExpandedJobId(data.active[0].jobId);
                }
            }
        } catch { /* silent */ }
    }, [walletAddress, expandedJobId]);

    useEffect(() => {
        if (!walletAddress) return;

        fetchTracker();

        const interval = setInterval(() => {
            if (!document.hidden) fetchTracker();
        }, 10000);

        return () => clearInterval(interval);
    }, [walletAddress, fetchTracker]);

    // Don't render if no data
    if (!walletAddress || (activeEscrows.length === 0 && recentEscrows.length === 0)) {
        return null;
    }

    return (
        <div className="relative z-20">
            {/* Gradient glow border */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/20 rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none"></div>

            <div className="p-6 flex flex-col border border-white/5 rounded-3xl relative z-10 shadow-inner overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, rgba(21,27,39,0.97) 0%, rgba(21,27,39,0.95) 100%)' }}>
                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                        <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">💰</span>
                        Escrow Tracker
                    </h3>
                    {activeEscrows.length > 0 && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            {activeEscrows.length} Active
                        </span>
                    )}
                </div>

                {/* Active Escrows */}
                {activeEscrows.length > 0 && (
                    <div className="space-y-3 mb-5 max-h-[500px] overflow-y-auto scrollbar-hide">
                        {activeEscrows.map((item) => (
                            <ActiveEscrowCard
                                key={item.jobId}
                                item={item}
                                isExpanded={expandedJobId === item.jobId}
                                onToggle={() => setExpandedJobId(prev => prev === item.jobId ? null : item.jobId)}
                                now={now}
                            />
                        ))}
                    </div>
                )}

                {/* Recently Settled */}
                {recentEscrows.length > 0 && (
                    <div>
                        <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">
                            Recently Settled
                        </h4>
                        <div className="space-y-2">
                            {recentEscrows.map((item) => (
                                <RecentCard key={item.jobId} item={item} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(EscrowTracker);
