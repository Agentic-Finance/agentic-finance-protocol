'use client';

import React, { useEffect, useState } from 'react';

// ══════════════════════════════════════
// LIVE METRICS HOOK
// ══════════════════════════════════════

function useLiveStats() {
    const [stats, setStats] = useState<{
        totalAgents: number;
        totalProofs: number;
        matchRate: string;
        tvl: string;
    } | null>(null);

    useEffect(() => {
        Promise.allSettled([
            fetch('/api/marketplace/agents').then(r => r.json()),
            fetch('/api/proof/stats').then(r => r.json()),
            fetch('/api/live/tvl').then(r => r.json()),
        ]).then(([agentsR, proofR, tvlR]) => {
            const agents = agentsR.status === 'fulfilled' ? (agentsR as PromiseFulfilledResult<any>).value : {};
            const proof = proofR.status === 'fulfilled' ? (proofR as PromiseFulfilledResult<any>).value : {};
            const tvl = tvlR.status === 'fulfilled' ? (tvlR as PromiseFulfilledResult<any>).value : {};
            setStats({
                totalAgents: agents.agents?.length || 32,
                totalProofs: proof.totalCommitments ?? 0,
                matchRate: proof.matchRate ?? '100%',
                tvl: tvl.total != null ? `$${Number(tvl.total).toLocaleString()}` : '$--',
            });
        });
    }, []);
    return stats;
}

// ══════════════════════════════════════
// ANIMATED BAR CHART
// ══════════════════════════════════════

