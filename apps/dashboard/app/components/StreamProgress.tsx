'use client';

import React, { useState } from 'react';
import {
    StreamData,
    EXPLORER,
    getStatusConfig,
} from '../stream/components';

// ── Props ─────────────────────────────────────────────────────

interface StreamProgressProps {
    stream: StreamData;
    walletAddress: string;
    onRefresh: () => void;
}

// ── Component — Milestone Timeline (Right Panel) ──────────────

function StreamProgress({ stream, walletAddress, onRefresh }: StreamProgressProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
    const [showRejectInput, setShowRejectInput] = useState<number | null>(null);

    const isClient = walletAddress.toLowerCase() === stream.clientWallet.toLowerCase();
    const isAgent = walletAddress.toLowerCase() === stream.agentWallet.toLowerCase();
    const approvedCount = stream.milestones.filter(m => m.status === 'APPROVED').length;
    const submittedCount = stream.milestones.filter(m => m.status === 'SUBMITTED').length;
    const pendingCount = stream.milestones.filter(m => m.status === 'PENDING').length;

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

    return (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at top, rgba(17,27,46,0.98) 0%, rgba(15,23,36,1) 100%)' }}>

            {/* Section Header */}
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04), transparent 50%)' }}>
                <h4 className="text-sm font-bold text-white flex items-center gap-2.5">
                    <span className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </span>
                    Milestones
                </h4>
                <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-400">{approvedCount} Approved</span>
                    </span>
                    {submittedCount > 0 && (
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-amber-400">{submittedCount} In Review</span>
                        </span>
                    )}
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                        <span className="text-slate-500">{pendingCount} Pending</span>
                    </span>
                </div>
            </div>

            {/* Milestone Timeline */}
            <div className="px-6 py-6">
                <div className="space-y-0">
                    {stream.milestones.map((m, i) => {
                        const config = getStatusConfig(m.status);
                        const isLast = i === stream.milestones.length - 1;

                        return (
                            <div key={m.id} className="relative pl-14 pb-8 last:pb-0">
                                {/* Timeline Line — thicker */}
                                {!isLast && (
                                    <div className="absolute left-[19px] top-12 bottom-0 w-[3px]"
                                        style={{
                                            background: m.status === 'APPROVED'
                                                ? 'linear-gradient(to bottom, #10b981, rgba(16,185,129,0.15))'
                                                : 'rgba(255,255,255,0.04)',
                                        }} />
                                )}

                                {/* Timeline Node — larger */}
                                <div className="absolute left-0 top-1">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border-2 transition-all"
                                        style={{
                                            borderColor: config.text,
                                            backgroundColor: config.bg,
                                            color: config.text,
                                            boxShadow: config.glow,
                                        }}
                                    >
                                        {m.status === 'APPROVED' ? '\u2713' : m.status === 'SUBMITTED' ? '!' : m.status === 'REJECTED' ? '\u2715' : (i + 1)}
                                    </div>
                                </div>

                                {/* Milestone Card — with left accent */}
                                <div
                                    className={`rounded-xl border p-5 transition-all duration-300 ${
                                        m.status === 'SUBMITTED' ? 'border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]' :
                                        m.status === 'APPROVED' ? 'border-emerald-500/15' :
                                        m.status === 'REJECTED' ? 'border-red-500/10' :
                                        'border-white/[0.05] hover:border-white/[0.1]'
                                    }`}
                                    style={{
                                        borderLeftWidth: '3px',
                                        borderLeftColor: config.text,
                                        background: m.status === 'SUBMITTED' ? 'rgba(245,158,11,0.03)'
                                            : m.status === 'APPROVED' ? 'rgba(16,185,129,0.03)'
                                            : m.status === 'REJECTED' ? 'rgba(239,68,68,0.03)'
                                            : 'rgba(255,255,255,0.015)',
                                    }}
                                >
                                    {/* Header: deliverable + status */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white mb-1.5">{m.deliverable}</p>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-base font-black tabular-nums" style={{ color: m.status === 'APPROVED' ? '#10b981' : '#e2e8f0' }}>
                                                    {m.amount.toLocaleString()} <span className="text-[10px] text-slate-500 font-bold">aUSD</span>
                                                </span>
                                                {m.submitTxHash && (
                                                    <a href={`${EXPLORER}/tx/${m.submitTxHash}`} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors">
                                                        Submit TX
                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </a>
                                                )}
                                                {m.approveTxHash && (
                                                    <a href={`${EXPLORER}/tx/${m.approveTxHash}`} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors">
                                                        Approve TX
                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ml-3"
                                            style={{ backgroundColor: config.bg, color: config.text, borderColor: config.border }}>
                                            {config.icon} {config.label}
                                        </span>
                                    </div>

                                    {/* Rejection reason */}
                                    {m.status === 'REJECTED' && m.rejectReason && (
                                        <div className="text-[11px] text-red-400/80 bg-red-500/[0.06] border border-red-500/10 rounded-lg px-3 py-2 mb-3">
                                            <span className="font-bold">Reason:</span> {m.rejectReason}
                                        </div>
                                    )}

                                    {/* Action Buttons — Prominent for SUBMITTED milestones */}
                                    {stream.status === 'ACTIVE' && (
                                        <>
                                            {/* Client: Approve/Reject SUBMITTED milestones */}
                                            {isClient && m.status === 'SUBMITTED' && (
                                                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                                                    <p className="text-[10px] text-amber-400/80 font-bold mb-3 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                        This milestone needs your review
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => approveMilestone(m.index)}
                                                            disabled={loading === `approve-${m.index}`}
                                                            className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 text-xs font-bold transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.08)]"
                                                        >
                                                            {loading === `approve-${m.index}` ? 'Approving...' : `\u2705 Approve & Release ${m.amount.toLocaleString()} aUSD`}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowRejectInput(showRejectInput === m.index ? null : m.index)}
                                                            className="px-4 py-2.5 rounded-xl bg-red-500/[0.07] text-red-400/80 border border-red-500/15 hover:bg-red-500/15 text-xs font-bold transition-all"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Agent: Submit deliverable */}
                                            {isAgent && (m.status === 'PENDING' || m.status === 'REJECTED') && (
                                                <div className="mt-3">
                                                    <button
                                                        onClick={() => submitMilestone(m.index)}
                                                        disabled={loading === `submit-${m.index}`}
                                                        className="text-[11px] font-bold px-4 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/20 transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(99,102,241,0.08)]"
                                                    >
                                                        {loading === `submit-${m.index}` ? 'Submitting...' : m.status === 'REJECTED' ? '\u{1F504} Re-submit Deliverable' : '\u{1F4E4} Submit Deliverable'}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Reject reason input */}
                                    {showRejectInput === m.index && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={rejectReasons[m.index] || ''}
                                                onChange={(e) => setRejectReasons(prev => ({ ...prev, [m.index]: e.target.value }))}
                                                placeholder="Reason for rejection..."
                                                className="flex-1 text-[11px] px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/30 transition-colors"
                                            />
                                            <button
                                                onClick={() => rejectMilestone(m.index)}
                                                disabled={loading === `reject-${m.index}`}
                                                className="text-[11px] font-bold px-4 py-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                                            >
                                                {loading === `reject-${m.index}` ? '...' : 'Confirm'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default React.memo(StreamProgress);
