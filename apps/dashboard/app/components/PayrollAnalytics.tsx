'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AnalyticsData {
    summary: {
        totalEmployees: number;
        totalMonthlySalary: number;
        avgCostPerHead: number;
        totalPayoutVolume: number;
        totalPayouts: number;
        shieldedPct: number;
        annualForecast: number;
    };
    departmentBreakdown: Array<{
        department: string;
        headcount: number;
        totalSalary: number;
        avgSalary: number;
    }>;
    monthlyTrend: Array<{
        month: string;
        volume: number;
        txCount: number;
    }>;
    topRecipients: Array<{
        name: string;
        wallet: string;
        totalReceived: number;
        txCount: number;
    }>;
}

interface PayrollAnalyticsProps {
    walletAddress: string | null;
    isAdmin: boolean;
}

function PayrollAnalytics({ walletAddress, isAdmin }: PayrollAnalyticsProps) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exportFormat, setExportFormat] = useState('');

    const fetchAnalytics = useCallback(async () => {
        if (!walletAddress) return;
        try {
            const res = await fetch(`/api/payroll-analytics?wallet=${walletAddress}`);
            const json = await res.json();
            if (json.success) setData(json.analytics);
        } catch {} finally { setLoading(false); }
    }, [walletAddress]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const handleExport = async (format: string) => {
        if (!walletAddress) return;
        const url = `/api/accounting-sync?wallet=${walletAddress}&format=${format}`;
        window.open(url, '_blank');
        setExportFormat('');
    };

    const handleExportReceipts = () => {
        if (!walletAddress) return;
        window.open(`/api/export-receipt?wallet=${walletAddress}&format=csv`, '_blank');
    };

    if (!isAdmin) return null;

    const s = data?.summary;

    return (
        <div className="agt-card p-5 sm:p-6" style={{ borderImage: 'linear-gradient(135deg, rgba(255,45,135,0.15), rgba(27,191,236,0.15)) 1' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="agt-icon-box" style={{ background: 'linear-gradient(135deg, rgba(255,45,135,0.15), rgba(27,191,236,0.15))', color: 'var(--agt-pink)' }}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-bold" style={{ color: 'var(--pp-text-primary)' }}>Payroll Analytics</h2>
                        <p className="text-[11px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>Cost breakdown &bull; Trends &bull; Forecasting</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExportReceipts} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: 'var(--pp-border)', color: 'var(--pp-text-muted)' }}>
                        Export Receipts
                    </button>
                    <div className="relative">
                        <select value={exportFormat} onChange={e => { if (e.target.value) handleExport(e.target.value); }} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border appearance-none cursor-pointer" style={{ background: 'var(--pp-bg-elevated)', borderColor: 'var(--pp-border)', color: 'var(--pp-text-muted)' }}>
                            <option value="">Accounting Sync</option>
                            <option value="quickbooks">QuickBooks (IIF)</option>
                            <option value="xero">Xero (CSV)</option>
                            <option value="csv">Generic CSV</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl pp-skeleton" />)}
                </div>
            ) : !s ? (
                <p className="text-center py-8 text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>No analytics data yet.</p>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        <StatCard label="Employees" value={s.totalEmployees.toString()} sub="active" />
                        <StatCard label="Monthly Payroll" value={`$${s.totalMonthlySalary.toLocaleString()}`} sub={`$${s.avgCostPerHead.toLocaleString()}/head`} />
                        <StatCard label="Total Disbursed" value={`$${s.totalPayoutVolume.toLocaleString()}`} sub={`${s.totalPayouts} payouts`} />
                        <StatCard label="Annual Forecast" value={`$${s.annualForecast.toLocaleString()}`} sub={`${s.shieldedPct}% shielded`} accent />
                    </div>

                    {/* Department Breakdown + Monthly Trend */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Departments */}
                        <div className="rounded-xl p-4 border" style={{ background: 'var(--pp-bg-elevated)', borderColor: 'var(--pp-border)' }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>Department Breakdown</h3>
                            {data.departmentBreakdown.length === 0 ? (
                                <p className="text-[11px] py-4 text-center" style={{ color: 'var(--pp-text-muted)' }}>Add departments to employees to see breakdown</p>
                            ) : (
                                <div className="space-y-2">
                                    {data.departmentBreakdown.map(dept => {
                                        const maxSalary = Math.max(...data.departmentBreakdown.map(d => d.totalSalary));
                                        const pct = maxSalary > 0 ? (dept.totalSalary / maxSalary) * 100 : 0;
                                        return (
                                            <div key={dept.department}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[11px] font-medium" style={{ color: 'var(--pp-text-secondary)' }}>{dept.department}</span>
                                                    <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--pp-text-primary)' }}>${dept.totalSalary.toLocaleString()} <span style={{ color: 'var(--pp-text-muted)' }}>({dept.headcount})</span></span>
                                                </div>
                                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--pp-surface-1)' }}>
                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--agt-pink), var(--agt-blue))' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Monthly Trend */}
                        <div className="rounded-xl p-4 border" style={{ background: 'var(--pp-bg-elevated)', borderColor: 'var(--pp-border)' }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>Monthly Payroll Trend</h3>
                            {data.monthlyTrend.length === 0 ? (
                                <p className="text-[11px] py-4 text-center" style={{ color: 'var(--pp-text-muted)' }}>Complete payouts to see monthly trends</p>
                            ) : (
                                <div className="space-y-2">
                                    {data.monthlyTrend.map(m => {
                                        const maxVol = Math.max(...data.monthlyTrend.map(t => t.volume));
                                        const pct = maxVol > 0 ? (m.volume / maxVol) * 100 : 0;
                                        return (
                                            <div key={m.month}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[11px] font-mono" style={{ color: 'var(--pp-text-secondary)' }}>{m.month}</span>
                                                    <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--pp-text-primary)' }}>${m.volume.toLocaleString()} <span style={{ color: 'var(--pp-text-muted)' }}>({m.txCount} tx)</span></span>
                                                </div>
                                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--pp-surface-1)' }}>
                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--agt-mint)' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Recipients */}
                    {data.topRecipients.length > 0 && (
                        <div className="mt-4 rounded-xl p-4 border" style={{ background: 'var(--pp-bg-elevated)', borderColor: 'var(--pp-border)' }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>Top Recipients</h3>
                            <div className="space-y-1.5">
                                {data.topRecipients.slice(0, 5).map((r, i) => (
                                    <div key={r.wallet} className="flex items-center gap-3 py-1.5">
                                        <span className="text-[10px] font-bold w-5 text-center" style={{ color: 'var(--pp-text-muted)' }}>#{i + 1}</span>
                                        <span className="text-[11px] font-medium flex-1" style={{ color: 'var(--pp-text-secondary)' }}>{r.name}</span>
                                        <span className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{r.txCount} tx</span>
                                        <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--agt-mint)' }}>${r.totalReceived.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
    return (
        <div className="rounded-xl p-3.5 border" style={{ background: accent ? 'linear-gradient(135deg, rgba(255,45,135,0.05), rgba(27,191,236,0.05))' : 'var(--pp-bg-elevated)', borderColor: accent ? 'rgba(255,45,135,0.15)' : 'var(--pp-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--pp-text-muted)' }}>{label}</p>
            <p className="text-lg font-bold font-mono" style={{ color: 'var(--pp-text-primary)' }}>{value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{sub}</p>
        </div>
    );
}

export default React.memo(PayrollAnalytics);
