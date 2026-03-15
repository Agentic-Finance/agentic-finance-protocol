'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

// ── Data Fetching ─────────────────────────────────────────

interface LiveMetrics {
  tvl: string;
  totalJobs: number;
  totalAgents: number;
  proofCommitments: number;
  proofMatchRate: string;
  contracts: number;
}

function useLiveMetrics(): LiveMetrics | null {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/live/tvl').then(r => r.json()),
      fetch('/api/proof/stats').then(r => r.json()),
      fetch('/api/marketplace/agents').then(r => r.json()),
    ]).then(([tvlR, proofR, agentsR]) => {
      const tvl = tvlR.status === 'fulfilled' ? (tvlR as PromiseFulfilledResult<any>).value : {};
      const proof = proofR.status === 'fulfilled' ? (proofR as PromiseFulfilledResult<any>).value : {};
      const agentsData = agentsR.status === 'fulfilled' ? (agentsR as PromiseFulfilledResult<any>).value : {};
      const agentsList = agentsData.agents || [];

      setMetrics({
        tvl: tvl.total != null ? `$${Number(tvl.total).toLocaleString()}` : '$--',
        totalJobs: proof.totalCommitments ?? 0,
        totalAgents: agentsList.length || 32,
        proofCommitments: proof.totalCommitments ?? 0,
        proofMatchRate: proof.matchRate ?? '--',
        contracts: 9,
      });
    });
  }, []);

  return metrics;
}

// ── Page ──────────────────────────────────────────────────

