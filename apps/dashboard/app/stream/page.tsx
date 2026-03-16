'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import SubPageNav from '../components/SubPageNav';
import StreamProgress from '../components/StreamProgress';
import {
    StreamData,
    StreamStatCards,
    ActionBanner,
    StreamPipelineCard,
    StreamOverviewPanel,
    StreamPageSkeleton,
} from './components';

export default function StreamPage() {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [role, setRole] = useState<'client' | 'agent'>('client');
    const [streams, setStreams] = useState<StreamData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStream, setSelectedStream] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [cancelLoading, setCancelLoading] = useState(false);

    // Auto-detect wallet from MetaMask + listen for account changes
    useEffect(() => {
        const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
        if (!ethereum) return;

        const handleAccounts = (accounts: string[]) => {
            setWalletAddress(accounts?.[0] || null);
        };

        ethereum.request({ method: 'eth_accounts' }).then(handleAccounts).catch(() => {});
        ethereum.on('accountsChanged', handleAccounts);
        return () => { ethereum.removeListener('accountsChanged', handleAccounts); };
    }, []);

    const fetchStreams = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (walletAddress) {
                params.set('wallet', walletAddress);
                params.set('role', role);
            }
            if (statusFilter !== 'ALL') params.set('status', statusFilter);
            const res = await fetch(`/api/stream?${params}`);
            const data = await res.json();
            if (data.success) setStreams(data.streams);
        } catch (err) {
            console.error('Fetch streams error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, walletAddress, role]);

    useEffect(() => {
        fetchStreams();
    }, [fetchStreams]);

    // Computed counts for filter badges
    const allStreams = streams;
    const activeCount = streams.filter(s => s.status === 'ACTIVE').length;
    const completedCount = streams.filter(s => s.status === 'COMPLETED').length;
    const cancelledCount = streams.filter(s => s.status === 'CANCELLED').length;
    const pendingReviewCount = streams.reduce((sum, s) => sum + s.milestones.filter(m => m.status === 'SUBMITTED').length, 0);

    const selected = selectedStream ? streams.find(s => s.id === selectedStream) : null;

    // Cancel stream handler (passed to overview panel)
    const handleCancelStream = async () => {
        if (!selected) return;
        if (!confirm('Are you sure you want to cancel this stream? Unreleased funds will be refunded.')) return;
        setCancelLoading(true);
        try {
            const res = await fetch('/api/stream/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(walletAddress ? { 'X-Wallet-Address': walletAddress } : {}),
                },
                body: JSON.stringify({ streamJobId: selected.id }),
            });
            const data = await res.json();
            if (data.success) {
                setSelectedStream(null);
                fetchStreams();
            }
        } catch (err) { console.error('Cancel error:', err); }
        finally { setCancelLoading(false); }
    };

    const filters = [
        { key: 'ALL', label: 'All', count: allStreams.length },
        { key: 'ACTIVE', label: 'Active', count: activeCount },
        { key: 'COMPLETED', label: 'Completed', count: completedCount },
        { key: 'CANCELLED', label: 'Cancelled', count: cancelledCount },
    ];

    return (
        <div className="min-h-screen bg-[#111B2E]">
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
                                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
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
                                    {r === 'client' ? '\u{1F464} Client View' : '\u{1F916} Agent View'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {isLoading ? (
                    <StreamPageSkeleton />
                ) : selected ? (
                    /* ── Detail View: Two-Panel Layout ── */
                    <div>
                        <button
                            onClick={() => setSelectedStream(null)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 mb-6 flex items-center gap-2 transition-colors bg-indigo-500/[0.06] hover:bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/15"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Back to all streams
                        </button>
                        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
                            {/* Left: Overview Panel */}
                            <div className="lg:sticky lg:top-20 lg:self-start">
                                <StreamOverviewPanel
                                    stream={selected}
                                    walletAddress={walletAddress || ''}
                                    onCancel={handleCancelStream}
                                    isLoading={cancelLoading}
                                />
                            </div>
                            {/* Right: Milestone Timeline */}
                            <div className="min-h-[50vh]">
                                <StreamProgress
                                    stream={selected}
                                    walletAddress={walletAddress || ''}
                                    onRefresh={fetchStreams}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── List View ── */
                    <>
                        {/* Stats */}
                        <StreamStatCards streams={streams} />

                        {/* Action Banner */}
                        <ActionBanner pendingCount={pendingReviewCount} />

                        {/* Filter Bar */}
                        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1.5 mb-6 w-fit">
                            {filters.map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setStatusFilter(f.key)}
                                    className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${
                                        statusFilter === f.key
                                            ? 'bg-white/[0.08] text-white shadow-sm'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                    }`}
                                >
                                    {f.label}
                                    <span className="ml-1.5 text-[9px] opacity-60">({f.count})</span>
                                </button>
                            ))}
                        </div>

                        {/* Stream Cards Grid */}
                        {streams.length === 0 ? (
                            <div className="text-center py-24 bg-[#111827] rounded-2xl border border-dashed border-white/[0.08]">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                    <span className="text-3xl">{'\u{1F504}'}</span>
                                </div>
                                <p className="text-slate-300 text-lg font-bold mb-2">No Streams Yet</p>
                                <p className="text-slate-600 text-sm max-w-sm mx-auto">
                                    Streams are created when agents accept milestone-based jobs from the Marketplace.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {streams.map((s, idx) => (
                                    <StreamPipelineCard
                                        key={s.id}
                                        stream={s}
                                        index={idx}
                                        onClick={() => setSelectedStream(s.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
