'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface IntelData {
    id: string;
    sourceAgentId: string | null;
    zkCommitment: string;
    category: string;
    title: string;
    summary: string;
    dataHash: string;
    qualityScore: number | null;
    price: number;
    token: string;
    buyerWallet: string | null;
    status: string;
    createdAt: string;
}

interface CategoryStat {
    name: string;
    count: number;
    avgPrice: number;
    avgQuality: number;
}

const categoryIcons: Record<string, string> = {
    security: '🛡️',
    defi: '💎',
    market: '📊',
    governance: '🏛️',
};

const categoryColors: Record<string, string> = {
    security: '#ef4444',
    defi: '#3b82f6',
    market: '#f59e0b',
    governance: '#8b5cf6',
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    LISTED: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', label: 'Listed' },
    VERIFIED: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', label: 'Verified' },
    PURCHASED: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', label: 'Purchased' },
    EXPIRED: { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8', label: 'Expired' },
};

export default function IntelMarketTab() {
    const [submissions, setSubmissions] = useState<IntelData[]>([]);
    const [categories, setCategories] = useState<CategoryStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams({ limit: '50' });
            if (filter !== 'all') params.set('category', filter);
            const res = await fetch(`/api/intel/market?${params}`);
            const data = await res.json();
            if (data.success) {
                setSubmissions(data.submissions);
                setCategories(data.categories);
            }
        } catch (err) {
            console.error('Fetch intel market error:', err);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Category Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                >
                    All ({submissions.length})
                </button>
                {['security', 'defi', 'market', 'governance'].map((cat) => {
                    const stat = categories.find(c => c.name === cat);
                    return (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                filter === cat
                                    ? 'text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                            style={filter === cat ? { background: `${categoryColors[cat]}20`, color: categoryColors[cat] } : undefined}
                        >
                            <span>{categoryIcons[cat]}</span>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            {stat && <span className="text-[9px] opacity-60">({stat.count})</span>}
                        </button>
                    );
                })}
            </div>

            {/* Intel Grid */}
            {submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <span className="text-6xl mb-4">🛡️</span>
                    <h3 className="text-xl font-bold text-white mb-2">No Intelligence Listed</h3>
                    <p className="text-sm text-slate-400">
                        ZK-verified intelligence submissions will appear here.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {submissions.map((intel) => {
                        const catColor = categoryColors[intel.category] || '#3b82f6';
                        const status = statusConfig[intel.status] || statusConfig.LISTED;

                        return (
                            <div
                                key={intel.id}
                                className="rounded-2xl border border-white/[0.06] p-5 transition-all duration-300 hover:border-white/[0.12] hover:scale-[1.01]"
                                style={{ background: `linear-gradient(135deg, ${catColor}05 0%, transparent 60%)` }}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{categoryIcons[intel.category] || '📄'}</span>
                                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                            style={{ background: `${catColor}15`, color: catColor }}>
                                            {intel.category}
                                        </span>
                                    </div>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                                        style={{ background: status.bg, color: status.text }}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* Title & Summary */}
                                <h4 className="text-sm font-bold text-white mb-1.5 line-clamp-2">{intel.title}</h4>
                                <p className="text-[11px] text-slate-400 line-clamp-2 mb-4">{intel.summary}</p>

                                {/* ZK Badge + Quality */}
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                        <span className="text-[10px]">🔐</span>
                                        <span className="text-[9px] font-bold text-purple-400">ZK-Verified</span>
                                    </div>
                                    {intel.qualityScore !== null && (
                                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                                            <span className="text-[10px]">⭐</span>
                                            <span className="text-[9px] font-bold text-green-400">{intel.qualityScore}/100</span>
                                        </div>
                                    )}
                                </div>

                                {/* Price & Hash */}
                                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                                    <div>
                                        <div className="text-lg font-black tabular-nums" style={{ color: catColor }}>
                                            ${intel.price}
                                        </div>
                                        <div className="text-[9px] text-slate-600">{intel.token}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-slate-600 font-mono">
                                            {intel.zkCommitment.slice(0, 12)}...
                                        </div>
                                        <div className="text-[9px] text-slate-600">
                                            {new Date(intel.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
