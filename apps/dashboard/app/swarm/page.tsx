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

// 3D Topology Visualization (heavy — lazy loaded)
const SwarmTopology3D = dynamic(() => import('../components/swarm/SwarmTopology3D'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[420px] rounded-2xl border border-white/[0.06] overflow-hidden relative"
            style={{ background: 'radial-gradient(ellipse at center, rgba(17,27,46,1) 0%, rgba(8,12,21,1) 100%)' }}>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-3 animate-pulse">{'\u{1F41D}'}</div>
                    <p className="text-sm text-slate-500">Loading 3D Swarm Topology...</p>
                </div>
            </div>
        </div>
    ),
});

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
    const [show3D, setShow3D] = useState(true);

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

    const statCards = [
        { label: 'Total Swarms', value: stats?.totalSwarms ?? '-', color: '#f59e0b', sub: `${stats?.activeSwarms ?? 0} active`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={1.5} opacity={0.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          ),
        },
        { label: 'Agents Active', value: stats ? stats.totalSwarms * 3 : '-', color: '#3b82f6', sub: 'coordinating',
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5} opacity={0.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          ),
        },
        { label: 'Budget Locked', value: stats ? `$${(stats.totalBudgetLocked || 0).toLocaleString()}` : '-', color: '#10b981', sub: `$${(stats?.totalReleased || 0).toLocaleString()} released`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={1.5} opacity={0.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          ),
        },
        { label: 'A2A Volume', value: stats ? `$${(stats.a2aVolume || 0).toLocaleString()}` : '-', color: '#8b5cf6', sub: `${stats?.a2aCount ?? 0} transfers`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={1.5} opacity={0.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          ),
        },
        { label: 'Intel Listed', value: stats?.intelCount ?? '-', color: '#ef4444', sub: 'ZK-verified',
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.5} opacity={0.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          ),
        },
        { label: 'Fees Earned', value: stats ? `$${(stats.totalFees || 0).toLocaleString()}` : '-', color: '#06b6d4', sub: '5% platform fee',
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth={1.5} opacity={0.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
    ];

    return (
        <div className="min-h-screen bg-[#111B2E]">
            <SubPageNav />

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
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
                        {/* Toggle 3D Viz */}
                        <button
                            onClick={() => setShow3D(!show3D)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                show3D
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-white'
                            }`}
                        >
                            <span>{show3D ? '\u{1F30D}' : '\u{1F4CA}'}</span>
                            {show3D ? '3D Topology' : 'Show 3D'}
                        </button>
                    </div>
                    <p className="text-[13px] text-slate-500 max-w-2xl leading-relaxed">
                        Multi-agent coordination, autonomous micropayments, ZK intelligence markets, and real-time audit trails — the financial backbone for AI agent swarms.
                    </p>
                </div>

                {/* ── 3D Swarm Topology Visualization ── */}
                {show3D && (
                    <div className="mb-8">
                        <SwarmTopology3D stats={stats} onSelectTab={(tab) => setActiveTab(tab as TabId)} />
                    </div>
                )}

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                    {statCards.map((card) => (
                        <div key={card.label}
                            className="relative overflow-hidden rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition-all"
                            style={{ background: `linear-gradient(135deg, ${card.color}08, transparent 60%)` }}>
                            <div className="p-4">
                                <div className="absolute top-3 right-3">{card.icon}</div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
                                <p className="text-xl sm:text-2xl font-black tabular-nums" style={{ color: card.color }}>
                                    {card.value}
                                </p>
                                <p className="text-[10px] text-slate-600 mt-0.5">{card.sub}</p>
                            </div>
                        </div>
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
        </div>
    );
}
