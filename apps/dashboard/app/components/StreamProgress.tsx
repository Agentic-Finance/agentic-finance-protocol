'use client';

import React, { useState } from 'react';

// ── Types ────────────────────────────────────────────────────

interface MilestoneData {
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

interface StreamData {
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
}

interface StreamProgressProps {
    stream: StreamData;
    walletAddress: string;
    onRefresh: () => void;
}

const EXPLORER = 'https://explore.tempo.xyz';

// ── Component ────────────────────────────────────────────────

function StreamProgress({ stream, walletAddress, onRefresh }: StreamProgressProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
    const [showRejectInput, setShowRejectInput] = useState<number | null>(null);

    const isClient = walletAddress.toLowerCase() === stream.clientWallet.toLowerCase();
    const isAgent = walletAddress.toLowerCase() === stream.agentWallet.toLowerCase();
    const progressPercent = stream.totalBudget > 0 ? (stream.releasedAmount / stream.totalBudget) * 100 : 0;
    const approvedCount = stream.milestones.filter(m => m.status === 'APPROVED').length;
    const submittedCount = stream.milestones.filter(m => m.status === 'SUBMITTED').length;
    const pendingCount = stream.milestones.filter(m => m.status === 'PENDING').length;

    // Days remaining
    const getDaysRemaining = () => {
        if (!stream.deadline) return null;
        const diff = new Date(stream.deadline).getTime() - Date.now();
        if (diff <= 0) return 0;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };
    const daysLeft = getDaysRemaining();

    // Agent emoji
    const getAgentEmoji = () => {
        const n = (stream.agentName || '').toLowerCase();
        if (n.includes('design')) return '🎨';
        if (n.includes('contract') || n.includes('guard') || n.includes('audit')) return '🛡️';
        if (n.includes('data') || n.includes('forge') || n.includes('analytics')) return '📊';
        if (n.includes('translate')) return '🌐';
        return '🤖';
    };

    // ── Actions ──────────────────────────────────────────────

    const submitMilestone = async (milestoneIndex: number) => {
        setLoading(`submit-${milestoneIndex}`);
        try {
            const res = await fetch('/api/stream/milestone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'submit', streamJobId: stream.id, milestoneIndex }),
            });
            const data = await res.json();
            if (data.success) onRefresh();
        } catch (err) { console.error('Submit error:', err); }
        finally { setLoading(null); }
    };