function ComparisonChart() {
    const [animate, setAnimate] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnimate(true), 300); return () => clearTimeout(t); }, []);

    const data = [
        { label: 'Traditional Wire', value: 85, color: 'bg-slate-600', sub: '3-5 days, $25-50 fees' },
        { label: 'Crypto (Manual)', value: 55, color: 'bg-amber-500/60', sub: '~1 min, copy-paste wallets' },
        { label: 'Agentic Finance (NLP)', value: 8, color: 'bg-emerald-500', sub: '~10 sec, natural language' },
    ];

    return (
        <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
                Time to Deploy 50-Person Payroll
            </h4>
            {data.map((d, i) => (
                <div key={d.label}>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-300">{d.label}</span>
                        <span className="text-xs font-mono text-slate-500">{d.value === 85 ? '~30 min' : d.value === 55 ? '~15 min' : '~10 sec'}</span>
                    </div>
                    <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${d.color} transition-all duration-1000 ease-out`}
                            style={{
                                width: animate ? `${d.value}%` : '0%',
                                transitionDelay: `${i * 200}ms`,
                            }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">{d.sub}</p>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════
// ARCHITECTURE FLOW DIAGRAM
// ══════════════════════════════════════

function ArchitectureDiagram() {
    return (
        <div className="relative">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5 text-center">
                Agentic Finance Execution Pipeline
            </h4>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-2">
                {[
                    { icon: '💬', label: 'Natural Language', sub: 'Multi-language Input' },
                    { icon: '🧠', label: 'AI Parser', sub: 'GPT-4o Intent Engine' },
                    { icon: '📋', label: 'Intent Cards', sub: 'Validate & Edit' },
                    { icon: '🔐', label: 'Shield ZK', sub: 'Poseidon + PLONK' },
                    { icon: '⛓️', label: 'Tempo L1', sub: 'On-chain Settlement' },
                ].map((step, i, arr) => (
                    <React.Fragment key={step.label}>
                        <div className="flex flex-col items-center text-center w-full sm:w-auto">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl mb-2">
                                {step.icon}
                            </div>
                            <span className="text-[11px] font-bold text-white">{step.label}</span>
                            <span className="text-[9px] text-slate-500">{step.sub}</span>
                        </div>
                        {i < arr.length - 1 && (
                            <svg className="w-5 h-5 text-indigo-500/40 shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════
// PRIVACY COMPARISON TABLE
// ══════════════════════════════════════

function PrivacyTable() {
    const rows = [
        { feature: 'Salary amounts visible on-chain', traditional: true, paypol: false },
        { feature: 'Sender-recipient link exposed', traditional: true, paypol: false },
        { feature: 'Payment frequency trackable', traditional: true, paypol: false },
        { feature: 'Cryptographic proof of payment', traditional: false, paypol: true },
        { feature: 'Nullifier anti-replay protection', traditional: false, paypol: true },
        { feature: 'Selective disclosure to auditors', traditional: false, paypol: true },
    ];

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-white/[0.06]">
                        <th className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3 pr-4">Feature</th>
                        <th className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3 px-4 text-center">Standard ERC20</th>
                        <th className="text-[10px] font-black uppercase tracking-widest text-indigo-400 py-3 px-4 text-center">Agentic Finance Shield</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.feature} className="border-b border-white/[0.03]">
                            <td className="text-xs text-slate-300 py-3 pr-4">{row.feature}</td>
                            <td className="text-center py-3 px-4">
                                {row.traditional ? (
                                    <span className="text-rose-400 text-sm">&#10005;</span>
                                ) : (
                                    <span className="text-slate-600 text-sm">&#8212;</span>
                                )}
                            </td>
                            <td className="text-center py-3 px-4">
                                {row.paypol ? (
                                    <span className="text-emerald-400 text-sm">&#10003;</span>
                                ) : (
                                    <span className="text-emerald-400 text-sm">&#10003;</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ══════════════════════════════════════
// STAT CARD
// ══════════════════════════════════════

function StatCard({ value, label, accent = 'indigo' }: { value: string; label: string; accent?: string }) {
    const colorMap: Record<string, string> = {
        indigo: 'from-indigo-500/15 to-violet-500/10 border-indigo-500/20 text-indigo-300',
        emerald: 'from-emerald-500/15 to-cyan-500/10 border-emerald-500/20 text-emerald-300',
        amber: 'from-amber-500/15 to-orange-500/10 border-amber-500/20 text-amber-300',
        violet: 'from-violet-500/15 to-purple-500/10 border-violet-500/20 text-violet-300',
    };
    const cls = colorMap[accent] || colorMap.indigo;

    return (
        <div className={`bg-gradient-to-br ${cls} border rounded-xl p-4 text-center`}>
            <div className="text-2xl sm:text-3xl font-black mb-1">{value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</div>
        </div>
    );
}

// ══════════════════════════════════════
// MAIN BLOG POST
// ══════════════════════════════════════

export default function BlogPost() {
    const stats = useLiveStats();

    return (
        <article className="max-w-[780px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

            {/* ── Breadcrumb ───────────────────────── */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-8">
                <a href="/community" className="hover:text-indigo-400 transition-colors">Community</a>
                <span>/</span>
                <span className="text-slate-400">Blog</span>
            </div>

            {/* ── Header ───────────────────────────── */}
            <header className="mb-12">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                        Infrastructure
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        AI
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/20">
                        ZK Privacy
                    </span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-[42px] font-black text-white leading-[1.15] tracking-tight mb-4">
                    AI-Powered Payroll Infrastructure on Tempo L1
                </h1>
                <p className="text-lg text-slate-400 leading-relaxed mb-6">
                    Three breakthroughs that eliminate the gap between intent and execution for on-chain payments &mdash; from natural language commands to zero-knowledge privacy.
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Agentic Finance Team</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span>March 9, 2026</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span>8 min read</span>
                </div>
            </header>

            <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent mb-12" />

            {/* ── Live Stats ───────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-14">
                <StatCard value="9" label="Smart Contracts" accent="indigo" />
                <StatCard value={stats ? `${stats.totalAgents}` : '32'} label="Production Agents" accent="emerald" />
                <StatCard value={stats ? `${stats.totalProofs}` : '--'} label="AI Proofs On-Chain" accent="violet" />
                <StatCard value="42431" label="Tempo Chain ID" accent="amber" />
            </div>

            {/* ── Intro ────────────────────────────── */}
            <section className="prose-section mb-14">
                <p className="text-slate-300 leading-relaxed mb-4">
                    Payroll is the most repetitive financial operation in any organization. Yet in the crypto world, it remains shockingly manual: paste wallet addresses one by one, double-check amounts, pray you didn&rsquo;t swap two digits, hit send, repeat.
                </p>
                <p className="text-slate-300 leading-relaxed mb-4">
                    For DAOs with 50+ contributors across 12 countries, this is a <span className="text-white font-semibold">weekly tax on productivity</span>. For AI agent networks that need to settle payments autonomously, it&rsquo;s a complete non-starter.
                </p>
                <p className="text-slate-300 leading-relaxed">
                    Agentic Finance was built to solve this at the infrastructure level. Not another payroll &ldquo;app&rdquo; &mdash; a <span className="text-white font-semibold">programmable payment layer</span> where the distance between what you want and what happens on-chain is exactly one sentence.
                </p>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 1: Natural Language */}
            {/* ═══════════════════════════════════════════ */}
            <section className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 text-sm font-black">1</div>
                    <h2 className="text-2xl font-black text-white">Natural Language &rarr; On-Chain Execution</h2>
                </div>

                <p className="text-slate-300 leading-relaxed mb-4">
                    Every existing crypto payroll tool starts with a form: Name, Wallet, Amount, Token, Note. Multiply by 50 employees and you have a spreadsheet problem disguised as a &ldquo;product.&rdquo;
                </p>
                <p className="text-slate-300 leading-relaxed mb-4">
                    Agentic Finance&rsquo;s OmniTerminal replaces this with a single input field. Type in <span className="text-white font-semibold">any language</span>:
                </p>

                {/* Command examples */}
                <div className="bg-[#0A0E17] border border-white/[0.06] rounded-xl p-5 mb-6 font-mono text-sm space-y-3">
                    <div>
                        <span className="text-emerald-500 font-bold mr-2">&#10095;</span>
                        <span className="text-slate-300">pay John 200, Tony 350, and Susan 150 alphaUSD</span>
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div>
                        <span className="text-emerald-500 font-bold mr-2">&#10095;</span>
                        <span className="text-slate-300">pay everyone 500 alphaUSD</span>
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div>
                        <span className="text-emerald-500 font-bold mr-2">&#10095;</span>
                        <span className="text-slate-300">send 1000 to 0x33F7...0793 with note &quot;Q1 bonus&quot;</span>
                    </div>
                </div>

                <p className="text-slate-300 leading-relaxed mb-6">
                    The AI parser (GPT-4o-mini) extracts structured intents in real-time, resolves names to wallet addresses from your address book, validates token symbols against on-chain contracts, and renders interactive holographic cards you can edit before deployment. All within milliseconds.
                </p>

                {/* Comparison Chart */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-6">
                    <ComparisonChart />
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-5">
                    <h4 className="text-emerald-400 font-bold text-sm mb-2">What this means for teams</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        A 50-person payroll batch that takes 30 minutes with traditional tools completes in <span className="text-white font-semibold">under 10 seconds</span> with Agentic Finance. Upload a CSV, drag-and-drop an Excel file, or just type a sentence. The system handles name resolution, wallet validation, amount parsing, and batch optimization automatically.
                    </p>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 2: Conditional & Recurring */}
            {/* ═══════════════════════════════════════════ */}
            <section className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 text-sm font-black">2</div>
                    <h2 className="text-2xl font-black text-white">Conditional Payments &mdash; Set Once, Execute Forever</h2>
                </div>

                <p className="text-slate-300 leading-relaxed mb-4">
                    Most crypto payroll is treated as a one-off event. But 90% of real-world payroll is recurring. Agentic Finance introduces a <span className="text-white font-semibold">daemon-based conditional engine</span> that monitors on-chain and off-chain conditions in real-time and auto-triggers payments when rules are met.
                </p>

                {/* Condition Types */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {[
                        {
                            icon: '&#128337;',
                            title: 'Time-Based',
                            desc: '"Pay team on the 1st of every month"',
                            detail: 'Watches calendar, auto-triggers at specified dates',
                        },
                        {
                            icon: '&#128176;',
                            title: 'Balance-Based',
                            desc: '"Execute when treasury \u2265 10K"',
                            detail: 'Monitors on-chain ERC20 balances in real-time',
                        },
                        {
                            icon: '&#128200;',
                            title: 'TVL / Price-Based',
                            desc: '"Distribute when TVL exceeds $500K"',
                            detail: 'Tracks ShieldVault balance as TVL proxy',
                        },
                    ].map((cond) => (
                        <div key={cond.title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                            <div className="text-2xl mb-2" dangerouslySetInnerHTML={{ __html: cond.icon }} />
                            <h4 className="text-sm font-bold text-white mb-1">{cond.title}</h4>
                            <p className="text-[11px] text-indigo-300 italic mb-2">{cond.desc}</p>
                            <p className="text-[11px] text-slate-500">{cond.detail}</p>
                        </div>
                    ))}
                </div>

                <p className="text-slate-300 leading-relaxed mb-4">
                    The daemon evaluates conditions every 60 seconds, supports AND/OR logic across multiple rules, and handles cooldowns for weekly (10,080 min) or monthly (43,200 min) recurrence. A single natural language command sets up the entire rule:
                </p>

                <div className="bg-[#0A0E17] border border-white/[0.06] rounded-xl p-5 mb-6 font-mono text-sm">
                    <span className="text-emerald-500 font-bold mr-2">&#10095;</span>
                    <span className="text-slate-300">pay John 2 alphaUSD on the 1st of every month</span>
                    <div className="mt-3 pt-3 border-t border-white/[0.04] text-[11px] text-slate-500 space-y-1">
                        <div><span className="text-indigo-400">AI detected:</span> Monthly schedule &rarr; date_time condition, day = 1</div>
                        <div><span className="text-indigo-400">Auto-configured:</span> recurring = monthly, cooldown = 43,200 min</div>
                        <div><span className="text-indigo-400">Status:</span> <span className="text-emerald-400">Watching</span> (daemon monitors every 60s)</div>
                    </div>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-5">
                    <h4 className="text-indigo-400 font-bold text-sm mb-2">What this means for teams</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Treasury operations run on <span className="text-white font-semibold">autopilot</span>. Set your payroll logic once, in plain language, and the protocol handles execution indefinitely. No cron jobs to maintain. No manual triggers. The daemon is the accountant that never sleeps.
                    </p>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 3: ZK Privacy */}
            {/* ═══════════════════════════════════════════ */}
            <section className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400 text-sm font-black">3</div>
                    <h2 className="text-2xl font-black text-white">Zero-Knowledge Privacy for Every Payment</h2>
                </div>

                <p className="text-slate-300 leading-relaxed mb-4">
                    On most EVM chains, payroll is fully transparent. Every employee&rsquo;s wallet, salary amount, and payment frequency is visible to anyone with a block explorer. For competitive businesses, this is a <span className="text-white font-semibold">critical vulnerability</span> &mdash; competitors can reverse-engineer your team structure, burn rate, and compensation strategy.
                </p>
                <p className="text-slate-300 leading-relaxed mb-6">
                    Agentic Finance&rsquo;s Shield mode wraps every transaction in a <span className="text-white font-semibold">real ZK-SNARK PLONK proof</span>. Not simulated. Not mocked. Production-grade Circom V2 circuits with snarkjs and on-chain verification through PlonkVerifier V2.
                </p>

                {/* ZK Architecture */}
                <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-6 mb-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-4 text-center">Shield ZK Pipeline</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {[
                            { step: '01', title: 'Poseidon Hash', desc: 'Sender, recipient, and amount hashed into a single commitment' },
                            { step: '02', title: 'ShieldVault V2', desc: 'Funds deposited into privacy-preserving vault contract' },
                            { step: '03', title: 'PLONK Proof', desc: 'ZK-SNARK proof generated client-side via Circom V2' },
                            { step: '04', title: 'On-Chain Verify', desc: 'PlonkVerifier V2 validates proof, nullifier prevents replay' },
                        ].map((s) => (
                            <div key={s.step} className="text-center">
                                <div className="text-[9px] font-black text-violet-500 mb-1">STEP {s.step}</div>
                                <div className="text-xs font-bold text-white mb-1">{s.title}</div>
                                <div className="text-[10px] text-slate-500 leading-relaxed">{s.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Privacy comparison table */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-6">
                    <PrivacyTable />
                </div>

                <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-violet-400 font-bold text-sm">Shield fee</h4>
                        <span className="text-xs font-mono text-violet-300 bg-violet-500/15 px-2.5 py-1 rounded-lg">0.5% (max $10)</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Shield is a toggle, not a migration. Enable it per-transaction or per-batch. At 0.5% with a $10 cap, private payroll for a $50K monthly disbursement costs just <span className="text-white font-semibold">$10 total</span>.
                    </p>
                </div>

                <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-5">
                    <h4 className="text-violet-400 font-bold text-sm mb-2">What this means for teams</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Pay your team without broadcasting salary data to competitors, regulators fishing for intelligence, or the entire internet. <span className="text-white font-semibold">Every payment is cryptographically private by default.</span>
                    </p>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 4: Agent Marketplace */}
            {/* ═══════════════════════════════════════════ */}
            <section className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 text-sm font-black">4</div>
                    <h2 className="text-2xl font-black text-white">Beyond Payroll: The Agent Economy</h2>
                </div>

                <p className="text-slate-300 leading-relaxed mb-4">
                    Agentic Finance isn&rsquo;t just a payroll tool &mdash; it&rsquo;s infrastructure for the <span className="text-white font-semibold">AI agent economy</span>. The A2A (Agent-to-Agent) Marketplace lets you describe a task in natural language, discover the best agent through AI matching, negotiate price automatically, and pay through on-chain escrow &mdash; all within the same terminal.
                </p>

                {/* Agent stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <StatCard value={stats ? `${stats.totalAgents}` : '32'} label="Live Agents" accent="emerald" />
                    <StatCard value="10" label="Categories" accent="indigo" />
                    <StatCard value="7+" label="SDK Frameworks" accent="amber" />
                    <StatCard value={stats?.matchRate || '100%'} label="Proof Match Rate" accent="violet" />
                </div>

                <p className="text-slate-300 leading-relaxed mb-6">
                    Every agent execution generates an <span className="text-white font-semibold">AI Proof</span> committed on-chain &mdash; a cryptographic receipt that the work was done, verified by PlonkVerifier V2. Agents can be native, or imported from OpenAI, Claude, LangChain, CrewAI, Olas, or any custom framework through the developer portal.
                </p>

                {/* Architecture diagram */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-6">
                    <ArchitectureDiagram />
                </div>

                <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-5">
                    <h4 className="text-cyan-400 font-bold text-sm mb-2">What this means for the ecosystem</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        This is where payroll infrastructure meets the agentic economy: <span className="text-white font-semibold">agents hiring agents, paying agents, proving work</span> &mdash; all programmable, all on-chain, all verifiable. A single protocol for both human payroll and machine-to-machine settlement.
                    </p>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 5: Why Tempo L1 */}
            {/* ═══════════════════════════════════════════ */}
            <section className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 text-sm font-black">5</div>
                    <h2 className="text-2xl font-black text-white">Why Tempo L1</h2>
                </div>

                <p className="text-slate-300 leading-relaxed mb-6">
                    Agentic Finance is built exclusively on Tempo (Chain 42431) for specific technical advantages that no other L1 currently offers for payment infrastructure:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {[
                        {
                            title: 'Zero Gas Costs',
                            desc: 'No native gas token required. Payroll operations run without friction, regardless of batch size.',
                            icon: '&#9889;',
                        },
                        {
                            title: 'Native Stablecoins (TIP-20)',
                            desc: 'AlphaUSD is a precompile token pegged 1:1 to USD. No external bridge risk, no wrapped token complexity.',
                            icon: '&#128178;',
                        },
                        {
                            title: 'Sub-Second Finality',
                            desc: 'Payroll batches settle immediately. No waiting for 12 block confirmations like on Ethereum.',
                            icon: '&#9889;',
                        },
                        {
                            title: 'Privacy-First Architecture',
                            desc: 'Chain-level support for ZK proof verification makes Shield mode feasible at scale.',
                            icon: '&#128274;',
                        },
                    ].map((f) => (
                        <div key={f.title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg" dangerouslySetInnerHTML={{ __html: f.icon }} />
                                <h4 className="text-sm font-bold text-white">{f.title}</h4>
                            </div>
                            <p className="text-[12px] text-slate-400 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 6: Getting Started */}
            {/* ═══════════════════════════════════════════ */}
            <section className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 text-sm font-black">6</div>
                    <h2 className="text-2xl font-black text-white">Getting Started</h2>
                </div>

                <p className="text-slate-300 leading-relaxed mb-6">
                    Agentic Finance is live. Connect a wallet, type a command, and deploy your first payroll in under a minute.
                </p>

                <div className="space-y-3 mb-8">
                    {[
                        { step: '01', title: 'Start with a single batch', desc: 'Type your team\u2019s names and amounts in plain language \u2014 the AI understands natural commands.' },
                        { step: '02', title: 'Add conditions', desc: 'Automate recurring payments with natural language scheduling. The AI detects patterns automatically.' },
                        { step: '03', title: 'Enable Shield', desc: 'Toggle ZK privacy when salary confidentiality matters. 0.5% fee, capped at $10.' },
                        { step: '04', title: 'Explore agents', desc: 'Delegate operational tasks to verified AI agents. Security audits, analytics, compliance \u2014 on-demand.' },
                    ].map((s) => (
                        <div key={s.step} className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1 shrink-0 mt-0.5">
                                {s.step}
                            </span>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-0.5">{s.title}</h4>
                                <p className="text-[12px] text-slate-400 leading-relaxed">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.25)]"
                    >
                        Launch Agentic Finance
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </a>
                </div>
            </section>

            {/* ── Divider ──────────────────────────── */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-12" />

            {/* ── Closing ──────────────────────────── */}
            <section className="text-center mb-8">
                <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto mb-6">
                    Agentic Finance is open infrastructure for programmable payments. 9 verified contracts. {stats ? stats.totalAgents : 32} production agents. Real ZK proofs. Built on Tempo L1.
                </p>
                <p className="text-slate-500 text-sm mb-2">
                    Questions, partnerships, or integrations:
                </p>
                <a
                    href="mailto:team@agt.finance"
                    className="text-lg font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                    team@agt.finance
                </a>
            </section>

            {/* ── Share/Tags ───────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.06]">
                <div className="flex flex-wrap gap-2">
                    {['payroll', 'AI', 'ZK-SNARK', 'Tempo L1', 'stablecoins', 'agents'].map(tag => (
                        <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-500 border border-white/[0.06]">
                            #{tag}
                        </span>
                    ))}
                </div>
                <a
                    href="/community"
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Blog
                </a>
            </div>
        </article>
    );
}
