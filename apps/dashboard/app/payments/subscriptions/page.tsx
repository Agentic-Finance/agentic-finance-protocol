'use client';
import React from 'react';

export default function SubscriptionsPage() {
    const streams = [
        { name: 'Alice Dev Salary', recipient: '0x7a58...9e4', rate: '$50/day', status: 'active', deposited: 1500, claimed: 450, progress: 30 },
        { name: 'Bob Design Contract', recipient: '0x3C44...3BC', rate: '$30/day', status: 'active', deposited: 900, claimed: 180, progress: 20 },
    ];

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold">Subscriptions & Streams</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Manage recurring payments, salary streams, and subscriptions</p>
                </div>
                <a href="/stream" className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>+ New Stream</a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Active Streams', value: '2', sub: 'streaming now', color: 'var(--agt-mint)' },
                    { label: 'Total Deposited', value: '$2,400', sub: 'across all streams', color: 'var(--agt-blue)' },
                    { label: 'Monthly Outflow', value: '$2,400', sub: 'estimated', color: 'var(--agt-orange)' },
                ].map((s, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</p>
                        <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Stream list */}
            <div className="space-y-3">
                {streams.map((s, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-sm font-bold">{s.name}</p>
                                <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{s.recipient}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-mono font-medium" style={{ color: 'var(--agt-mint)' }}>{s.rate}</p>
                                <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(62,221,185,0.1)', color: 'var(--agt-mint)' }}>● {s.status}</span>
                            </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--pp-surface-1)' }}>
                            <div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: 'linear-gradient(90deg, var(--agt-blue), var(--agt-mint))' }} />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                            <span>Claimed: ${s.claimed}</span>
                            <span>Deposited: ${s.deposited}</span>
                        </div>
                    </div>
                ))}
                {streams.length === 0 && (
                    <div className="text-center py-16 rounded-xl" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <p className="text-3xl mb-3">📡</p>
                        <p className="text-sm font-medium">No active subscriptions</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>Create a payment stream to start recurring payments</p>
                    </div>
                )}
            </div>
        </div>
    );
}