    const approveMilestone = async (milestoneIndex: number) => {
        setLoading(`approve-${milestoneIndex}`);
        try {
            const res = await fetch('/api/stream/milestone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', streamJobId: stream.id, milestoneIndex }),
            });
            const data = await res.json();
            if (data.success) onRefresh();
        } catch (err) { console.error('Approve error:', err); }
        finally { setLoading(null); }
    };

    const rejectMilestone = async (milestoneIndex: number) => {
        setLoading(`reject-${milestoneIndex}`);
        try {
            const res = await fetch('/api/stream/milestone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', streamJobId: stream.id, milestoneIndex, rejectReason: rejectReasons[milestoneIndex] || '' }),
            });
            const data = await res.json();
            if (data.success) {
                setShowRejectInput(null);
                setRejectReasons(prev => { const next = { ...prev }; delete next[milestoneIndex]; return next; });
                onRefresh();
            }
        } catch (err) { console.error('Reject error:', err); }
        finally { setLoading(null); }
    };

    const cancelStream = async () => {
        if (!confirm('Are you sure you want to cancel this stream? Unreleased funds will be refunded.')) return;
        setLoading('cancel');
        try {
            const res = await fetch('/api/stream/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ streamJobId: stream.id }),
            });
            const data = await res.json();
            if (data.success) onRefresh();
        } catch (err) { console.error('Cancel error:', err); }
        finally { setLoading(null); }
    };

    // ── Status Helpers ───────────────────────────────────────

    const getStatusConfig = (status: string) => {
        const map: Record<string, { bg: string; text: string; border: string; label: string; icon: string; glow: string }> = {
            PENDING:   { bg: 'rgba(100,116,139,0.08)', text: '#94a3b8', border: 'rgba(100,116,139,0.15)', label: 'Pending', icon: '⏳', glow: 'none' },
            SUBMITTED: { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)',  label: 'Submitted', icon: '📤', glow: '0 0 12px rgba(245,158,11,0.15)' },
            APPROVED:  { bg: 'rgba(16,185,129,0.1)',  text: '#10b981', border: 'rgba(16,185,129,0.25)',  label: 'Approved', icon: '✅', glow: '0 0 12px rgba(16,185,129,0.15)' },
            REJECTED:  { bg: 'rgba(239,68,68,0.08)',  text: '#ef4444', border: 'rgba(239,68,68,0.2)',    label: 'Rejected', icon: '❌', glow: 'none' },
        };
        return map[status] || map.PENDING;
    };

    const streamStatusColor = stream.status === 'COMPLETED' ? '#10b981' : stream.status === 'CANCELLED' ? '#ef4444' : '#818cf8';

    return (
        <div className="relative">
            {/* Ambient Glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-indigo-500/15 rounded-[1.6rem] blur-[2px] pointer-events-none" />

            <div className="relative bg-[#0d1117] border border-white/[0.06] rounded-3xl overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, rgba(17,24,39,0.98) 0%, rgba(13,17,23,1) 100%)' }}>

                {/* ── Header Section ── */}
                <div className="px-6 sm:px-8 py-6 border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 50%)' }}>
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))' }}>
                                {getAgentEmoji()}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">
                                    {stream.agentName || stream.agentWallet.slice(0, 12) + '...'}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <p className="text-[11px] text-slate-500 font-mono">
                                        ID: {stream.id.slice(0, 8)}...
                                    </p>
                                    {stream.streamTxHash && (
                                        <>
                                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                                            <a href={`${EXPLORER}/tx/${stream.streamTxHash}`} target="_blank" rel="noopener noreferrer"
                                                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1">
                                                View On-Chain
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            </a>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <span
                            className="text-[11px] font-black px-4 py-2 rounded-xl border uppercase tracking-wider"
                            style={{ color: streamStatusColor, backgroundColor: `${streamStatusColor}12`, borderColor: `${streamStatusColor}30`, boxShadow: `0 0 15px ${streamStatusColor}10` }}
                        >
                            {stream.status}
                        </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        <div className="bg-black/30 rounded-xl px-4 py-3 border border-white/[0.04]">
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total Budget</p>
                            <p className="text-lg font-black text-white tabular-nums">{stream.totalBudget.toLocaleString()} <span className="text-[10px] text-slate-500 font-bold">aUSD</span></p>
                        </div>
                        <div className="bg-black/30 rounded-xl px-4 py-3 border border-white/[0.04]">
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Released</p>
                            <p className="text-lg font-black text-emerald-400 tabular-nums">{stream.releasedAmount.toLocaleString()} <span className="text-[10px] text-slate-500 font-bold">aUSD</span></p>
                        </div>
                        <div className="bg-black/30 rounded-xl px-4 py-3 border border-white/[0.04]">
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Progress</p>
                            <p className="text-lg font-black tabular-nums" style={{ color: '#818cf8' }}>{approvedCount}/{stream.milestones.length} <span className="text-[10px] text-slate-500 font-bold">done</span></p>
                        </div>
                        <div className="bg-black/30 rounded-xl px-4 py-3 border border-white/[0.04]">
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Deadline</p>
                            <p className={`text-lg font-black tabular-nums ${daysLeft !== null && daysLeft <= 3 ? 'text-red-400' : daysLeft !== null && daysLeft <= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
                                {daysLeft === null ? 'N/A' : daysLeft === 0 ? 'Expired' : `${daysLeft}d`} <span className="text-[10px] text-slate-500 font-bold">left</span>
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500">Payment Progress</span>
                            <span className="text-[10px] font-bold tabular-nums text-slate-400">{progressPercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-white/[0.04]">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                style={{ width: `${Math.max(progressPercent, 2)}%`, background: 'linear-gradient(to right, #818cf8, #a855f7, #d946ef)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%' }} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-600">
                            <span>{stream.releasedAmount.toLocaleString()} released</span>
                            <span>{(stream.totalBudget - stream.releasedAmount).toLocaleString()} remaining</span>
                        </div>
                    </div>
                </div>

                {/* ── Milestones Section ── */}
                <div className="px-6 sm:px-8 py-6">
                    <div className="flex items-center justify-between mb-5">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">🎯</span>
                            Milestones
                        </h4>
                        <div className="flex items-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {approvedCount} Approved</span>
                            {submittedCount > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> {submittedCount} In Review</span>}
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" /> {pendingCount} Pending</span>
                        </div>
                    </div>

                    <div className="space-y-0">
                        {stream.milestones.map((m, i) => {
                            const config = getStatusConfig(m.status);
                            const isLast = i === stream.milestones.length - 1;

                            return (
                                <div key={m.id} className="relative pl-10 pb-6 last:pb-0">
                                    {/* Timeline Line */}
                                    {!isLast && (
                                        <div className="absolute left-[15px] top-8 bottom-0 w-[2px]"
                                            style={{ background: m.status === 'APPROVED' ? 'linear-gradient(to bottom, #10b981, rgba(16,185,129,0.2))' : 'rgba(255,255,255,0.04)' }} />
                                    )}

                                    {/* Timeline Node */}
                                    <div className="absolute left-0 top-1">
                                        <div
                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold border-2 transition-all"
                                            style={{
                                                borderColor: config.text,
                                                backgroundColor: config.bg,
                                                color: config.text,
                                                boxShadow: config.glow,
                                            }}
                                        >
                                            {m.status === 'APPROVED' ? '✓' : m.status === 'SUBMITTED' ? '!' : m.status === 'REJECTED' ? '✕' : (i + 1)}
                                        </div>
                                    </div>

                                    {/* Milestone Card */}
                                    <div className={`rounded-xl border p-4 sm:p-5 transition-all duration-300 ${
                                        m.status === 'SUBMITTED' ? 'bg-amber-500/[0.03] border-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.05)]' :
                                        m.status === 'APPROVED' ? 'bg-emerald-500/[0.03] border-emerald-500/15' :
                                        m.status === 'REJECTED' ? 'bg-red-500/[0.03] border-red-500/10' :
                                        'bg-white/[0.015] border-white/[0.05] hover:border-white/[0.1]'
                                    }`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white mb-1">{m.deliverable}</p>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="text-sm font-black tabular-nums" style={{ color: m.status === 'APPROVED' ? '#10b981' : '#e2e8f0' }}>
                                                        {m.amount.toLocaleString()} <span className="text-[10px] text-slate-500 font-bold">AlphaUSD</span>
                                                    </span>
                                                    {m.submitTxHash && (
                                                        <a href={`${EXPLORER}/tx/${m.submitTxHash}`} target="_blank" rel="noopener noreferrer"
                                                            className="text-[10px] text-indigo-400 hover:underline font-bold flex items-center gap-1">
                                                            Submit TX <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                        </a>
                                                    )}
                                                    {m.approveTxHash && (
                                                        <a href={`${EXPLORER}/tx/${m.approveTxHash}`} target="_blank" rel="noopener noreferrer"
                                                            className="text-[10px] text-emerald-400 hover:underline font-bold flex items-center gap-1">
                                                            Approve TX <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <span
                                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ml-3"
                                                style={{ backgroundColor: config.bg, color: config.text, borderColor: config.border }}
                                            >
                                                {config.icon} {config.label}
                                            </span>
                                        </div>

                                        {/* Rejection reason */}
                                        {m.status === 'REJECTED' && m.rejectReason && (
                                            <div className="text-[11px] text-red-400/80 bg-red-500/[0.06] border border-red-500/10 rounded-lg px-3 py-2 mb-3">
                                                <span className="font-bold">Reason:</span> {m.rejectReason}
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        {stream.status === 'ACTIVE' && (
                                            <div className="flex items-center gap-2 mt-3">
                                                {/* Agent: Submit */}
                                                {isAgent && (m.status === 'PENDING' || m.status === 'REJECTED') && (
                                                    <button
                                                        onClick={() => submitMilestone(m.index)}
                                                        disabled={loading === `submit-${m.index}`}
                                                        className="text-[11px] font-bold px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/20 transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(99,102,241,0.08)]"
                                                    >
                                                        {loading === `submit-${m.index}` ? 'Submitting...' : m.status === 'REJECTED' ? '🔄 Re-submit' : '📤 Submit Deliverable'}
                                                    </button>
                                                )}

                                                {/* Client: Approve + Reject */}
                                                {isClient && m.status === 'SUBMITTED' && (
                                                    <>
                                                        <button
                                                            onClick={() => approveMilestone(m.index)}
                                                            disabled={loading === `approve-${m.index}`}
                                                            className="text-[11px] font-bold px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.08)]"
                                                        >
                                                            {loading === `approve-${m.index}` ? 'Approving...' : '✅ Approve & Release'}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowRejectInput(showRejectInput === m.index ? null : m.index)}
                                                            className="text-[11px] font-bold px-4 py-2 rounded-xl bg-red-500/[0.07] text-red-400/80 border border-red-500/15 hover:bg-red-500/15 transition-all"
                                                        >
                                                            ❌ Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Reject reason input */}
                                        {showRejectInput === m.index && (
                                            <div className="mt-3 flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={rejectReasons[m.index] || ''}
                                                    onChange={(e) => setRejectReasons(prev => ({ ...prev, [m.index]: e.target.value }))}
                                                    placeholder="Reason for rejection..."
                                                    className="flex-1 text-[11px] px-4 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/30 transition-colors"
                                                />
                                                <button
                                                    onClick={() => rejectMilestone(m.index)}
                                                    disabled={loading === `reject-${m.index}`}
                                                    className="text-[11px] font-bold px-4 py-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                                                >
                                                    {loading === `reject-${m.index}` ? '...' : 'Confirm Reject'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-6 sm:px-8 py-4 border-t border-white/[0.04] bg-black/30 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] text-slate-600">
                        <span>Client: <span className="font-mono text-slate-500">{stream.clientWallet.slice(0, 8)}...{stream.clientWallet.slice(-4)}</span></span>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span>Agent: <span className="font-mono text-slate-500">{stream.agentWallet.slice(0, 8)}...{stream.agentWallet.slice(-4)}</span></span>
                    </div>
                    {isClient && stream.status === 'ACTIVE' && (
                        <button
                            onClick={cancelStream}
                            disabled={loading === 'cancel'}
                            className="text-[10px] font-bold px-4 py-1.5 rounded-lg bg-red-500/[0.05] text-red-400/60 border border-red-500/10 hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-50"
                        >
                            {loading === 'cancel' ? 'Cancelling...' : 'Cancel Stream'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default React.memo(StreamProgress);
