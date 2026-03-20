'use client';

import React from 'react';

/**
 * Contextual skeleton loaders using the existing .pp-skeleton CSS class.
 * These replace the generic spinner (<LazyFallback />) with shimmer
 * placeholders that match the actual component layouts.
 */

/** Skeleton for a single stat card in the TopStatsCards grid */
export function StatCardSkeleton() {
    return (
        <div className="p-4 sm:p-6 flex flex-col border border-[var(--pp-border)] rounded-2xl bg-[var(--pp-bg-card)]">
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl pp-skeleton" />
                <div className="w-16 h-5 rounded-lg pp-skeleton" />
            </div>
            <div className="w-20 h-3 mb-2 pp-skeleton" />
            <div className="w-32 h-7 pp-skeleton" />
        </div>
    );
}

/** Skeleton grid for the 4 stat cards */
export function StatsGridSkeleton() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
            ))}
        </div>
    );
}

/** Skeleton for the OmniTerminal section */
export function TerminalSkeleton() {
    return (
        <div className="pp-card p-4 sm:p-6 mb-10 min-h-[120px]">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl pp-skeleton" />
                <div className="flex-1">
                    <div className="w-40 h-4 mb-2 pp-skeleton" />
                    <div className="w-64 h-3 pp-skeleton" />
                </div>
            </div>
            <div className="w-full h-12 rounded-xl pp-skeleton" />
        </div>
    );
}

/** Skeleton for the Protocol Volume chart section */
export function ChartSkeleton() {
    return (
        <div className="relative z-20 mb-10">
            <div className="p-4 sm:p-8 flex flex-col border border-white/[0.08] rounded-3xl bg-[#151B27]/95">
                <div className="flex justify-between items-center pb-6 mb-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl pp-skeleton" />
                        <div className="w-36 h-6 pp-skeleton" />
                    </div>
                </div>
                <div className="w-full h-[200px] rounded-xl pp-skeleton" />
            </div>
        </div>
    );
}

/** Skeleton for the Boardroom section */
export function BoardroomSkeleton() {
    return (
        <div className="pp-card p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl pp-skeleton" />
                    <div className="w-28 h-6 pp-skeleton" />
                </div>
                <div className="w-24 h-8 rounded-lg pp-skeleton" />
            </div>
            {/* Table rows */}
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-black/20 rounded-xl">
                        <div className="w-8 h-8 rounded-lg pp-skeleton" />
                        <div className="flex-1">
                            <div className="w-32 h-4 mb-1 pp-skeleton" />
                            <div className="w-48 h-3 pp-skeleton" />
                        </div>
                        <div className="w-20 h-5 pp-skeleton" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Skeleton for the LedgerHistory / TimeVault sidebar */
export function SidebarSkeleton() {
    return (
        <div className="pp-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg pp-skeleton" />
                <div className="w-24 h-5 pp-skeleton" />
            </div>
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                        <div className="flex-1">
                            <div className="w-24 h-3 mb-1 pp-skeleton" />
                            <div className="w-16 h-3 pp-skeleton" />
                        </div>
                        <div className="w-14 h-4 pp-skeleton" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Generic section skeleton (used as default fallback) */
export function SectionSkeleton() {
    return (
        <div className="rounded-3xl border border-white/5 min-h-[200px] p-6 space-y-4" style={{ background: 'var(--pp-bg-card)' }}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl pp-skeleton" />
                <div className="w-32 h-5 pp-skeleton" />
            </div>
            <div className="w-full h-4 pp-skeleton" />
            <div className="w-3/4 h-4 pp-skeleton" />
            <div className="w-1/2 h-4 pp-skeleton" />
        </div>
    );
}

/** Skeleton for tab content panels (Cortex, Swarm, etc.) */
export function TabSkeleton() {
    return (
        <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-white/[0.06] p-4" style={{ background: 'var(--pp-bg-card)' }}>
                        <div className="w-16 h-3 mb-3 pp-skeleton" />
                        <div className="w-12 h-6 pp-skeleton" />
                        <div className="w-20 h-3 mt-2 pp-skeleton" />
                    </div>
                ))}
            </div>
            <div className="rounded-2xl border border-white/[0.06] p-4" style={{ background: 'var(--pp-bg-card)' }}>
                <div className="w-40 h-5 mb-4 pp-skeleton" />
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg pp-skeleton" />
                            <div className="flex-1">
                                <div className="w-32 h-3 mb-1 pp-skeleton" />
                                <div className="w-48 h-3 pp-skeleton" />
                            </div>
                            <div className="w-16 h-4 pp-skeleton" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Skeleton for globe/3D visualizations */
export function GlobeSkeleton() {
    return (
        <div className="rounded-2xl border border-[var(--pp-border)] min-h-[400px] flex flex-col items-center justify-center gap-4" style={{ background: 'linear-gradient(180deg, var(--pp-bg-card) 0%, var(--pp-bg-card) 50%, var(--pp-bg-card) 100%)' }}>
            <div className="w-32 h-32 rounded-full pp-skeleton" />
            <div className="w-28 h-3 pp-skeleton" />
        </div>
    );
}
