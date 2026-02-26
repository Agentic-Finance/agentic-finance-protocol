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

    // ── Actions ──────────────────────────────────────────────

    const submitMilestone = async (milestoneIndex: number) => {
        setLoading(`submit-${milestoneIndex}`);
        try {
            const res = await fetch('/api/stream/milestone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit',
                    streamJobId: stream.id,
                    milestoneIndex,
                }),
            });
            const data = await res.json();
            if (data.success) onRefresh();
        } catch (err) {
            console.error('Submit error:', err);
        } finally {
            setLoading(null);
        }
    };

    const approveMilestone = async (milestoneIndex: number) => {
        setLoading(`approve-${milestoneIndex}`);
        try {
            const res = await fetch('/api/stream/milestone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    streamJobId: stream.id,
                    milestoneIndex,
                }),
            });
            const data = await res.json();
            if (data.success) onRefresh();
        } catch (err) {
            console.error('Approve error:', err);
        } finally {
            setLoading(null);
        }
    };

    const rejectMilestone = async (milestoneIndex: number) => {
        setLoading(`reject-${milestoneIndex}`);
        try {
            const res = await fetch('/api/stream/milestone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject',
                    streamJobId: stream.id,
                    milestoneIndex,
                    rejectReason: rejectReasons[milestoneIndex] || '',
                }),
            });
            const data = await res.json();
            if (data.success) {
                setShowRejectInput(null);
                setRejectReasons(prev => { const next = { ...prev }; delete next[milestoneIndex]; return next; });
                onRefresh();
            }
        } catch (err) {
            console.error('Reject error:', err);
        } finally {
            setLoading(null);
        }
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
        } catch (err) {
            console.error('Cancel error:', err);
        } finally {
            setLoading(null);
        }
    };

    // ── Status Helpers ───────────────────────────────────────

    const getStatusBadge = (status: string) => {
        const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
            PENDING:   { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8', border: 'rgba(100,116,139,0.2)', label: 'Pending' },
            SUBMITTED: { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b', border: 'rgba(245,158,11,0.2)',  label: 'Submitted' },
            APPROVED:  { bg: 'rgba(16,185,129,0.1)',  text: '#10b981', border: 'rgba(16,185,129,0.2)',  label: 'Approved' },
            REJECTED:  { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', border: 'rgba(239,68,68,0.2)',   label: 'Rejected' },
        };
        const s = map[status] || map.PENDING;
        return (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>
                {s.label}
            </span>
        );
    };

    const getStreamStatusColor = (status: string) => {
        if (status === 'COMPLETED') return '#10b981';
        if (status === 'CANCELLED') return '#ef4444';
        return '#818cf8';
    };

    return (
        <div className="bg-[#0d1117] border border-white/[0.06] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-lg">🔄</span>
                        <div>
                            <h3 className="text-sm font-bold text-white">
                                Stream with {isClient ? (stream.agentName || stream.agentWallet.slice(0, 8) + '...') : stream.clientWallet.slice(0, 8) + '...'}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {stream.id.slice(0, 8)}...
                                {stream.streamTxHash && (
                                    <> • <a href={`${EXPLORER}/tx/${stream.streamTxHash}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">View TX</a></>
                                )}
                            </p>
                        </div>
                    </div>
                    <span
                        className="text-[10px] font-bold px-3 py-1 rounded-full border"
                        style={{ color: getStreamStatusColor(stream.status), backgroundColor: `${getStreamStatusColor(stream.status)}10`, borderColor: `${getStreamStatusColor(stream.status)}25` }}
                    >
                        {stream.status}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${progressPercent}%`,
                                background: 'linear-gradient(to right, #818cf8, #d946ef)',
                            }}
                        />
                    </div>
                    <span className="text-xs font-bold text-slate-400 tabular-nums">
                        {approvedCount}/{stream.milestones.length}
                    </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Released: {stream.releasedAmount.toFixed(2)} AlphaUSD</span>
                    <span>Budget: {stream.totalBudget.toFixed(2)} AlphaUSD</span>
                </div>

                {/* Deadline */}
                {stream.deadline && (
                    <div className="mt-2 text-[10px] text-slate-600">
                        Deadline: {new Date(stream.deadline).toLocaleDateString()} {new Date(stream.deadline).toLocaleTimeString()}
                        {new Date(stream.deadline) < new Date() && stream.status === 'ACTIVE' && (
                            <span className="ml-2 text-red-400 font-bold">EXPIRED</span>
                        )}
                    </div>
                )}
            </div>

            {/* Milestone Timeline */}
            <div className="px-6 py-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Milestones</p>
                <div className="space-y-0">
                    {stream.milestones.map((m, i) => (
                        <div key={m.id} className="relative pl-8 pb-6 last:pb-0">
                            {/* Timeline Line */}
                            {i < stream.milestones.length - 1 && (
                                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-white/[0.06]" />
                            )}
                            {/* Timeline Dot */}
                            <div
                                className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                                style={{
                                    borderColor: m.status === 'APPROVED' ? '#10b981' : m.status === 'SUBMITTED' ? '#f59e0b' : m.status === 'REJECTED' ? '#ef4444' : 'rgba(255,255,255,0.1)',
                                    backgroundColor: m.status === 'APPROVED' ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.3)',
                                    color: m.status === 'APPROVED' ? '#10b981' : '#64748b',
                                }}
                            >
                                {m.status === 'APPROVED' ? '✓' : i + 1}
                            </div>

                            {/* Milestone Card */}
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:border-white/[0.1] transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-white">{m.deliverable}</span>
                                    {getStatusBadge(m.status)}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-2">
                                    <span className="font-bold text-slate-300">{m.amount.toFixed(2)} <span className="text-slate-500">AlphaUSD</span></span>
                                    {m.submitTxHash && (
                                        <a href={`${EXPLORER}/tx/${m.submitTxHash}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Submit TX</a>
                                    )}
                                    {m.approveTxHash && (
                                        <a href={`${EXPLORER}/tx/${m.approveTxHash}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Approve TX</a>
                                    )}
                                </div>

                                {/* Reject Reason */}
                                {m.status === 'REJECTED' && m.rejectReason && (
                                    <p className="text-[11px] text-red-400/80 bg-red-500/[0.05] border border-red-500/10 rounded-lg px-3 py-2 mb-2">
                                        Rejection: {m.rejectReason}
                                    </p>
                                )}

                                {/* Action Buttons */}
                                {stream.status === 'ACTIVE' && (
                                    <div className="flex items-center gap-2 mt-2">
                                        {/* Agent: Submit button */}
                                        {isAgent && (m.status === 'PENDING' || m.status === 'REJECTED') && (
                                            <button
                                                onClick={() => submitMilestone(m.index)}
                                                disabled={loading === `submit-${m.index}`}
                                                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                                            >
                                                {loading === `submit-${m.index}` ? 'Submitting...' : m.status === 'REJECTED' ? 'Re-submit' : 'Submit'}
                                            </button>
                                        )}

                                        {/* Client: Approve + Reject */}
                                        {isClient && m.status === 'SUBMITTED' && (
                                            <>
                                                <button
                                                    onClick={() => approveMilestone(m.index)}
                                                    disabled={loading === `approve-${m.index}`}
                                                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                                >
                                                    {loading === `approve-${m.index}` ? 'Approving...' : 'Approve'}
                                                </button>
                                                <button
                                                    onClick={() => setShowRejectInput(showRejectInput === m.index ? null : m.index)}
                                                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                                >
                                                    Reject
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
                                            className="flex-1 text-[11px] px-3 py-1.5 rounded-lg bg-black/30 border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/30"
                                        />
                                        <button
                                            onClick={() => rejectMilestone(m.index)}
                                            disabled={loading === `reject-${m.index}`}
                                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                                        >
                                            {loading === `reject-${m.index}` ? '...' : 'Confirm'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cancel Button (Client only, Active streams) */}
            {isClient && stream.status === 'ACTIVE' && (
                <div className="px-6 py-4 border-t border-white/[0.06]">
                    <button
                        onClick={cancelStream}
                        disabled={loading === 'cancel'}
                        className="text-[11px] font-bold px-4 py-2 rounded-lg bg-red-500/[0.07] text-red-400/80 border border-red-500/15 hover:bg-red-500/15 transition-colors disabled:opacity-50 w-full"
                    >
                        {loading === 'cancel' ? 'Cancelling...' : `Cancel Stream - Refund ${(stream.totalBudget - stream.releasedAmount).toFixed(2)} AlphaUSD`}
                    </button>
                </div>
            )}
        </div>
    );
}

export default React.memo(StreamProgress);
