'use client';
import React, { useState, useEffect } from 'react';
import { useSharedWallet } from '../../providers/SharedWalletContext';

interface Stream {
    id: string;
    employer: string;
    employee: string;
    token: string;
    ratePerSecond: string;
    totalDeposited: string;
    totalClaimed: string;
    startedAt: string;
    active: boolean;
}

export default function SubscriptionsPage() {
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState(true);
    const { walletAddress } = useSharedWallet();

    useEffect(() => {
        if (!walletAddress) { setLoading(false); return; }
        fetch(`/api/streaming?wallet=${walletAddress}`)
            .then(r => r.json())
            .then(data => { if (data.streams) setStreams(data.streams); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [walletAddress]);

    const activeStreams = streams.filter(s => s.active);
    const totalDeposited = streams.reduce((sum, s) => sum + parseFloat(s.totalDeposited || '0'), 0);
    const totalClaimed = streams.reduce((sum, s) => sum + parseFloat(s.totalClaimed || '0'), 0);

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold">Subscriptions & Streams</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Real-time streaming payments on Tempo L1</p>
                </div>
                <a href="/stream" className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>+ New Stream</a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Active Streams', value: activeStreams.length.toString(), icon: '📡', color: 'var(--agt-mint)' },
                    { label: 'Total Deposited', value: `$${totalDeposited.toFixed(2)}`, icon: '💰', color: 'var(--agt-blue)' },
                    { label: 'Total Claimed', value: `$${totalClaimed.toFixed(2)}`, icon: '✅', color: 'var(--agt-orange)' },
                    { label: 'All Streams', value: streams.length.toString(), icon: '📊', color: 'var(--agt-pink)' },
                ].map((s, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{s.icon}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Stream list */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--pp-border)', borderTopColor: 'var(--agt-blue)' }} /></div>
            ) : streams.length === 0 ? (
                <div className="text-center py-16 rounded-xl" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    <span className="text-4xl block mb-3">📡</span>
                    <p className="text-sm font-semibold">No active streams</p>
                    <p className="text-xs mt-1 mb-4" style={{ color: 'var(--pp-text-muted)' }}>Create a payment stream for recurring salary or subscriptions</p>
                    <a href="/stream" className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>Create Stream</a>
                </div>
            ) : (
                <div className="space-y-3">
                    {streams.map(s => {
                        const deposited = parseFloat(s.totalDeposited || '0');
                        const claimed = parseFloat(s.totalClaimed || '0');
                        const progress = deposited > 0 ? (claimed / deposited) * 100 : 0;
                        const dailyRate = parseFloat(s.ratePerSecond || '0') * 86400;
                        return (
                            <div key={s.id} className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.active ? 'rgba(62,221,185,0.1)' : 'var(--pp-surface-1)' }}>
                                            <span className="text-lg">{s.active ? '📡' : '⏸'}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold font-mono">{s.employee.slice(0, 8)}...{s.employee.slice(-6)}</p>
                                            <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{s.token} · ${dailyRate.toFixed(2)}/day</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] px-2 py-1 rounded-full font-medium" style={{ background: s.active ? 'rgba(62,221,185,0.1)' : 'rgba(239,68,68,0.1)', color: s.active ? 'var(--agt-mint)' : '#EF4444' }}>
                                        {s.active ? '● Active' : '○ Stopped'}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--pp-surface-1)' }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, var(--agt-blue), var(--agt-mint))' }} />
                                </div>
                                <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                                    <span>Claimed: ${claimed.toFixed(2)}</span>
                                    <span>Deposited: ${deposited.toFixed(2)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
