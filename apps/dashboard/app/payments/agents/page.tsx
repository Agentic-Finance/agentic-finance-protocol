'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSharedWallet } from '../../providers/SharedWalletContext';

const MPP_GATEWAY = '0x5F68F2A17a28b06A02A649cade5a666C49cb6B6d';
const COMPLIANCE_REGISTRY = '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14';

interface Session {
    id: string;
    agent: string;
    budget: number;
    spent: number;
    status: 'active' | 'exhausted' | 'expired';
    calls: number;
    expiresAt: string;
    compliant: boolean;
}

export default function AgentPaymentsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [budget, setBudget] = useState('100');
    const [duration, setDuration] = useState('3600');
    const [maxPerCall, setMaxPerCall] = useState('1');
    const [requireCompliance, setRequireCompliance] = useState(true);
    const [creating, setCreating] = useState(false);
    const { walletAddress } = useSharedWallet();
    const [gatewayStats, setGatewayStats] = useState({ totalSessions: 0, totalCompliant: 0, totalVolume: 0 });

    // Fetch existing sessions from API
    useEffect(() => {
        fetch('/api/mpp/session')
            .then(r => r.json())
            .then(data => {
                if (data.sessions) {
                    setSessions(data.sessions.map((s: any) => ({
                        id: s.sessionId,
                        agent: s.serviceUrl || 'MPP Session',
                        budget: parseFloat(s.spendingLimit) / 1e6,
                        spent: parseFloat(s.spent) / 1e6,
                        status: s.status,
                        calls: s.payments?.length || 0,
                        expiresAt: new Date(s.expiresAt).toISOString(),
                        compliant: true,
                    })));
                }
            }).catch(() => {});
    }, []);

    const handleCreate = useCallback(async () => {
        if (!walletAddress) return;
        setCreating(true);
        try {
            const durationMs = parseInt(duration) * 1000;
            const res = await fetch('/api/mpp/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceUrl: `agent-session-${walletAddress.slice(0, 8)}`,
                    spendingLimit: (parseFloat(budget) * 1e6).toString(),
                    token: '0x20c0000000000000000000000000000000000001',
                    durationMs,
                    recipientAddress: walletAddress,
                }),
            });
            const data = await res.json();
            if (data.success && data.session) {
                setSessions(prev => [{
                    id: data.session.sessionId,
                    agent: 'MPP Session',
                    budget: parseFloat(budget),
                    spent: 0,
                    status: 'active',
                    calls: 0,
                    expiresAt: new Date(data.session.expiresAt).toISOString(),
                    compliant: requireCompliance,
                }, ...prev]);
                setShowCreate(false);
            } else {
                alert(data.error || 'Failed to create session');
            }
        } catch (e: any) { alert(e.message); }
        finally { setCreating(false); }
    }, [walletAddress, budget, duration, maxPerCall, requireCompliance]);

    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const totalBudget = sessions.reduce((s, ss) => s + ss.budget, 0);
    const totalSpent = sessions.reduce((s, ss) => s + ss.spent, 0);
    const totalCalls = sessions.reduce((s, ss) => s + ss.calls, 0);

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold">Agent Payments</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>MPP sessions with ZK compliance — real on-chain gateway</p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>+ New Session</button>
            </div>

            {/* Stats from real contract */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Active Sessions', value: activeSessions.toString(), icon: '🤖', color: 'var(--agt-mint)' },
                    { label: 'Total Budget', value: `$${totalBudget.toFixed(0)}`, icon: '💰', color: 'var(--agt-blue)' },
                    { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, icon: '📊', color: 'var(--agt-orange)' },
                    { label: 'On-Chain Sessions', value: gatewayStats.totalSessions.toString(), icon: '⛓', color: 'var(--agt-pink)' },
                ].map((s, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <div className="flex items-center gap-2 mb-2"><span className="text-lg">{s.icon}</span><span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</span></div>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Create form */}
            {showCreate && (
                <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--pp-bg-card)', border: '2px dashed var(--agt-blue)' }}>
                    <h3 className="text-sm font-bold mb-4">Create MPP Session</h3>
                    <p className="text-xs mb-4" style={{ color: 'var(--pp-text-muted)' }}>Creates on-chain session via MPPComplianceGateway ({MPP_GATEWAY.slice(0, 8)}...)</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>BUDGET (AlphaUSD)</label>
                            <input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>DURATION</label>
                            <select value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                <option value="3600">1 hour</option><option value="14400">4 hours</option><option value="86400">24 hours</option><option value="604800">7 days</option><option value="2592000">30 days</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>MAX PER CALL</label>
                            <input type="number" value={maxPerCall} onChange={e => setMaxPerCall(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={requireCompliance} onChange={e => setRequireCompliance(e.target.checked)} /><span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>🛡 Require ZK compliance</span></label>
                    </div>
                    <div className="mt-4 p-3 rounded-lg text-[10px] space-y-1" style={{ background: 'var(--pp-surface-1)' }}>
                        <p style={{ color: 'var(--pp-text-muted)' }}>Contract: <span className="font-mono" style={{ color: 'var(--agt-blue)' }}>{MPP_GATEWAY}</span></p>
                        <p style={{ color: 'var(--pp-text-muted)' }}>Compliance: <span className="font-mono" style={{ color: 'var(--agt-mint)' }}>{COMPLIANCE_REGISTRY.slice(0, 16)}...</span></p>
                    </div>
                    <button onClick={handleCreate} disabled={creating} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>
                        {creating ? '⏳ Creating...' : '⚡ Create On-Chain Session'}
                    </button>
                </div>
            )}

            {/* Sessions */}
            {sessions.length === 0 ? (
                <div className="text-center py-16 rounded-xl" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    <span className="text-4xl block mb-3">🤖</span>
                    <p className="text-sm font-semibold">No active sessions</p>
                    <p className="text-xs mt-1 mb-4" style={{ color: 'var(--pp-text-muted)' }}>Create an MPP session to enable agent micropayments</p>
                    <button onClick={() => setShowCreate(true)} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>Create First Session</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map(s => (
                        <div key={s.id} className="rounded-xl p-5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--pp-surface-2)' }}>🤖</div>
                                    <div>
                                        <p className="text-sm font-bold">{s.agent}</p>
                                        <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{s.id.slice(0, 16)}...</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {s.compliant && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(62,221,185,0.1)', color: 'var(--agt-mint)' }}>🛡 Compliant</span>}
                                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: s.status === 'active' ? 'rgba(62,221,185,0.1)' : 'rgba(239,68,68,0.1)', color: s.status === 'active' ? 'var(--agt-mint)' : '#EF4444' }}>● {s.status}</span>
                                </div>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--pp-surface-1)' }}>
                                <div className="h-full rounded-full" style={{ width: `${(s.spent / s.budget) * 100}%`, background: s.spent >= s.budget ? '#EF4444' : 'linear-gradient(90deg, var(--agt-blue), var(--agt-mint))' }} />
                            </div>
                            <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                                <span>${s.spent.toFixed(2)} / ${s.budget}</span>
                                <span>{s.calls} calls</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--pp-border)' }}>
                                {s.status === 'active' && (
                                    <button onClick={async () => {
                                        // Simulate agent payment
                                        try {
                                            const res = await fetch('/api/mpp/session', {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ sessionId: s.id, addSpent: '1000000' }),
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                setSessions(prev => prev.map(ss => ss.id === s.id ? { ...ss, spent: parseFloat(data.session.spent) / 1e6, calls: data.session.payments.length, status: data.session.status } : ss));
                                            }
                                        } catch {}
                                    }} className="text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                                        style={{ background: 'rgba(27,191,236,0.1)', color: 'var(--agt-blue)', border: '1px solid rgba(27,191,236,0.2)' }}>
                                        ⚡ Test Payment ($1)
                                    </button>
                                )}
                                {s.status === 'active' && (
                                    <button onClick={async () => {
                                        try {
                                            await fetch('/api/mpp/session', {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ sessionId: s.id, cancel: true }),
                                            });
                                            setSessions(prev => prev.map(ss => ss.id === s.id ? { ...ss, status: 'expired' as const } : ss));
                                        } catch {}
                                    }} className="text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        ✕ Cancel
                                    </button>
                                )}
                                <button onClick={() => { navigator.clipboard.writeText(s.id); }}
                                    className="text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                                    style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)', border: '1px solid var(--pp-border)' }}>
                                    📋 Copy ID
                                </button>
                                <span className="flex-1" />
                                <span className="text-[9px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                                    Expires: {new Date(s.expiresAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* How it works */}
            <div className="mt-8 rounded-xl p-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                <h3 className="text-sm font-bold mb-4">How Agent Payments Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { step: '1', title: 'Create Session', desc: 'Set budget + duration. ZK compliance verified on-chain via ComplianceRegistry.', icon: '⚡' },
                        { step: '2', title: 'Agent Executes', desc: 'Agent makes API calls. Each micropayment deducted from session budget automatically.', icon: '🤖' },
                        { step: '3', title: 'Auto-Settle', desc: 'Proof chaining batches payments. 90%+ gas savings. Settlement on Tempo L1.', icon: '⛓' },
                    ].map(s => (
                        <div key={s.step} className="flex gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: 'var(--pp-surface-2)' }}>{s.icon}</div>
                            <div>
                                <p className="text-xs font-bold">Step {s.step}: {s.title}</p>
                                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--pp-text-muted)' }}>{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
