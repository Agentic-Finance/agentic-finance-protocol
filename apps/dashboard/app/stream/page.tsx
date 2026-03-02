'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StreamProgress from '../components/StreamProgress';
import SubPageNav from '../components/SubPageNav';
import Link from 'next/link';

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
    createdAt: string;
}

export default function StreamPage() {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [role, setRole] = useState<'client' | 'agent'>('client');
    const [streams, setStreams] = useState<StreamData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStream, setSelectedStream] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Auto-detect wallet from MetaMask
    useEffect(() => {
        const checkWallet = async () => {
            if (typeof window !== 'undefined' && (window as any).ethereum) {
                try {
                    const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
                    if (accounts?.[0]) setWalletAddress(accounts[0]);
                } catch (e) { /* silent */ }
            }
        };
        checkWallet();
    }, []);

    const fetchStreams = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'ALL') params.set('status', statusFilter);
            const res = await fetch(`/api/stream?${params}`);
            const data = await res.json();
            if (data.success) setStreams(data.streams);
        } catch (err) {
            console.error('Fetch streams error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchStreams();
    }, [fetchStreams]);

    const activeStreams = streams.filter(s => s.status === 'ACTIVE');
    const completedStreams = streams.filter(s => s.status === 'COMPLETED');
    const totalBudget = streams.reduce((sum, s) => sum + s.totalBudget, 0);
    const totalReleased = streams.reduce((sum, s) => sum + s.releasedAmount, 0);
    const totalMilestones = streams.reduce((sum, s) => sum + s.milestones.length, 0);
    const approvedMilestones = streams.reduce((sum, s) => sum + s.milestones.filter(m => m.status === 'APPROVED').length, 0);

    const selected = selectedStream ? streams.find(s => s.id === selectedStream) : null;

    // Days remaining helper
    const getDaysRemaining = (deadline: string | null) => {
        if (!deadline) return null;
        const diff = new Date(deadline).getTime() - Date.now();
        if (diff <= 0) return 0;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    // Agent emoji based on name
    const getAgentEmoji = (name: string | null) => {
        if (!name) return '🤖';
        const n = name.toLowerCase();
        if (n.includes('design')) return '🎨';
        if (n.includes('contract') || n.includes('guard') || n.includes('audit')) return '🛡️';
        if (n.includes('data') || n.includes('forge') || n.includes('analytics')) return '📊';
        if (n.includes('translate')) return '🌐';
        if (n.includes('treasury')) return '💰';
        return '🤖';
    };

    // Gradient colors for cards
    const getStreamGradient = (index: number) => {
        const gradients = [
            { from: 'rgba(99,102,241,0.15)', to: 'rgba(168,85,247,0.08)', accent: '#818cf8', border: 'rgba(99,102,241,0.25)' },
            { from: 'rgba(16,185,129,0.15)', to: 'rgba(6,182,212,0.08)', accent: '#10b981', border: 'rgba(16,185,129,0.25)' },
            { from: 'rgba(245,158,11,0.15)', to: 'rgba(239,68,68,0.08)', accent: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
            { from: 'rgba(217,70,239,0.15)', to: 'rgba(99,102,241,0.08)', accent: '#d946ef', border: 'rgba(217,70,239,0.25)' },
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div className="min-h-screen bg-[#0B1120]">
            <SubPageNav />
            {/* Header */}
            <div className="border-b border-white/[0.08] pp-glass">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 hover:bg-indigo-500/30 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Stream Settlement</span>
                                </h1>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Progressive milestone-based payments on Tempo L1</p>
                            </div>
                        </div>

                        {/* Role Tabs */}
                        <div className="flex items-center gap-1 bg-black/30 border border-white/[0.06] rounded-xl p-1 backdrop-blur-sm">
                            {(['client', 'agent'] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => { setRole(r); setSelectedStream(null); }}
                                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                                        role === r
                                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                                            : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                    }`}
                                >
                                    {r === 'client' ? '👤 Client View' : '🤖 Agent View'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Stats Row - Premium Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
                    {[
                        { label: 'Total Streams', value: streams.length, icon: '🔄', color: '#818cf8', sub: 'active contracts' },
                        { label: 'Active', value: activeStreams.length, icon: '⚡', color: '#f59e0b', sub: 'in progress' },
                        { label: 'Completed', value: completedStreams.length, icon: '✅', color: '#10b981', sub: 'settled' },
                        { label: 'Total Volume', value: `${totalBudget.toLocaleString()}`, icon: '💎', color: '#d946ef', sub: 'AlphaUSD locked' },
                        { label: 'Milestones', value: `${approvedMilestones}/${totalMilestones}`, icon: '🎯', color: '#06b6d4', sub: 'approved' },
                    ].map((stat) => (
                        <div key={stat.label} className="relative group overflow-hidden rounded-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-[#111827] border border-white/[0.06] rounded-2xl px-4 sm:px-5 py-4 hover:border-white/[0.12] transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                    <span className="text-base opacity-80">{stat.icon}</span>
                                </div>
                                <p className="text-2xl sm:text-3xl font-black tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                                <p className="text-[10px] text-slate-600 mt-1">{stat.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Row */}
                <div className="flex items-center gap-2 mb-6">
                    {[
                        { key: 'ALL', label: 'All Streams', icon: '📋' },
                        { key: 'ACTIVE', label: 'Active', icon: '⚡' },
                        { key: 'COMPLETED', label: 'Completed', icon: '✅' },
                        { key: 'CANCELLED', label: 'Cancelled', icon: '🚫' },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setStatusFilter(f.key)}
                            className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${
                                statusFilter === f.key
                                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.1)]'
                                    : 'text-slate-500 hover:text-white bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1]'
                            }`}
                        >
                            <span className="mr-1.5">{f.icon}</span>{f.label}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center gap-3 bg-[#111827] border border-white/[0.06] rounded-2xl px-6 py-4">
                            <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                            <p className="text-slate-400 font-medium text-sm">Loading streams...</p>
                        </div>
                    </div>
                ) : selected ? (
                    /* Detail View */
                    <div>
                        <button
                            onClick={() => setSelectedStream(null)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 mb-4 flex items-center gap-2 transition-colors bg-indigo-500/[0.06] hover:bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/15"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Back to all streams
                        </button>
                        <StreamProgress
                            stream={selected}
                            walletAddress={walletAddress || ''}
                            onRefresh={fetchStreams}
                        />
                    </div>
                ) : streams.length === 0 ? (
                    <div className="text-center py-24 bg-[#111827] rounded-2xl border border-dashed border-white/[0.08]">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <span className="text-3xl">🔄</span>
                        </div>
                        <p className="text-slate-300 text-lg font-bold mb-2">No Streams Yet</p>
                        <p className="text-slate-600 text-sm max-w-sm mx-auto">
                            Streams are created when agents accept milestone-based jobs from the Marketplace.
                        </p>
                    </div>
                ) : (
                    /* Stream List — Premium Cards */
                    <div className="space-y-4">
                        {streams.map((s, idx) => {
                            const approvedCount = s.milestones.filter(m => m.status === 'APPROVED').length;
                            const submittedCount = s.milestones.filter(m => m.status === 'SUBMITTED').length;
                            const progressPercent = s.totalBudget > 0 ? (s.releasedAmount / s.totalBudget) * 100 : 0;
                            const statusColor = s.status === 'COMPLETED' ? '#10b981' : s.status === 'CANCELLED' ? '#ef4444' : '#818cf8';
                            const gradient = getStreamGradient(idx);
                            const daysLeft = getDaysRemaining(s.deadline);
                            const agentEmoji = getAgentEmoji(s.agentName);

                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedStream(s.id)}
                                    className="w-full text-left group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.005]"
                                >
                                    {/* Ambient glow on hover */}
                                    <div className="absolute -inset-[1px] rounded-[1.1rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(135deg, ${gradient.border}, transparent 60%)` }} />

                                    <div className="relative bg-[#111827] border border-white/[0.05] group-hover:border-white/[0.12] rounded-2xl p-5 sm:p-6 transition-all">
                                        {/* Top Row: Agent Info + Budget */}
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="flex items-center gap-4">
                                                {/* Agent Avatar */}
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl border shadow-inner shrink-0"
                                                    style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, borderColor: gradient.border }}>
                                                    {agentEmoji}
                                                </div>
                                                <div>
                                                    <p className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                                                        {s.agentName || s.agentWallet.slice(0, 12) + '...'}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-[10px] text-slate-500 font-mono">
                                                            {new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                                                        <p className="text-[10px] text-slate-500">{s.milestones.length} milestones</p>
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
                                                {/* Budget */}
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-white tabular-nums">
                                                        {s.totalBudget.toLocaleString()} <span className="text-xs font-bold text-slate-500">aUSD</span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-600 mt-0.5">
                                                        {s.releasedAmount > 0 ? `${s.releasedAmount.toLocaleString()} released` : 'No releases yet'}
                                                    </p>
                                                </div>
                                                {/* Status Badge */}
                                                <span
                                                    className="text-[10px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-wider"
                                                    style={{ color: statusColor, backgroundColor: `${statusColor}12`, borderColor: `${statusColor}30` }}
                                                >
                                                    {s.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Milestone Step Indicators */}
                                        <div className="flex items-center gap-1.5 mb-4">
                                            {s.milestones.map((m, mIdx) => {
                                                const mColor = m.status === 'APPROVED' ? '#10b981' : m.status === 'SUBMITTED' ? '#f59e0b' : m.status === 'REJECTED' ? '#ef4444' : 'rgba(255,255,255,0.08)';
                                                return (
                                                    <div key={m.id} className="flex-1 flex flex-col items-center gap-1.5 group/ms relative">
                                                        {/* Step bar */}
                                                        <div className="w-full h-2 rounded-full transition-all duration-500" style={{ backgroundColor: mColor }} />
                                                        {/* Label */}
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="text-[9px] text-slate-600 truncate max-w-[80%]">{m.deliverable.replace(/^Phase \d+:\s*/, '')}</span>
                                                            <span className="text-[9px] font-bold tabular-nums" style={{ color: m.status === 'APPROVED' ? '#10b981' : '#64748b' }}>
                                                                {m.amount.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Bottom: Overall Progress */}
                                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                                            <div className="flex items-center gap-4 text-[10px]">
                                                <span className="text-slate-500">
                                                    <span className="font-bold text-slate-300">{approvedCount}</span>/{s.milestones.length} completed
                                                </span>
                                                {submittedCount > 0 && (
                                                    <span className="text-amber-400/80 font-bold flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                        {submittedCount} pending review
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <span>View Details</span>
                                                <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
