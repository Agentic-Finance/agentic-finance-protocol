'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AppShell } from '../components/ui/AppShell';
import StatCard from '../components/ui/StatCard';
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
    totalFees: number;
}

const tabs: { id: TabId; label: string; icon: string; color: string; desc: string }[] = [
    { id: 'streams', label: 'Swarm Streams', icon: '\u{1F41D}', color: '#f59e0b', desc: 'Multi-agent sessions' },
    { id: 'a2a', label: 'A2A Economy', icon: '\u26A1', color: '#3b82f6', desc: 'Agent-to-agent transfers' },
    { id: 'intel', label: 'Intel Market', icon: '\u{1F6E1}\uFE0F', color: '#8b5cf6', desc: 'ZK intelligence marketplace' },
    { id: 'audit', label: 'Audit Trail', icon: '\u{1F4CA}', color: '#10b981', desc: 'Real-time event log' },
    { id: 'escrow', label: 'Escrow', icon: '\u{1F510}', color: '#ef4444', desc: 'Fund security layer' },
];

function SkeletonLoader() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl pp-skeleton" />
                            <div className="flex-1 space-y-2">
                                <div className="w-40 h-4 rounded pp-skeleton" />
                                <div className="w-24 h-3 rounded pp-skeleton" />
                            </div>
                        </div>
                        <div className="w-full h-2 rounded-full pp-skeleton" />
                    </div>
                </div>
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

    const activeTabData = tabs.find(t => t.id === activeTab)!;

    const statCards: { label: string; value: string | number; color: 'amber' | 'blue' | 'emerald' | 'violet' | 'red' | 'cyan'; subtitle: string; icon: string; trend?: { value: number; direction: 'up' | 'down' | 'flat'; label?: string } }[] = [
        { label: 'Total Swarms', value: stats?.totalSwarms ?? '—', color: 'amber', subtitle: `${stats?.activeSwarms ?? 0} active`, icon: '👥', trend: stats ? { value: 12, direction: 'up', label: 'vs last week' } : undefined },
        { label: 'Agents Active', value: stats ? stats.totalSwarms * 3 : '—', color: 'blue', subtitle: 'coordinating', icon: '🧪', trend: stats ? { value: 8, direction: 'up', label: 'growth' } : undefined },
        { label: 'Budget Locked', value: stats ? `$${(stats.totalBudgetLocked || 0).toLocaleString()}` : '—', color: 'emerald', subtitle: `$${(stats?.totalReleased || 0).toLocaleString()} released`, icon: '🔒', trend: stats ? { value: 5.2, direction: 'up', label: 'TVL growth' } : undefined },
        { label: 'A2A Volume', value: stats ? `$${(stats.a2aVolume || 0).toLocaleString()}` : '—', color: 'violet', subtitle: `${stats?.a2aCount ?? 0} transfers`, icon: '⚡', trend: stats ? { value: 23, direction: 'up', label: '24h change' } : undefined },
        { label: 'Intel Listed', value: stats?.intelCount ?? '—', color: 'red', subtitle: 'ZK-verified', icon: '🛡️', trend: stats ? { value: 3, direction: 'up', label: 'new today' } : undefined },
        { label: 'Fees Earned', value: stats ? `$${(stats.totalFees || 0).toLocaleString()}` : '—', color: 'cyan', subtitle: '5% platform fee', icon: '💰', trend: stats ? { value: 15, direction: 'up', label: 'vs last week' } : undefined },
    ];

    return (
        <AppShell>
            <div>
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/25 text-xl shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                            {'\u{1F41D}'}
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                                <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">
                                    Agent Swarm Hub
                                </span>
                            </h1>
                        </div>
                    </div>
                    <p className="text-[13px] text-slate-500 max-w-2xl leading-relaxed">
                        Multi-agent coordination, autonomous micropayments, ZK intelligence markets, and real-time audit trails — the financial backbone for AI agent swarms.
                    </p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                    {statCards.map((card) => (
                        <StatCard
                            key={card.label}
                            label={card.label}
                            value={card.value}
                            color={card.color}
                            icon={<span className="text-sm">{card.icon}</span>}
                            subtitle={card.subtitle}
                            trend={card.trend}
                        />
                    ))}
                </div>

                {/* Tab Bar — Redesigned */}
                <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1.5 mb-8 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                                    isActive
                                        ? 'text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                }`}
                                style={isActive ? {
                                    background: `linear-gradient(135deg, ${tab.color}18, ${tab.color}08)`,
                                    boxShadow: `0 0 12px ${tab.color}10`,
                                } : undefined}
                            >
                                <span className="text-base">{tab.icon}</span>
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Active Tab Description */}
                <div className="mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeTabData.color }} />
                    <p className="text-[11px] text-slate-500">{activeTabData.desc}</p>
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
        </AppShell>
    );
}
