'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ChargeIntent {
    intentId: string;
    serviceUrl: string;
    amount: string;
    status: string;
    createdAt: number;
}

interface MppSession {
    sessionId: string;
    serviceUrl: string;
    spendingLimit: string;
    spent: string;
    status: string;
    expiresAt: number;
}

function MppDashboard() {
    const [intents, setIntents] = useState<ChargeIntent[]>([]);
    const [sessions, setSessions] = useState<MppSession[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const [chargeRes, sessionRes] = await Promise.all([
                fetch('/api/mpp/charge'),
                fetch('/api/mpp/session'),
            ]);
            if (chargeRes.ok) {
                const d = await chargeRes.json();
                setIntents(d.intents || []);
            }
            if (sessionRes.ok) {
                const d = await sessionRes.json();
                setSessions(d.sessions || []);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchData();
        const poll = setInterval(fetchData, 15000);
        return () => clearInterval(poll);
    }, [fetchData]);

    const hasData = intents.length > 0 || sessions.length > 0;

    return (
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    MPP Protocol
                </h4>
                <span className="text-[10px] font-mono text-blue-400/50 bg-blue-400/10 px-2 py-0.5 rounded-full">
                    Stripe + Tempo
                </span>
            </div>

            {!hasData ? (
                <div className="text-center py-6 border border-dashed border-white/[0.06] rounded-lg">
                    <p className="text-xs text-white/25">No active MPP intents</p>
                    <p className="text-[10px] text-white/15 mt-1">Machine-to-machine charges appear here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Charge Intents */}
                    {intents.length > 0 && (
                        <div>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2">Charges</p>
                            {intents.slice(0, 5).map(intent => (
                                <div key={intent.intentId} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                                    <div className="min-w-0">
                                        <p className="text-xs text-white/70 truncate">{intent.serviceUrl}</p>
                                        <p className="text-[10px] text-white/20 font-mono">{intent.intentId.slice(0, 16)}...</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <p className="text-xs font-bold text-white font-mono">{intent.amount}</p>
                                        <span className={`text-[9px] font-mono ${
                                            intent.status === 'settled' ? 'text-emerald-400/70' :
                                            intent.status === 'pending' ? 'text-amber-400/70' : 'text-white/30'
                                        }`}>{intent.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Sessions */}
                    {sessions.length > 0 && (
                        <div>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2">Sessions</p>
                            {sessions.slice(0, 3).map(session => {
                                const limit = parseFloat(session.spendingLimit) || 1;
                                const spent = parseFloat(session.spent) || 0;
                                const pct = Math.min((spent / limit) * 100, 100);
                                const isExpired = Date.now() > session.expiresAt;

                                return (
                                    <div key={session.sessionId} className="py-2 border-b border-white/[0.03] last:border-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs text-white/70 truncate">{session.serviceUrl}</p>
                                            <span className={`text-[9px] font-mono ${
                                                session.status === 'active' && !isExpired ? 'text-emerald-400/70' :
                                                session.status === 'exhausted' ? 'text-amber-400/70' : 'text-white/30'
                                            }`}>{isExpired ? 'expired' : session.status}</span>
                                        </div>
                                        <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                            <div className="h-full rounded-full bg-blue-400/50 transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <p className="text-[10px] text-white/20 font-mono mt-0.5">{spent.toFixed(2)} / {limit.toFixed(2)} aUSD</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default React.memo(MppDashboard);
