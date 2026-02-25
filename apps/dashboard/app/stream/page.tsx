'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StreamProgress from '../components/StreamProgress';
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
        if (!walletAddress) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ wallet: walletAddress, role });
            if (statusFilter !== 'ALL') params.set('status', statusFilter);
            const res = await fetch(`/api/stream?${params}`);
            const data = await res.json();
            if (data.success) setStreams(data.streams);
        } catch (err) {
            console.error('Fetch streams error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [walletAddress, role, statusFilter]);

    useEffect(() => {
        fetchStreams();
    }, [fetchStreams]);

    const activeStreams = streams.filter(s => s.status === 'ACTIVE');
    const completedStreams = streams.filter(s => s.status === 'COMPLETED');
    const totalBudget = streams.reduce((sum, s) => sum + s.totalBudget, 0);
    const totalReleased = streams.reduce((sum, s) => sum + s.releasedAmount, 0);

    const selected = selectedStream ? streams.find(s => s.id === selectedStream) : null;

    return (
        <div className="min-h-screen bg-[#0B1120]">
            {/* Header */}
            <div className="border-b border-white/[0.08] pp-glass sticky top-0 z-40">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Stream Settlement</h1>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Progressive Milestone Payments</p>
                            </div>
                        </div>

                        {/* Role Tabs */}
                        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
                            {(['client', 'agent'] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => { setRole(r); setSelectedStream(null); }}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        role === r
                                            ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                                            : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    As {r === 'client' ? 'Client' : 'Agent'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    {[
                        { label: 'Total Streams', value: streams.length, color: '#818cf8' },
                        { label: 'Active', value: activeStreams.length, color: '#f59e0b' },
                        { label: 'Completed', value: completedStreams.length, color: '#10b981' },
                        { label: 'Total Volume', value: `$${totalBudget.toFixed(0)}`, color: '#d946ef' },
                    ].map((stat) => (
                        <div key={stat.label} className="pp-card px-4 sm:px-5 py-4">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filter Row */}
                <div className="flex items-center gap-2 mb-6">
                    {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                statusFilter === f
                                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                                    : 'text-slate-500 hover:text-white bg-white/[0.02] border border-white/[0.05]'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {!walletAddress ? (
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-lg font-bold mb-2">Connect Wallet</p>
                        <p className="text-slate-600 text-sm">Connect your wallet to view stream settlements</p>
                    </div>
                ) : isLoading ? (
                    <div className="text-center py-20">
                        <p className="text-slate-500 font-mono text-sm animate-pulse">Loading streams...</p>
                    </div>
                ) : selected ? (
                    /* Detail View */
                    <div>
                        <button
                            onClick={() => setSelectedStream(null)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 mb-4 flex items-center gap-1 transition-colors"
                        >
                            ← Back to list
                        </button>
                        <StreamProgress
                            stream={selected}
                            walletAddress={walletAddress}
                            onRefresh={fetchStreams}
                        />
                    </div>
                ) : streams.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-3xl mb-4">🔄</p>
                        <p className="text-slate-400 text-lg font-bold mb-2">No Streams Yet</p>
                        <p className="text-slate-600 text-sm">
                            {role === 'client'
                                ? 'Create a stream from the Agent Marketplace to get started.'
                                : 'Streams assigned to you will appear here.'}
                        </p>
                    </div>
                ) : (
                    /* Stream List */
                    <div className="space-y-3">
                        {streams.map((s) => {
                            const approvedCount = s.milestones.filter(m => m.status === 'APPROVED').length;
                            const submittedCount = s.milestones.filter(m => m.status === 'SUBMITTED').length;
                            const progressPercent = s.totalBudget > 0 ? (s.releasedAmount / s.totalBudget) * 100 : 0;
                            const statusColor = s.status === 'COMPLETED' ? '#10b981' : s.status === 'CANCELLED' ? '#ef4444' : '#818cf8';

                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedStream(s.id)}
                                    className="w-full text-left bg-[#111827] border border-white/[0.05] rounded-xl px-6 py-4 hover:border-white/[0.12] transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">
                                                {s.status === 'COMPLETED' ? '✅' : s.status === 'CANCELLED' ? '🚫' : '🔄'}
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                                                    {role === 'client'
                                                        ? `Agent: ${s.agentName || s.agentWallet.slice(0, 10) + '...'}`
                                                        : `Client: ${s.clientWallet.slice(0, 10) + '...'}`}
                                                </p>
                                                <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                                                    {new Date(s.createdAt).toLocaleDateString()} • {s.milestones.length} milestones
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-white tabular-nums">${s.totalBudget.toFixed(2)}</span>
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                                style={{ color: statusColor, backgroundColor: `${statusColor}10`, borderColor: `${statusColor}25` }}
                                            >
                                                {s.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${progressPercent}%`,
                                                    background: 'linear-gradient(to right, #818cf8, #d946ef)',
                                                }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-bold tabular-nums">
                                            {approvedCount}/{s.milestones.length}
                                            {submittedCount > 0 && (
                                                <span className="text-amber-400 ml-1">({submittedCount} pending review)</span>
                                            )}
                                        </span>
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
