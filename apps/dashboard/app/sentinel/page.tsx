'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AppShell } from '../components/ui/AppShell';

const SentinelDashboard = dynamic(() => import('../components/sentinel/SentinelDashboard'), {
    ssr: false,
    loading: () => (
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
            {/* Header skeleton */}
            <div>
                <div className="w-32 h-3 pp-skeleton rounded mb-2" />
                <div className="w-48 h-7 pp-skeleton rounded mb-1" />
                <div className="w-64 h-3 pp-skeleton rounded" />
            </div>
            {/* Tabs skeleton */}
            <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-24 h-10 pp-skeleton rounded-xl" />
                ))}
            </div>
            {/* Stats skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'var(--pp-bg-card)' }}>
                        <div className="w-full h-2 mb-2 pp-skeleton rounded" />
                        <div className="w-16 h-6 pp-skeleton rounded" />
                    </div>
                ))}
            </div>
            {/* Globe skeleton */}
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ minHeight: '360px', background: 'radial-gradient(ellipse at center, #101828 0%, #0a0f1a 100%)' }}>
                <div className="flex items-center justify-center h-[360px]">
                    <div className="w-40 h-40 rounded-full pp-skeleton" />
                </div>
            </div>
        </div>
    ),
});

export default function SentinelPage() {
    return (
        <AppShell>
            <SentinelDashboard />
        </AppShell>
    );
}
