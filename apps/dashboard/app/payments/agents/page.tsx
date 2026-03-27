'use client';
import React, { useState } from 'react';

export default function AgentPaymentsPage() {
    const [showNewSession, setShowNewSession] = useState(false);

    const sessions = [
        { id: 'sess-001', agent: 'Code Sentinel', budget: 100, spent: 23.5, status: 'active', calls: 47, expires: '2h 15m' },
        { id: 'sess-002', agent: 'Data Analyst', budget: 50, spent: 50, status: 'exhausted', calls: 120, expires: 'expired' },
    ];

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold">Agent Payments</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Manage MPP sessions, agent wallets, and spending limits</p>
                </div>
                <button onClick={() => setShowNewSession(!showNewSession)} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>+ New Session</button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Active Sessions', value: '1', color: 'var(--agt-mint)' },
                    { label: 'Total Budget', value: '$150', color: 'var(--agt-blue)' },
                    { label: 'Total Spent', value: '$73.50', color: 'var(--agt-orange)' },
                    { label: 'API Calls', value: '167', color: 'var(--agt-pink)' },
                ].map((s, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</p>
                        <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* New session form */}
            {showNewSession && (
                <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--agt-blue)', borderStyle: 'dashed' }}>
                    <h3 className="text-sm font-bold mb-4">Create MPP Session</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Budget (AlphaUSD)</label>
                            <input type="number" placeholder="100" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Duration</label>
                            <select className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                <option>1 hour</option><option>4 hours</option><option>24 hours</option><option>7 days</option><option>30 days</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Max per call</label>
                            <input type="number" placeholder="1.00" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked />
                            <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Require ZK compliance</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" />
                            <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Auto-renew</span>
                        </label>
                    </div>
                    <button className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>Create Session</button>
                </div>
            )}

            {/* Sessions list */}
            <div className="space-y-3">
                {sessions.map(s => (
                    <div key={s.id} className="rounded-xl p-4" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--pp-surface-2)' }}>🤖</div>
                                <div>
                                    <p className="text-sm font-bold">{s.agent}</p>
                                    <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{s.id}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] px-2 py-0.5 rounded-full" style={{
                                    background: s.status === 'active' ? 'rgba(62,221,185,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: s.status === 'active' ? 'var(--agt-mint)' : '#EF4444',
                                }}>● {s.status}</span>
                                <p className="text-[10px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>{s.expires}</p>
                            </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--pp-surface-1)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${(s.spent / s.budget) * 100}%`, background: s.spent >= s.budget ? '#EF4444' : 'linear-gradient(90deg, var(--agt-blue), var(--agt-mint))' }} />
                        </div>
                        <div className="flex justify-between text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                            <span>Spent: ${s.spent} / ${s.budget}</span>
                            <span>{s.calls} API calls</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* How it works */}
            <div className="mt-8 rounded-xl p-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                <h3 className="text-sm font-bold mb-3">How Agent Payments Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { step: '1', title: 'Create Session', desc: 'Set budget, duration, and spending limits. ZK compliance checked automatically.' },
                        { step: '2', title: 'Agent Executes', desc: 'Agent makes API calls, each micropayment deducted from session budget.' },
                        { step: '3', title: 'Auto-Settle', desc: 'Payments batched and settled on-chain. Proof chaining reduces gas 90%+.' },
                    ].map(s => (
                        <div key={s.step} className="flex gap-3">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'var(--pp-surface-2)', color: 'var(--agt-blue)' }}>{s.step}</div>
                            <div>
                                <p className="text-xs font-semibold">{s.title}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
