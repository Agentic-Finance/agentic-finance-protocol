'use client';

import React, { useState } from 'react';

export type MainTabId = 'overview' | 'payroll' | 'agents' | 'payments' | 'analytics';

interface MainTabsProps {
    activeTab: MainTabId;
    onTabChange: (tab: MainTabId) => void;
    /** Number of items in boardroom queue (badge on Payroll tab) */
    boardroomCount?: number;
    /** Number of active agents (badge on Agents tab) */
    activeAgents?: number;
}

const TABS: { id: MainTabId; label: string; icon: React.ReactNode; gradient: string; borderColor: string }[] = [
    {
        id: 'overview',
        label: 'Overview',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>,
        gradient: 'linear-gradient(135deg, rgba(27,191,236,0.08), rgba(62,221,185,0.08))',
        borderColor: 'rgba(27,191,236,0.35)',
    },
    {
        id: 'payroll',
        label: 'Payroll',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
        gradient: 'linear-gradient(135deg, rgba(62,221,185,0.08), rgba(27,191,236,0.08))',
        borderColor: 'rgba(62,221,185,0.35)',
    },
    {
        id: 'agents',
        label: 'Agents',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>,
        gradient: 'linear-gradient(135deg, rgba(255,45,135,0.08), rgba(255,125,44,0.08))',
        borderColor: 'rgba(255,45,135,0.35)',
    },
    {
        id: 'payments',
        label: 'Payments',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>,
        gradient: 'linear-gradient(135deg, rgba(255,125,44,0.08), rgba(255,215,0,0.08))',
        borderColor: 'rgba(255,125,44,0.35)',
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
        gradient: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(255,45,135,0.08))',
        borderColor: 'rgba(139,92,246,0.35)',
    },
];

function DashboardMainTabs({ activeTab, onTabChange, boardroomCount = 0, activeAgents = 0 }: MainTabsProps) {
    return (
        <div className="flex items-center p-1 rounded-2xl mb-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
            {TABS.map((tab, idx) => {
                const isActive = activeTab === tab.id;
                const isNextActive = idx < TABS.length - 1 && activeTab === TABS[idx + 1].id;
                const isPrevActive = idx > 0 && activeTab === TABS[idx - 1].id;
                const badge = tab.id === 'payroll' && boardroomCount > 0 ? boardroomCount
                    : tab.id === 'agents' && activeAgents > 0 ? activeAgents
                    : 0;
                const showSeparator = idx < TABS.length - 1 && !isActive && !isNextActive;

                return (
                    <React.Fragment key={tab.id}>
                        <button
                            onClick={() => onTabChange(tab.id)}
                            className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex-1"
                            style={{
                                background: isActive ? tab.gradient : 'transparent',
                                border: isActive ? `1px solid ${tab.borderColor}` : '1px solid transparent',
                                color: isActive ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)',
                            }}
                        >
                            <span style={{ opacity: isActive ? 1 : 0.5 }}>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {badge > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                    style={{ background: tab.id === 'payroll' ? 'var(--agt-orange)' : 'var(--agt-pink)' }}>
                                    {badge}
                                </span>
                            )}
                        </button>
                        {showSeparator && (
                            <div className="w-px h-5 flex-shrink-0" style={{ background: 'var(--pp-border)' }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default React.memo(DashboardMainTabs);
