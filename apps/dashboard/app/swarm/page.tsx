'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import SubPageNav from '../components/SubPageNav';
import dynamic from 'next/dynamic';

// Lazy-load tab components
const SwarmStreamsTab = dynamic(() => import('../components/swarm/SwarmStreamsTab'), { ssr: false });
const A2AEconomyTab = dynamic(() => import('../components/swarm/A2AEconomyTab'), { ssr: false });
const IntelMarketTab = dynamic(() => import('../components/swarm/IntelMarketTab'), { ssr: false });
const AuditTimelineTab = dynamic(() => import('../components/swarm/AuditTimelineTab'), { ssr: false });
const SwarmEscrowTab = dynamic(() => import('../components/swarm/SwarmEscrowTab'), { ssr: false });

type TabId = 'streams' | 'a2a' | 'intel' | 'audit' | 'escrow';

interface Stats {
    totalSwarms: number;
    activeSwarms: number;
    totalBudgetLocked: number;
    a2aVolume: number;
    intelCount: number;
    auditCount: number;
    a2aCount: number;
    totalEscrowLocked: number;
    totalReleased: number;
}

const tabs: { id: TabId; label: string; icon: string; color: string }[] = [
    { id: 'streams', label: 'Swarm Streams', icon: '🐝', color: '#f59e0b' },
    { id: 'a2a', label: 'A2A Economy', icon: '⚡', color: '#3b82f6' },
    { id: 'intel', label: 'Intel Market', icon: '🛡️', color: '#8b5cf6' },
    { id: 'audit', label: 'Audit Trail', icon: '📊', color: '#10b981' },
    { id: 'escrow', label: 'Escrow', icon: '🔐', color: '#ef4444' },
];

function SkeletonLoader() {
    return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
            ))}
        </div>
    );
}

export default function SwarmPage() {
    const [activeTab, setActiveTab] = useState<TabId>('streams');
    const [stats, setStats] = useState<Stats | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/swarm/stats');
            const data = await res.json();
            if (data.success) setStats(data.stats);
        } catch (err) {
            console.error('Fetch swarm stats error:', err);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(() => { if (!document.hidden) fetchStats(); }, 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    const statCards = [
        { label: 'Total Swarms', value: stats?.totalSwarms ?? '-', icon: '🐝', color: '#f59e0b', sub: `${stats?.activeSwarms ?? 0} active` },
        { label: 'Agents Active', value: stats ? stats.totalSwarms * 3 : '-', icon: '🤖', color: '#3b82f6', sub: 'coordinating' },
        { label: 'Budget Locked', value: stats ? `$${(stats.totalBudgetLocked || 0).toLocaleString()}` : '-', icon: '🔒', color: '#10b981', sub: `$${(stats?.totalReleased || 0).toLocaleString()} released` },
        { label: 'A2A Volume', value: stats ? `$${(stats.a2aVolume || 0).toLocaleString()}` : '-', icon: '⚡', color: '#8b5cf6', sub: `${stats?.a2aCount ?? 0} transfers` },
        { label: 'Intel Listed', value: stats?.intelCount ?? '-', icon: '🛡️', color: '#ef4444', sub: 'ZK-verified' },
    ];

    return (
        <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d1a 50%, #0a0a12 100%)' }}>
            <SubPageNav />

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">🐝</span>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                            <span style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                Agent Swarm Hub
                            </span>
                        </h1>
                    </div>
                    <p className="text-sm text-slate-400 max-w-2xl">
                        Multi-agent coordination, autonomous micropayments, ZK intelligence markets, and real-time audit trails — the financial backbone for AI agent swarms.
                    </p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                    {statCards.map((card, i) => (
                        <div
                            key={i}
                            className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-4 transition-all duration-300 hover:border-white/[0.12] hover:scale-[1.02]"
                            style={{ background: `linear-gradient(135deg, ${card.color}08 0%, transparent 60%)` }}
                        >
                            <div className="absolute top-2 right-2 text-xl opacity-40">{card.icon}</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{card.label}</div>
                            <div className="text-xl sm:text-2xl font-black tabular-nums" style={{ color: card.color }}>
                                {card.value}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{card.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Tab Bar */}
                <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1.5 mb-8 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                }`}
                                style={isActive ? {
                                    background: `linear-gradient(135deg, ${tab.color}20 0%, ${tab.color}08 100%)`,
                                    borderBottom: `2px solid ${tab.color}`,
                                } : undefined}
                            >
                                <span className="text-base">{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <Suspense fallback={<SkeletonLoader />}>
                    {activeTab === 'streams' && <SwarmStreamsTab />}
                    {activeTab === 'a2a' && <A2AEconomyTab />}
                    {activeTab === 'intel' && <IntelMarketTab />}
                    {activeTab === 'audit' && <AuditTimelineTab />}
                    {activeTab === 'escrow' && <SwarmEscrowTab />}
                </Suspense>
            </div>
        </div>
    );
}
