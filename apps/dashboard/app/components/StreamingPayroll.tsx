'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Stream {
    id: string;
    employeeName: string;
    employeeWallet: string;
    ratePerSecond: string;
    totalDeposited: string;
    totalClaimed: string;
    accrued: string;
    claimable: string;
    elapsedSeconds: number;
    status: string;
    startTime: string;
    stopTime: string | null;
}

function StreamingPayroll({ walletAddress }: { walletAddress: string }) {
    const [streams, setStreams] = useState<Stream[]>([]);
    const [tick, setTick] = useState(0);

    const fetchStreams = useCallback(async () => {
        try {
            const res = await fetch(`/api/streaming?wallet=${walletAddress}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.success) setStreams(data.streams || []);
        } catch { /* ignore */ }
    }, [walletAddress]);

    useEffect(() => {
        fetchStreams();
        const poll = setInterval(fetchStreams, 10000);
        return () => clearInterval(poll);
    }, [fetchStreams]);

    // Tick counter for real-time accrual animation
    useEffect(() => {
        if (streams.length === 0) return;
        const timer = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, [streams.length]);

    if (streams.length === 0) {
        return (
            <div id="section-streams" className="scroll-mt-20 rounded-xl bg-white/[0.025] border border-white/[0.06] p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Streaming Payroll
                    </h3>
                    <span className="text-[10px] font-mono text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">per-second</span>
                </div>
                <div className="text-center py-8">
                    <p className="text-sm text-white/30">No active salary streams</p>
                    <p className="text-xs text-white/15 mt-1">Create a stream via OmniTerminal or API</p>
                </div>
            </div>
        );
    }

    return (
        <div id="section-streams" className="scroll-mt-20 rounded-xl bg-white/[0.025] border border-white/[0.06] p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    Streaming Payroll
                </h3>
                <span className="text-[10px] font-mono text-emerald-400/60 bg-emerald-400/10 px-2 py-0.5 rounded-full">{streams.length} active</span>
            </div>

            <div className="space-y-3">
                {streams.map(stream => {
                    const rate = parseFloat(stream.ratePerSecond);
                    const deposited = parseFloat(stream.totalDeposited);
                    const claimed = parseFloat(stream.totalClaimed);
                    const startMs = new Date(stream.startTime).getTime();
                    const elapsed = Math.floor((Date.now() - startMs) / 1000);
                    const accrued = Math.min(elapsed * rate, deposited);
                    const claimable = Math.max(0, accrued - claimed);
                    const pct = deposited > 0 ? Math.min((accrued / deposited) * 100, 100) : 0;

                    return (
                        <div key={stream.id} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="text-sm font-bold text-white">{stream.employeeName}</span>
                                    <span className="text-[10px] text-white/20 font-mono ml-2">{stream.employeeWallet.slice(0, 6)}...{stream.employeeWallet.slice(-4)}</span>
                                </div>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${stream.status === 'active' ? 'text-emerald-400/70 bg-emerald-400/10' : 'text-white/30 bg-white/[0.05]'}`}>
                                    {stream.status}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 rounded-full bg-white/[0.04] mb-2 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-400/60 transition-all duration-1000" style={{ width: `${pct}%` }} />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <div className="font-mono">
                                    <span className="text-emerald-400 font-bold">{accrued.toFixed(4)}</span>
                                    <span className="text-white/20"> / {deposited.toFixed(2)} aUSD</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-white/30">Claimable: </span>
                                    <span className="text-emerald-400 font-bold font-mono">{claimable.toFixed(4)}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-white/15 font-mono mt-1">{rate.toFixed(6)} aUSD/sec</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default React.memo(StreamingPayroll);
