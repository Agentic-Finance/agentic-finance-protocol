'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Payment {
    id: string;
    amount: number;
    token: string;
    note: string;
    isShielded: boolean;
    status: string;
    date: string;
    txHash: string;
    fromWorkspace: string;
}

interface PortalData {
    totalEarned: string;
    pendingAmount: string;
    totalPayments: number;
    pendingCount: number;
    shieldedCount: number;
    paymentHistory: Payment[];
    pendingPayments: Payment[];
    monthlyBreakdown: Record<string, number>;
}

function EmployeePortal({ walletAddress }: { walletAddress: string }) {
    const [data, setData] = useState<PortalData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPortal = useCallback(async () => {
        try {
            const res = await fetch(`/api/employee-portal?wallet=${walletAddress}`);
            if (!res.ok) return;
            const json = await res.json();
            if (json.success) setData(json);
        } catch { /* ignore */ }
        setLoading(false);
    }, [walletAddress]);

    useEffect(() => {
        fetchPortal();
        const poll = setInterval(fetchPortal, 30000);
        return () => clearInterval(poll);
    }, [fetchPortal]);

    if (loading) {
        return (
            <div className="rounded-xl p-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-40 rounded" style={{ background: 'var(--pp-surface-2)' }} />
                    <div className="grid grid-cols-3 gap-4">
                        {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg" style={{ background: 'var(--pp-surface-2)' }} />)}
                    </div>
                </div>
            </div>
        );
    }

    if (!data || (data.totalPayments === 0 && data.pendingCount === 0)) {
        return (
            <div className="rounded-xl p-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                <h3 className="text-base font-bold mb-2" style={{ color: 'var(--pp-text-primary)' }}>My Earnings</h3>
                <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>No payments received yet. Your salary history will appear here.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl p-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--pp-text-primary)' }}>My Earnings</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>Payment history for {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full" style={{ background: 'var(--pp-surface-2)', color: 'var(--pp-text-muted)' }}>
                    employee view
                </span>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="rounded-lg p-3" style={{ background: 'var(--pp-surface-2)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>Total Earned</p>
                    <p className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--agt-mint)' }}>${data.totalEarned}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--pp-surface-2)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>Pending</p>
                    <p className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--agt-orange)' }}>${data.pendingAmount}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--pp-surface-2)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>Payments</p>
                    <p className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--pp-text-primary)' }}>{data.totalPayments}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--pp-surface-2)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>ZK Shielded</p>
                    <p className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--agt-pink)' }}>{data.shieldedCount}</p>
                </div>
            </div>

            {/* Pending Payments */}
            {data.pendingPayments.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--agt-orange)' }}>
                        Pending ({data.pendingCount})
                    </h4>
                    <div className="space-y-2">
                        {data.pendingPayments.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--agt-orange) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--agt-orange) 15%, transparent)' }}>
                                <div>
                                    <span className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>{p.amount} {p.token}</span>
                                    <span className="text-xs ml-2" style={{ color: 'var(--pp-text-muted)' }}>from {p.fromWorkspace}</span>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--agt-orange) 15%, transparent)', color: 'var(--agt-orange)' }}>
                                    {p.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Payment History */}
            <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>
                    History ({data.totalPayments})
                </h4>
                <div className="space-y-1">
                    {data.paymentHistory.slice(0, 20).map(p => (
                        <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors" style={{ borderBottom: '1px solid var(--pp-surface-1)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--pp-surface-2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{
                                    background: p.isShielded ? 'color-mix(in srgb, var(--agt-pink) 10%, transparent)' : 'var(--pp-surface-2)',
                                }}>
                                    {p.isShielded ? (
                                        <svg className="w-4 h-4" style={{ color: 'var(--agt-pink)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>+{p.amount} {p.token}</span>
                                        {p.isShielded && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--agt-pink) 10%, transparent)', color: 'var(--agt-pink)' }}>ZK</span>}
                                    </div>
                                    <p className="text-[11px] truncate" style={{ color: 'var(--pp-text-muted)' }}>{p.note || p.fromWorkspace}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                                <p className="text-[11px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                                    {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                                {p.txHash && (
                                    <a href={`https://explore.moderato.tempo.xyz/tx/${p.txHash}`} target="_blank" rel="noreferrer"
                                        className="text-[9px] font-mono hover:underline" style={{ color: 'var(--agt-blue)' }}>
                                        {p.txHash.slice(0, 8)}...
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default React.memo(EmployeePortal);
