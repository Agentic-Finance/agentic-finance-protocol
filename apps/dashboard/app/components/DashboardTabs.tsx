'use client';

import React, { useState, lazy, Suspense } from 'react';
import { ChartBarIcon } from './icons';

const WorkspaceDashboard = lazy(() => import('./WorkspaceDashboard'));
const ProtocolDashboard = lazy(() => import('./ProtocolDashboard'));

interface DashboardTabsProps {
    walletAddress: string | null;
    workspaceStats: any | null;
    agentStatus: string;
    onRangeChange?: (range: string) => void;
    activeRange?: string;
}

function DashboardTabs({ walletAddress, workspaceStats, agentStatus, onRangeChange, activeRange = '7d' }: DashboardTabsProps) {
    const hasWallet = !!walletAddress;
    const [activeTab, setActiveTab] = useState<'workspace' | 'protocol'>(hasWallet ? 'workspace' : 'protocol');

    const tabs = [
        { id: 'workspace' as const, label: 'My Workspace', icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" /></svg>
        ), disabled: !hasWallet },
        { id: 'protocol' as const, label: 'Protocol', icon: (
            <ChartBarIcon className="w-3.5 h-3.5" />
        ), disabled: false },
    ];

    const TabSkeleton = () => (
        <div className="p-5 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-5 border-b border-white/[0.06]">
                <div className="w-9 h-9 rounded-xl pp-skeleton" />
                <div className="space-y-1.5">
                    <div className="w-44 h-5 rounded pp-skeleton" />
                    <div className="w-28 h-3 rounded pp-skeleton" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="h-64 rounded-2xl pp-skeleton" />
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl pp-skeleton" />)}
                </div>
            </div>
        </div>
    );

    return (
        <div>
            {/* ── Tab Bar ── */}
            <div className="flex items-center gap-1 px-5 sm:px-8 pt-5 sm:pt-6">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && setActiveTab(tab.id)}
                            disabled={tab.disabled}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wider
                                transition-all duration-200 border
                                ${isActive
                                    ? 'bg-white/[0.08] border-white/[0.12] text-white'
                                    : tab.disabled
                                        ? 'border-transparent text-slate-600 cursor-not-allowed'
                                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] cursor-pointer'
                                }
                            `}
                            title={tab.disabled ? 'Connect wallet to view workspace' : undefined}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ── */}
            <div>
                {activeTab === 'workspace' && hasWallet && (
                    <Suspense fallback={<TabSkeleton />}>
                        <WorkspaceDashboard stats={workspaceStats} agentStatus={agentStatus} onRangeChange={onRangeChange} activeRange={activeRange} />
                    </Suspense>
                )}
                {activeTab === 'protocol' && (
                    <Suspense fallback={<TabSkeleton />}>
                        <ProtocolDashboard />
                    </Suspense>
                )}
            </div>
        </div>
    );
}

export default React.memo(DashboardTabs);
