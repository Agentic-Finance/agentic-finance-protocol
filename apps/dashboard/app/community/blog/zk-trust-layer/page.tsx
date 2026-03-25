'use client';

import React from 'react';

export default function ZKTrustLayerPost() {
    return (
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            {/* Header */}
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Technical</span>
                    <span className="text-[10px] text-slate-500">March 2026</span>
                    <span className="text-[10px] text-slate-600">12 min read</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: 'var(--pp-text-primary)' }}>
                    Building the Trust Layer for Machine Payments
                </h1>
                <p className="text-base leading-relaxed" style={{ color: 'var(--pp-text-muted)' }}>
                    Every machine payment protocol solves how agents pay. None of them solve how agents trust each other while paying. We built both.
                </p>
            </header>

            {/* Content */}
            <div className="space-y-8 text-[15px] leading-[1.8]" style={{ color: 'var(--pp-text-secondary)' }}>

                <section>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>The Problem No One Is Solving</h2>
                    <p>Every machine payment protocol — x402, MPP, ACP, AP2 — solves the same problem: how agents pay. None of them solve a harder problem: <strong style={{ color: 'var(--pp-text-primary)' }}>how agents trust each other while paying.</strong></p>
                    <p className="mt-4">When Agent A pays Agent B for an API call, three questions remain unanswered:</p>
                    <ul className="mt-4 space-y-2 ml-4">
                        <li className="flex items-start gap-2"><span className="text-emerald-400 mt-1">1.</span> <span><strong style={{ color: 'var(--pp-text-primary)' }}>Is Agent A sanctioned?</strong> No protocol checks OFAC compliance for autonomous payments</span></li>
                        <li className="flex items-start gap-2"><span className="text-emerald-400 mt-1">2.</span> <span><strong style={{ color: 'var(--pp-text-primary)' }}>Is Agent B reliable?</strong> No protocol provides verifiable reputation for agents</span></li>
                        <li className="flex items-start gap-2"><span className="text-emerald-400 mt-1">3.</span> <span><strong style={{ color: 'var(--pp-text-primary)' }}>Can we verify both without destroying privacy?</strong> No protocol offers compliance + privacy simultaneously</span></li>
                    </ul>
                    <p className="mt-4">Tornado Cash showed what happens when you build privacy without compliance: shutdown. Traditional KYC shows what happens when you build compliance without privacy: surveillance.</p>
                    <p className="mt-4 text-lg font-semibold" style={{ color: 'var(--agt-mint)' }}>We built both.</p>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <section>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>ZK Compliance Proofs</h2>
                    <p>A Circom V2 circuit (13,591 constraints, PLONK) that proves:</p>
                    <div className="mt-4 rounded-xl p-5 space-y-3" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                        <div className="flex items-center gap-3"><span className="text-emerald-400">&#10003;</span> <span>Sender address is NOT on the OFAC sanctions list</span></div>
                        <div className="flex items-center gap-3"><span className="text-emerald-400">&#10003;</span> <span>Transaction amount is below the AML reporting threshold</span></div>
                        <div className="flex items-center gap-3"><span className="text-emerald-400">&#10003;</span> <span>30-day cumulative volume is below the structuring threshold</span></div>
                    </div>
                    <p className="mt-4">All without revealing the sender address, the transaction amount, or the cumulative volume.</p>

                    <div className="mt-6 grid grid-cols-3 gap-4">
                        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <div className="text-2xl font-black" style={{ color: 'var(--agt-mint)' }}>13,591</div>
                            <div className="text-[11px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Constraints</div>
                        </div>
                        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <div className="text-2xl font-black" style={{ color: 'var(--agt-blue)' }}>~15s</div>
                            <div className="text-[11px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Proof Time</div>
                        </div>
                        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <div className="text-2xl font-black" style={{ color: 'var(--agt-pink)' }}>17ms</div>
                            <div className="text-[11px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Verification</div>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <section>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>ZK Agent Reputation</h2>
                    <p>The world&#39;s first verifiable reputation system for AI agents that preserves privacy.</p>
                    <p className="mt-4">Agents prove aggregate transaction history without revealing individual transactions:</p>
                    <div className="mt-4 rounded-xl p-5" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                        <code className="text-[13px] font-mono block space-y-1" style={{ color: 'var(--agt-mint)' }}>
                            <div>claim[i] = Poseidon(agent, amount, timestamp, status)</div>
                            <div>acc[i] = Poseidon(claim[i], acc[i-1])</div>
                            <div style={{ color: 'var(--pp-text-muted)' }}>// Final accumulator registered on-chain</div>
                            <div style={{ color: 'var(--pp-text-muted)' }}>// Proof shows: acc valid AND stats meet minimums</div>
                        </code>
                    </div>
                    <p className="mt-4">41,265 constraints. 32 claims per proof. Disputes must equal zero. All verifiable, all private.</p>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <section>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>Proof Chaining for Micropayments</h2>
                    <p>When agents make thousands of API calls per hour, individual on-chain settlement is economically impossible. Our proof chaining circuit batches 16 payments into a single proof, and each new proof validates all previous proofs in the chain.</p>
                    <div className="mt-4 rounded-xl p-5 text-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                        <div className="text-3xl font-black" style={{ color: 'var(--agt-mint)' }}>90%+</div>
                        <div className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Gas reduction vs individual verification</div>
                        <div className="text-xs mt-2" style={{ color: 'var(--pp-text-muted)' }}>10,000 payments &rarr; ~40 on-chain verifications</div>
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <section>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>The Numbers</h2>
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--pp-border)' }}>
                        <table className="w-full text-[13px]">
                            <tbody>
                                {[
                                    ['Smart contracts deployed', '21+'],
                                    ['ZK circuit constraints', '96,121 total'],
                                    ['Test coverage', '11/11 passing'],
                                    ['Proof generation', '15-29 seconds'],
                                    ['On-chain verification', '17ms'],
                                    ['Security audit', 'Slither (Trail of Bits)'],
                                    ['Agents in marketplace', '50'],
                                    ['Supported protocols', 'x402, MPP, direct'],
                                ].map(([key, val], i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--pp-border)' }}>
                                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--pp-text-primary)' }}>{key}</td>
                                        <td className="px-4 py-3 font-mono text-right" style={{ color: 'var(--agt-mint)' }}>{val}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <section className="text-center">
                    <p style={{ color: 'var(--pp-text-muted)' }}>
                        The economy runs on trust. We built it for machines.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 mt-6">
                        <a href="https://github.com/Agentic-Finance/agentic-finance-protocol" target="_blank" rel="noopener"
                            className="text-xs font-semibold px-4 py-2 rounded-lg transition-all" style={{ background: 'var(--pp-surface-2)', color: 'var(--agt-blue)', border: '1px solid var(--pp-border)' }}>
                            View on GitHub &rarr;
                        </a>
                        <a href="/docs" className="text-xs font-semibold px-4 py-2 rounded-lg transition-all" style={{ background: 'var(--pp-surface-2)', color: 'var(--agt-mint)', border: '1px solid var(--pp-border)' }}>
                            Read Documentation &rarr;
                        </a>
                    </div>
                </section>
            </div>

            {/* Tags */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 mt-12 border-t" style={{ borderColor: 'var(--pp-border)' }}>
                <div className="flex flex-wrap gap-2">
                    {['ZK-SNARK', 'compliance', 'reputation', 'PLONK', 'privacy', 'MPP', 'x402'].map(tag => (
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