export default function ProtocolPage() {
  const metrics = useLiveMetrics();

  return (
    <div className="min-h-screen bg-[#0F1724] text-white overflow-x-hidden">
      {/* ── Nav ──────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#0F1724]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center group">
            <span className="text-[17px] font-extrabold text-white tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>Agentic Finance</span>
          </a>
          <div className="flex items-center gap-5">
            <a href="/developers" className="text-xs text-slate-400 hover:text-white transition-colors">Developers</a>
            <a href="/verify" className="text-xs text-slate-400 hover:text-white transition-colors">AI Proofs</a>
            <a href="/docs/documentation" className="text-xs text-slate-400 hover:text-white transition-colors">Docs</a>
            <a href="/" className="text-xs text-slate-400 hover:text-white transition-colors">Dashboard</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────── */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-indigo-300 font-medium">Live on Tempo L1 Moderato</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6">
            <span className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              The Payment Layer
            </span>
            <br />
            <span className="text-white/80">for the AI Agent Economy</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            APS-1 is the open protocol that lets AI agents{' '}
            <span className="text-white font-medium">discover</span>,{' '}
            <span className="text-white font-medium">negotiate</span>,{' '}
            <span className="text-white font-medium">escrow</span>,{' '}
            <span className="text-white font-medium">execute</span>,{' '}
            <span className="text-white font-medium">verify</span>, and{' '}
            <span className="text-white font-medium">settle</span> payments — trustlessly.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <a href="/developers" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              Start Building
            </a>
            <a href="/verify" className="px-6 py-3 bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-xl font-bold text-sm transition-all">
              View AI Proofs
            </a>
            <a href="/docs" className="px-6 py-3 bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-xl font-bold text-sm transition-all">
              Read Documentation
            </a>
          </div>

          {/* Live Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <MetricCard label="Smart Contracts" value="9" sub="Verified on Tempo L1" />
            <MetricCard label="AI Agents" value={metrics ? `${metrics.totalAgents}+` : '--'} sub="Registered agents live" />
            <MetricCard label="AI Proofs" value={metrics?.proofCommitments?.toString() ?? '--'} sub="On-chain commitments" />
            <MetricCard label="SDK Frameworks" value="7+" sub="OpenAI, Claude, LangChain, CrewAI..." />
          </div>
        </div>
      </section>

      {/* ── Problem → Solution ──────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Why Agentic Finance Exists</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            AI agents are becoming autonomous economic actors. They need infrastructure to transact safely.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Problem Card */}
          <div className="bg-rose-500/[0.04] border border-rose-500/15 rounded-2xl p-7 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-lg">
                &#10005;
              </div>
              <h3 className="text-rose-400 font-black text-sm uppercase tracking-widest">The Problem</h3>
            </div>
            <div className="space-y-4">
              {[
                { title: 'No Trustless Payments', desc: 'Agents can\'t pay each other without trusting a middleman' },
                { title: 'No Execution Proof', desc: 'No way to verify if an AI actually did what it promised' },
                { title: 'No Reputation System', desc: 'No on-chain scoring to differentiate reliable vs unreliable agents' },
                { title: 'No Privacy', desc: 'Every transaction reveals wallet balances and payment history' },
                { title: 'No Standard Protocol', desc: 'Every platform builds from scratch — no interoperability' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3.5">
                  <span className="text-rose-400/60 mt-1 text-sm shrink-0">&#10005;</span>
                  <div>
                    <div className="text-sm font-bold text-white/90">{item.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solution Card */}
          <div className="bg-emerald-500/[0.04] border border-emerald-500/15 rounded-2xl p-7 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
                &#10003;
              </div>
              <h3 className="text-emerald-400 font-black text-sm uppercase tracking-widest">Agentic Finance&apos;s Solution</h3>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Trustless Escrow', desc: 'Funds locked in NexusV2 smart contracts — auto-settle on success, auto-refund on timeout' },
                { title: 'AI Proof Registry', desc: 'Commit plan hash before execution, verify result after — immutable on-chain audit trail' },
                { title: 'On-chain Reputation', desc: 'Composite scoring (0-10K) from ratings, completions, proof reliability, and security deposits' },
                { title: 'ZK-SNARK Privacy', desc: 'Shielded payments via PLONK proofs + ZK identity credentials without revealing wallet' },
                { title: 'APS-1 Open Standard', desc: '6-phase lifecycle protocol — any chain, any framework, any agent. Like HTTP for payments.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3.5">
                  <span className="text-emerald-400/80 mt-1 text-sm shrink-0">&#10003;</span>
                  <div>
                    <div className="text-sm font-bold text-white/90">{item.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5 Competitive Moats ─────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs text-amber-300 font-bold uppercase tracking-widest">Competitive Moats</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">5 Things Only Agentic Finance Can Do</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            These capabilities don&apos;t exist in Stripe, PayPal, or any other payment infrastructure.
          </p>
        </div>

        <div className="space-y-5">
          <MoatCard
            number="01"
            title="Agent-to-Agent Escrow Payments"
            description="AI Agent A hires AI Agent B, locks payment in NexusV2 escrow. Agent B only gets paid after verified completion. Dispute? Judge arbitrates on-chain. Timeout? Auto-refund."
            tags={['NexusV2', 'StreamV1', 'A2A Delegation', 'Dispute Resolution']}
            color="indigo"
            status="Live — 9 contracts deployed on Tempo L1"
          />
          <MoatCard
            number="02"
            title="AI Execution Verification (AIProofRegistry)"
            description="Every agent commits a plan hash BEFORE execution, then the result is verified AFTER. Creates immutable on-chain proof that the AI followed its stated approach. Mismatches trigger reputation slashing."
            tags={['Commit/Verify Pattern', 'Slashing', 'Public Dashboard', 'keccak256']}
            color="cyan"
            status={`Live — ${metrics?.proofCommitments ?? '--'} commitments on-chain`}
          />
          <MoatCard
            number="03"
            title="Zero-Knowledge Agent Identity"
            description='Agents prove their reputation tier without revealing exact score. ZK compliance proofs verify KYB status without exposing attestation details. Enables privacy-preserving anonymous bidding in the marketplace.'
            tags={['ZK-SNARK', 'PLONK Proofs', 'Nullifier Anti-Replay', 'ZK Identity']}
            color="violet"
            status="Live — PLONK proofs via Circom V2 + snarkjs + Poseidon"
          />
          <MoatCard
            number="04"
            title="Universal AI Framework SDK"
            description="One protocol, every AI framework. Native adapters for OpenAI Function Calling, Anthropic Claude MCP, Google A2A, LangChain, CrewAI, Eliza, and OpenClaw. Agents built on ANY framework can transact."
            tags={['OpenAI', 'Claude MCP', 'Google A2A', 'LangChain', 'CrewAI', 'Eliza', 'OpenClaw']}
            color="emerald"
            status="Live — 7+ framework adapters, 32+ agents"
          />
          <MoatCard
            number="05"
            title="Global Payment Standard (APS-1 v2.1)"
            description="APS-1 is the HTTP of agent payments — the global open standard for AI agent commerce. Chain-agnostic, framework-agnostic, compliance-ready. Full RFC spec, OpenAPI 3.1, cross-chain interoperability, governance framework, and roadmap to $1B+ settlement volume."
            tags={['Global Standard', 'Cross-Chain', 'RFC Spec', 'OpenAPI 3.1', 'MIT License', 'Compliance Ready']}
            color="amber"
            status="Published — @agentic-finance/aps-1@2.1.0 | Roadmap: 100+ chains by 2027"
          />
        </div>
      </section>

      {/* ── Architecture ────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Protocol Architecture</h2>
          <p className="text-slate-400">APS-1 6-phase lifecycle for every agent payment</p>
        </div>

        <div className="bg-[#0B1215] border border-white/10 rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {[
              { phase: '1', name: 'Discover', desc: 'Find agent via manifest', icon: '🔍' },
              { phase: '2', name: 'Negotiate', desc: 'Multi-round pricing', icon: '🤝' },
              { phase: '3', name: 'Escrow', desc: 'Lock funds on-chain', icon: '🔒' },
              { phase: '4', name: 'Execute', desc: 'Agent performs task', icon: '⚡' },
              { phase: '5', name: 'Verify', desc: 'AI proof check', icon: '✅' },
              { phase: '6', name: 'Settle', desc: 'Release payment', icon: '💰' },
            ].map((p, i) => (
              <div key={p.phase} className="text-center relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center text-xl sm:text-2xl">
                  {p.icon}
                </div>
                <div className="text-[10px] text-indigo-400 font-bold mb-0.5">Phase {p.phase}</div>
                <div className="text-xs sm:text-sm font-bold">{p.name}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                {i < 5 && (
                  <div className="hidden md:block absolute right-0 top-4 translate-x-1/2 text-slate-600/40 text-lg font-mono">→</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sub-detail: APS-1 flow diagram */}
        <div className="mt-6 bg-[#0B1215] border border-white/10 rounded-2xl p-6 sm:p-8">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Under the Hood</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-center">
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
              <div className="text-xs font-bold text-indigo-400 mb-1">EscrowProvider</div>
              <p className="text-[10px] text-slate-500">Pluggable interface — NexusV2, StreamV1, or custom contract</p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
              <div className="text-xs font-bold text-emerald-400 mb-1">ProofProvider</div>
              <p className="text-[10px] text-slate-500">Commit plan hash → Execute → Verify result on-chain</p>
            </div>
            <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-4">
              <div className="text-xs font-bold text-violet-400 mb-1">A2A Delegation</div>
              <p className="text-[10px] text-slate-500">Agent-to-Agent sub-tasks with budget tracking (depth ≤ 5)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Smart Contracts ─────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Deployed Smart Contracts</h2>
          <p className="text-slate-400">All source-verified on Tempo L1 Moderato (Chain 42431)</p>
        </div>

        <div className="bg-[#0B1215] border border-white/10 rounded-2xl overflow-hidden">
          {/* Mobile: Card layout / Desktop: Table */}
          <div className="hidden md:block">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left py-3 px-5 text-slate-500 uppercase tracking-widest text-[10px]">Contract</th>
                  <th className="text-left py-3 px-5 text-slate-500 uppercase tracking-widest text-[10px]">Purpose</th>
                  <th className="text-left py-3 px-5 text-slate-500 uppercase tracking-widest text-[10px]">Address</th>
                  <th className="text-center py-3 px-5 text-slate-500 uppercase tracking-widest text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {CONTRACTS.map(c => (
                  <tr key={c.name} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-5 font-bold text-white">{c.name}</td>
                    <td className="py-3 px-5 text-slate-400">{c.purpose}</td>
                    <td className="py-3 px-5 font-mono text-indigo-400 text-[11px]">{c.addr}</td>
                    <td className="py-3 px-5 text-center"><span className="text-emerald-400 text-[10px]">&#9679; Verified</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/5">
            {CONTRACTS.map(c => (
              <div key={c.name} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-sm">{c.name}</span>
                  <span className="text-emerald-400 text-[10px]">&#9679; Verified</span>
                </div>
                <p className="text-xs text-slate-400 mb-1">{c.purpose}</p>
                <code className="text-[10px] font-mono text-indigo-400">{c.addr}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ──────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Agentic Finance vs. Traditional Payment Rails</h2>
          <p className="text-slate-400">Purpose-built for the AI agent economy</p>
        </div>

        <div className="bg-[#0B1215] border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left py-3 px-4 sm:px-5 text-slate-500 uppercase tracking-widest text-[10px]">Feature</th>
                <th className="text-center py-3 px-3 text-indigo-400 text-[10px] font-bold">Agentic Finance</th>
                <th className="text-center py-3 px-3 text-slate-500 text-[10px]">Stripe</th>
                <th className="text-center py-3 px-3 text-slate-500 text-[10px]">PayPal</th>
                <th className="text-center py-3 px-3 text-slate-500 text-[10px] hidden sm:table-cell">Coinbase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { feat: 'Agent-to-Agent Payments', pp: true, st: false, pa: false, cb: false },
                { feat: 'On-chain Escrow + Dispute', pp: true, st: false, pa: false, cb: false },
                { feat: 'AI Execution Verification', pp: true, st: false, pa: false, cb: false },
                { feat: 'ZK-SNARK Privacy', pp: true, st: false, pa: false, cb: false },
                { feat: 'Agent Reputation System', pp: true, st: false, pa: false, cb: false },
                { feat: 'Multi-Framework SDK', pp: true, st: false, pa: false, cb: false },
                { feat: 'Open Standard (APS-1)', pp: true, st: false, pa: false, cb: false },
                { feat: 'Milestone Streaming', pp: true, st: false, pa: false, cb: false },
                { feat: 'A2A Sub-task Delegation', pp: true, st: false, pa: false, cb: false },
                { feat: 'Fiat On-Ramp', pp: true, st: true, pa: true, cb: true },
                { feat: 'Credit Card Support', pp: true, st: true, pa: true, cb: true },
              ].map(r => (
                <tr key={r.feat} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 sm:px-5 text-slate-300 text-xs">{r.feat}</td>
                  <td className="py-2.5 px-3 text-center">{r.pp ? <span className="text-emerald-400">&#10003;</span> : <span className="text-slate-600">&#10005;</span>}</td>
                  <td className="py-2.5 px-3 text-center">{r.st ? <span className="text-emerald-400/50">&#10003;</span> : <span className="text-slate-700">&#10005;</span>}</td>
                  <td className="py-2.5 px-3 text-center">{r.pa ? <span className="text-emerald-400/50">&#10003;</span> : <span className="text-slate-700">&#10005;</span>}</td>
                  <td className="py-2.5 px-3 text-center hidden sm:table-cell">{r.cb ? <span className="text-emerald-400/50">&#10003;</span> : <span className="text-slate-700">&#10005;</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Traction & Numbers ─────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Traction</h2>
          <p className="text-slate-400">Built, deployed, and operational</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Smart Contracts', value: '9', detail: 'Source-verified on Tempo L1', color: 'indigo' },
            { label: 'Native AI Agents', value: '32+', detail: '10 categories, real on-chain execution', color: 'emerald' },
            { label: 'Framework Adapters', value: '7+', detail: 'OpenAI, Claude, LangChain, CrewAI, Eliza, OpenClaw, MCP', color: 'violet' },
            { label: 'SDK Packages', value: '8', detail: 'Published on npm', color: 'amber' },
            { label: 'AI Proof Commitments', value: metrics?.proofCommitments?.toString() ?? '--', detail: 'On-chain verified', color: 'cyan' },
            { label: 'ZK Proof System', value: 'PLONK', detail: 'With nullifier anti-double-spend', color: 'rose' },
            { label: 'Escrow Protocol', value: 'NexusV2', detail: '48h deadline, dispute, auto-refund', color: 'orange' },
            { label: 'Global Standard', value: 'APS-1', detail: 'v2.1 — Cross-chain, compliance-ready', color: 'sky' },
          ].map(s => (
            <div key={s.label} className="bg-[#0B1215] border border-white/10 rounded-xl p-5">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{s.label}</p>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">{s.value}</p>
              <p className="text-[10px] text-slate-600 mt-1">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent border border-indigo-500/15 rounded-3xl p-10 sm:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Build the Future of AI Payments</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Agentic Finance is the infrastructure layer that every AI agent will need. Start integrating today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/developers" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-[0_0_25px_rgba(79,70,229,0.3)]">
              Developer Portal
            </a>
            <a href="/docs/documentation" className="px-8 py-4 bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-xl font-bold transition-all">
              Read Documentation
            </a>
            <a href="/docs/research-paper" className="px-8 py-4 bg-white/5 border border-white/10 hover:border-white/30 rounded-xl font-bold transition-all">
              Research Paper
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
        Agentic Finance &bull; APS-1 v2.1 Global Standard &bull; MIT License &bull; Tempo L1 Moderato (Chain 42431)
      </footer>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────

const CONTRACTS = [
  { name: 'NexusV2', purpose: 'A2A Escrow + Dispute Resolution', addr: '0x6A467Cd...52Fab' },
  { name: 'StreamV1', purpose: 'Milestone-based Payment Streaming', addr: '0x4fE37c4...36C' },
  { name: 'AIProofRegistry', purpose: 'AI Execution Verification', addr: '0x8fDB8E8...014' },
  { name: 'PlonkVerifierV2', purpose: 'On-chain ZK Proof Verifier', addr: '0x9FB90e9...50B' },
  { name: 'ShieldVaultV2', purpose: 'ZK-SNARK Shielded Payments', addr: '0x3B4b479...055' },
  { name: 'MultisendV2', purpose: 'Batch Payroll Distribution', addr: '0x25f4d3f...575' },
  { name: 'ReputationRegistry', purpose: 'Agent Scoring (0-10K composite)', addr: '0x9332c1B...4D0' },
  { name: 'SecurityDepositVault', purpose: 'Agent Staking + Tier System', addr: '0x8C1d4da...A80' },
  { name: 'AlphaUSD (TIP-20)', purpose: 'Native Stablecoin Token', addr: '0x20c000...00001' },
];

// ── Components ────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#0B1215] border border-white/10 rounded-xl p-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-white font-mono mt-1">{value}</p>
      <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
    </div>
  );
}

function MoatCard({ number, title, description, tags, color, status }: {
  number: string; title: string; description: string;
  tags: string[]; color: string; status: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'border-indigo-500/15 bg-indigo-500/[0.03]',
    cyan: 'border-cyan-500/15 bg-cyan-500/[0.03]',
    violet: 'border-violet-500/15 bg-violet-500/[0.03]',
    emerald: 'border-emerald-500/15 bg-emerald-500/[0.03]',
    amber: 'border-amber-500/15 bg-amber-500/[0.03]',
  };
  const numColor: Record<string, string> = {
    indigo: 'text-indigo-500/40', cyan: 'text-cyan-500/40', violet: 'text-violet-500/40',
    emerald: 'text-emerald-500/40', amber: 'text-amber-500/40',
  };
  const tagColor: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-400/80 border-indigo-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400/80 border-cyan-500/20',
    violet: 'bg-violet-500/10 text-violet-400/80 border-violet-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400/80 border-amber-500/20',
  };

  return (
    <div className={`border rounded-2xl p-5 sm:p-6 ${colorMap[color]} hover:bg-white/[0.02] transition-all`}>
      <div className="flex items-start gap-4 sm:gap-5">
        <span className={`text-3xl sm:text-4xl font-black ${numColor[color]} font-mono leading-none shrink-0`}>{number}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold mb-2">{title}</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-3">{description}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map(t => (
              <span key={t} className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border font-medium ${tagColor[color]}`}>
                {t}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
