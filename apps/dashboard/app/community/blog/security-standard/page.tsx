'use client';

import React from 'react';

export default function SecurityStandardPost() {
    return (
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Security</span>
                    <span className="text-[10px] text-slate-500">March 2026</span>
                    <span className="text-[10px] text-slate-600">8 min read</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: 'var(--pp-text-primary)' }}>
                    Security Standard for Open Agentic Commerce
                </h1>
                <p className="text-base leading-relaxed" style={{ color: 'var(--pp-text-muted)' }}>
                    10 security requirements for when AI agents transact autonomously at machine speed without human oversight.
                </p>
            </header>

            <div className="space-y-8 text-[15px] leading-[1.8]" style={{ color: 'var(--pp-text-secondary)' }}>

                <section>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>Why Agent Security Is Different</h2>
                    <p>Current protocols (x402, MPP, ACP) focus on payment mechanics but lack security primitives for fraud prevention, identity verification, and dispute resolution in agent-to-agent transactions.</p>
                    <p className="mt-4">When agents transact at machine speed, new attack vectors emerge that don&#39;t exist in human commerce:</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>Threat Model</h2>
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--pp-border)' }}>
                        <table className="w-full text-[13px]">
                            <thead><tr style={{ background: 'var(--pp-surface-1)' }}>
                                <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Threat</th>
                                <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Impact</th>
                            </tr></thead>
                            <tbody>
                                {[
                                    ['Sybil Agents', 'Price manipulation, reputation gaming'],
                                    ['Stolen Session Keys', 'Unauthorized spending'],
                                    ['Replay Attacks', 'Double-spend, service theft'],
                                    ['Identity Fraud', 'Trust system compromise'],
                                    ['Compliance Evasion', 'Regulatory violation'],
                                    ['Accumulator Forgery', 'False reputation claims'],
                                ].map(([threat, impact], i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--pp-border)' }}>
                                        <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--agt-pink)' }}>{threat}</td>
                                        <td className="px-4 py-2.5" style={{ color: 'var(--pp-text-muted)' }}>{impact}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <section>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>10 Security Requirements</h2>
                    <div className="space-y-3">
                        {[
                            { id: 'SR-1', title: 'Identity Binding', desc: 'Agent identity bound to cryptographic commitment. commitment = Poseidon(address, secret)', status: 'deployed' },
                            { id: 'SR-2', title: 'Replay Prevention', desc: 'Unique nullifier per payment, checked against on-chain registry', status: 'deployed' },
                            { id: 'SR-3', title: 'Budget Enforcement', desc: 'Session keys enforce maximum spend limits', status: 'deployed' },
                            { id: 'SR-4', title: 'Temporal Bounds', desc: 'All credentials have expiration timestamps', status: 'deployed' },
                            { id: 'SR-5', title: 'Compliance Verification', desc: 'ZK proof of OFAC non-membership for AML transactions', status: 'deployed' },
                            { id: 'SR-6', title: 'Reputation Gating', desc: 'Minimum reputation scores for high-value transactions', status: 'deployed' },
                            { id: 'SR-7', title: 'Rate Limiting', desc: 'Agents rate-limited to prevent spam and exhaustion', status: 'recommended' },
                            { id: 'SR-8', title: 'Dispute Resolution', desc: 'On-chain dispute mechanism with timeout-based resolution', status: 'deployed' },
                            { id: 'SR-9', title: 'Audit Trail', desc: 'All payment events emit indexed events for monitoring', status: 'deployed' },
                            { id: 'SR-10', title: 'Graceful Degradation', desc: 'Queue transactions when compliance registry is unavailable', status: 'recommended' },
                        ].map(sr => (
                            <div key={sr.id} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                <div className="flex-shrink-0 w-14 text-center">
                                    <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--agt-blue)' }}>{sr.id}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{sr.title}</span>
                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${sr.status === 'deployed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {sr.status}
                                        </span>
                                    </div>
                                    <p className="text-[13px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>{sr.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <section>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>Regulatory Compliance</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { reg: 'EU AI Act 2026', how: 'Agent identity binding (SR-1), audit trail (SR-9)' },
                            { reg: 'OFAC Sanctions', how: 'ZK non-membership proof (SR-5)' },
                            { reg: 'AML/BSA', how: 'Amount + volume range proofs (SR-5)' },
                            { reg: 'GDPR', how: 'Zero-knowledge proofs — no personal data on-chain' },
                        ].map(r => (
                            <div key={r.reg} className="rounded-xl p-4" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                <div className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>{r.reg}</div>
                                <div className="text-[12px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>{r.how}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <section className="text-center">
                    <p className="text-lg font-semibold" style={{ color: 'var(--pp-text-primary)' }}>All security primitives are deployed and open source.</p>
                    <div className="flex flex-wrap justify-center gap-3 mt-6">
                        <a href="https://github.com/Agentic-Finance/agentic-finance-protocol/blob/main/specs/draft-agtfi-security-standard-00.md" target="_blank" rel="noopener"
                            className="text-xs font-semibold px-4 py-2 rounded-lg transition-all" style={{ background: 'var(--pp-surface-2)', color: 'var(--agt-blue)', border: '1px solid var(--pp-border)' }}>
                            Full Spec on GitHub &rarr;
                        </a>
                    </div>
                </section>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 mt-12 border-t" style={{ borderColor: 'var(--pp-border)' }}>
                <div className="flex flex-wrap gap-2">
                    {['security', 'compliance', 'OFAC', 'EU-AI-Act', 'threat-model', 'ZK-proofs'].map(tag => (
                        <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)', border: '1px solid var(--pp-border)' }}>
                            #{tag}
                        </span>
                    ))}
                </div>
                <a href="/community" className="text-xs font-semibold transition-colors flex items-center gap-1" style={{ color: 'var(--agt-blue)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Blog
                </a>
            </div>
        </article>
    );
}
