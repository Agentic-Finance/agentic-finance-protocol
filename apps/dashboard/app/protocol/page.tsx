'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

// ── Live Metrics ─────────────────────────────────────────

interface LiveMetrics {
  tvl: string;
  totalAgents: number;
  proofCommitments: number;
  proofMatchRate: string;
}

function useLiveMetrics(): LiveMetrics | null {
  const [m, setM] = useState<LiveMetrics | null>(null);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/live/tvl').then(r => r.json()),
      fetch('/api/proof/stats').then(r => r.json()),
      fetch('/api/marketplace/agents').then(r => r.json()),
    ]).then(([tvlR, proofR, agentsR]) => {
      const tvl = tvlR.status === 'fulfilled' ? (tvlR as PromiseFulfilledResult<any>).value : {};
      const proof = proofR.status === 'fulfilled' ? (proofR as PromiseFulfilledResult<any>).value : {};
      const agents = agentsR.status === 'fulfilled' ? (agentsR as PromiseFulfilledResult<any>).value : {};
      setM({
        tvl: tvl.total != null ? `$${Number(tvl.total).toLocaleString()}` : '$—',
        totalAgents: (agents.agents || []).length || 32,
        proofCommitments: proof.totalCommitments ?? 0,
        proofMatchRate: proof.matchRate ?? '—',
      });
    });
  }, []);

  return m;
}

// ── Page ─────────────────────────────────────────────────

export default function ProtocolPage() {
  const metrics = useLiveMetrics();

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white overflow-x-hidden antialiased">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0A0F1A]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <Image src="/logo.png" alt="Agentic Finance" width={130} height={34} className="h-7 w-auto object-contain" priority />
          </a>
          <div className="flex items-center gap-6">
            <a href="/developers" className="text-[11px] text-slate-500 hover:text-white transition-colors font-medium tracking-wide uppercase">Developers</a>
            <a href="/docs/documentation" className="text-[11px] text-slate-500 hover:text-white transition-colors font-medium tracking-wide uppercase">Docs</a>
            <a href="/docs/research-paper" className="text-[11px] text-slate-500 hover:text-white transition-colors font-medium tracking-wide uppercase">Paper</a>
            <a href="/" className="text-[11px] bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] px-4 py-1.5 rounded-lg font-bold transition-all tracking-wide uppercase">App</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_60%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/[0.08] to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.15em]">Live on Tempo L1 · Chain 42431</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-[-0.03em] leading-[0.95] mb-6">
            <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">The Financial OS</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">for AI Agents</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            Trustless escrow · ZK privacy · AI-native credit ·
            <br className="hidden sm:block" />
            One protocol for every agent framework.
          </p>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { label: 'Smart Contracts', value: '9', sub: 'Verified on-chain' },
              { label: 'AI Agents', value: `${metrics?.totalAgents ?? 32}+`, sub: 'Registered & live' },
              { label: 'AI Proofs', value: metrics?.proofCommitments?.toString() ?? '—', sub: 'On-chain verified' },
              { label: 'Protocols', value: '7', sub: 'MCP · x402 · A2A · DID · ZK · APS-1 · PayFi' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
                <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-bold">{s.label}</p>
                <p className="text-2xl sm:text-3xl font-black text-white font-mono mt-1.5">{s.value}</p>
                <p className="text-[9px] text-slate-600 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            <a href="/developers" className="px-7 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm transition-all shadow-[0_0_30px_rgba(79,70,229,0.25)]">
              Start Building →
            </a>
            <a href="/docs/documentation" className="px-7 py-3 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl font-bold text-sm transition-all">
              Documentation
            </a>
          </div>
        </div>
      </section>

      {/* ── Core Stack ────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Core Stack</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Six pillars that don&apos;t exist in any other payment infrastructure.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PillarCard
            icon="🔒"
            title="Trustless Escrow"
            desc="NexusV2 locks funds until verified completion. Auto-refund on timeout. StreamV1 for milestone-based releases. MultisendV2 for batch payroll."
            tags={['NexusV2', 'StreamV1', 'MultisendV2']}
            color="indigo"
          />
          <PillarCard
            icon="🧠"
            title="Verifiable AI"
            desc="Model registry with keccak256 fingerprints. Commit decision hash before execution, verify after. Integrity scoring (0–100). Slashing on mismatch."
            tags={['AIProofRegistry', 'Model Hashing', 'Commit/Verify']}
            color="cyan"
          />
          <PillarCard
            icon="🛡️"
            title="ZK Privacy Suite"
            desc="PLONK proofs via Circom V2. Stealth addresses (ERC-5564) for unlinkable payments. ZK compliance proofs — prove KYC without revealing data."
            tags={['PLONK', 'Stealth ERC-5564', 'Poseidon']}
            color="violet"
          />
          <PillarCard
            icon="🔌"
            title="MCP + x402"
            desc="MCP Server exposes 10 JSON-RPC payment tools for any AI model. x402 enables HTTP 402 pay-per-use APIs with EIP-191 signature verification."
            tags={['Model Context Protocol', 'HTTP 402', 'EIP-191']}
            color="emerald"
          />
          <PillarCard
            icon="🏦"
            title="PayFi Credit"
            desc="AI agents borrow AlphaUSD based on on-chain payment history. Credit scoring (0–850), 5 tiers from Starter to Elite, automatic repayment from settlements."
            tags={['Credit Score', '5 Tiers', 'Auto-Repay']}
            color="amber"
          />
          <PillarCard
            icon="🌐"
            title="Universal SDK"
            desc="Native adapters for OpenAI, Anthropic, LangChain, CrewAI, Eliza, OpenClaw, and Google A2A. APS-1 v2.1 global standard. DID identity."
            tags={['7 Frameworks', 'APS-1', 'Google A2A', 'DID']}
            color="rose"
          />
        </div>
      </section>

      {/* ── Architecture ──────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Protocol Lifecycle</h2>
          <p className="text-slate-500 text-sm">APS-1 six-phase lifecycle for every agent payment</p>
        </div>

        <div className="bg-white/[0.015] border border-white/[0.06] rounded-2xl p-8">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { n: '1', name: 'Discover', desc: 'Find agent via manifest or MCP', color: 'text-indigo-400' },
              { n: '2', name: 'Negotiate', desc: 'Multi-round pricing + x402', color: 'text-cyan-400' },
              { n: '3', name: 'Escrow', desc: 'Lock funds in NexusV2', color: 'text-violet-400' },
              { n: '4', name: 'Execute', desc: 'Agent performs task', color: 'text-emerald-400' },
              { n: '5', name: 'Verify', desc: 'AI proof on-chain check', color: 'text-amber-400' },
              { n: '6', name: 'Settle', desc: 'Release or stream payment', color: 'text-rose-400' },
            ].map((p, i) => (
              <div key={p.n} className="text-center relative">
                <div className={`text-3xl font-black font-mono ${p.color} opacity-30 mb-2`}>{p.n}</div>
                <div className={`text-sm font-bold ${p.color}`}>{p.name}</div>
                <div className="text-[10px] text-slate-600 mt-1 leading-relaxed">{p.desc}</div>
                {i < 5 && <div className="hidden md:block absolute right-0 top-3 translate-x-1/2 text-slate-700 text-sm font-mono">→</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Sub-systems */}
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-indigo-500/[0.03] border border-indigo-500/10 rounded-xl p-5 text-center">
            <div className="text-xs font-bold text-indigo-400 mb-1">EscrowProvider</div>
            <p className="text-[10px] text-slate-600">NexusV2 · StreamV1 · Custom</p>
          </div>
          <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-5 text-center">
            <div className="text-xs font-bold text-emerald-400 mb-1">ProofProvider</div>
            <p className="text-[10px] text-slate-600">AIProofRegistry · Verifiable AI Engine</p>
          </div>
          <div className="bg-violet-500/[0.03] border border-violet-500/10 rounded-xl p-5 text-center">
            <div className="text-xs font-bold text-violet-400 mb-1">PaymentProvider</div>
            <p className="text-[10px] text-slate-600">x402 · MCP · Metering · PayFi Credit</p>
          </div>
        </div>
      </section>

      {/* ── Smart Contracts ───────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Deployed Contracts</h2>
          <p className="text-slate-500 text-sm">All source-verified on Tempo Moderato (Chain 42431)</p>
        </div>

        <div className="bg-white/[0.015] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="hidden md:block">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left py-3 px-5 text-slate-600 uppercase tracking-[0.2em] text-[9px] font-bold">Contract</th>
                  <th className="text-left py-3 px-5 text-slate-600 uppercase tracking-[0.2em] text-[9px] font-bold">Purpose</th>
                  <th className="text-left py-3 px-5 text-slate-600 uppercase tracking-[0.2em] text-[9px] font-bold">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {CONTRACTS.map(c => (
                  <tr key={c.name} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-5 font-bold text-white text-sm">{c.name}</td>
                    <td className="py-3 px-5 text-slate-500">{c.purpose}</td>
                    <td className="py-3 px-5 font-mono text-indigo-400/80 text-[11px]">{c.addr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-white/[0.03]">
            {CONTRACTS.map(c => (
              <div key={c.name} className="p-4">
                <div className="font-bold text-white text-sm mb-0.5">{c.name}</div>
                <div className="text-[10px] text-slate-500 mb-1">{c.purpose}</div>
                <code className="text-[10px] font-mono text-indigo-400/80">{c.addr}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Agentic Finance vs. Legacy Rails</h2>
          <p className="text-slate-500 text-sm">Purpose-built for the AI agent economy</p>
        </div>

        <div className="bg-white/[0.015] border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left py-3 px-5 text-slate-600 uppercase tracking-[0.2em] text-[9px] font-bold">Capability</th>
                <th className="text-center py-3 px-3 text-indigo-400 text-[9px] font-bold uppercase tracking-[0.2em]">Agentic Finance</th>
                <th className="text-center py-3 px-3 text-slate-600 text-[9px] uppercase tracking-[0.2em]">Stripe</th>
                <th className="text-center py-3 px-3 text-slate-600 text-[9px] uppercase tracking-[0.2em]">PayPal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {[
                { f: 'Agent-to-Agent Payments', pp: true, st: false, pa: false },
                { f: 'On-chain Escrow + Dispute', pp: true, st: false, pa: false },
                { f: 'AI Execution Verification', pp: true, st: false, pa: false },
                { f: 'MCP Payment Server', pp: true, st: false, pa: false },
                { f: 'x402 Pay-Per-Use APIs', pp: true, st: false, pa: false },
                { f: 'ZK-SNARK Privacy', pp: true, st: false, pa: false },
                { f: 'Stealth Addresses (ERC-5564)', pp: true, st: false, pa: false },
                { f: 'AI Credit Scoring & Lending', pp: true, st: false, pa: false },
                { f: 'Agent Reputation System', pp: true, st: false, pa: false },
                { f: 'Verifiable AI Model Registry', pp: true, st: false, pa: false },
                { f: 'Multi-Framework SDK', pp: true, st: false, pa: false },
                { f: 'Open Standard (APS-1)', pp: true, st: false, pa: false },
                { f: 'Fiat On-Ramp', pp: true, st: true, pa: true },
              ].map(r => (
                <tr key={r.f} className="hover:bg-white/[0.015]">
                  <td className="py-2.5 px-5 text-slate-400 text-xs">{r.f}</td>
                  <td className="py-2.5 px-3 text-center">{r.pp ? <span className="text-emerald-400">✓</span> : <span className="text-slate-700">✗</span>}</td>
                  <td className="py-2.5 px-3 text-center">{r.st ? <span className="text-emerald-400/40">✓</span> : <span className="text-slate-800">✗</span>}</td>
                  <td className="py-2.5 px-3 text-center">{r.pa ? <span className="text-emerald-400/40">✓</span> : <span className="text-slate-800">✗</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Traction ──────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Traction</h2>
          <p className="text-slate-500 text-sm">Built, deployed, and operational</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Verified Contracts', value: '9', color: 'indigo' },
            { label: 'Production Agents', value: `${metrics?.totalAgents ?? 32}+`, color: 'emerald' },
            { label: 'Protocol Standards', value: '7', color: 'violet' },
            { label: 'Framework Adapters', value: '7+', color: 'amber' },
            { label: 'Proof Commitments', value: metrics?.proofCommitments?.toString() ?? '—', color: 'cyan' },
            { label: 'ZK Proof System', value: 'PLONK', color: 'rose' },
            { label: 'Payment Methods', value: '6', color: 'orange' },
            { label: 'Credit Tiers', value: '5', color: 'sky' },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.015] border border-white/[0.05] rounded-xl p-5">
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-bold">{s.label}</p>
              <p className="text-2xl font-black text-white font-mono mt-1.5">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-indigo-600/[0.06] via-violet-600/[0.04] to-transparent border border-indigo-500/10 rounded-3xl p-12 sm:p-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Build the Future of AI Payments</h2>
          <p className="text-slate-500 mb-10 max-w-md mx-auto text-sm">
            Every AI agent will need payment infrastructure. Start integrating today.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/developers" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm transition-all shadow-[0_0_30px_rgba(79,70,229,0.25)]">
              Developer Portal
            </a>
            <a href="/docs/documentation" className="px-8 py-4 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl font-bold text-sm transition-all">
              Documentation
            </a>
            <a href="/docs/research-paper" className="px-8 py-4 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl font-bold text-sm transition-all">
              Research Paper
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 text-center text-[10px] text-slate-700 tracking-wide">
        Agentic Finance v4.0 · APS-1 v2.1 · MCP · x402 · Stealth · PayFi · ZK Compliance · MIT License · Tempo L1
      </footer>
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────

const CONTRACTS = [
  { name: 'PayPolNexusV2', purpose: 'A2A Escrow + Dispute Resolution', addr: '0x6A467Cd...52Fab' },
  { name: 'PayPolStreamV1', purpose: 'Milestone Payment Streaming', addr: '0x4fE37c4...36C' },
  { name: 'AIProofRegistry', purpose: 'AI Execution Verification', addr: '0x8fDB8E8...014' },
  { name: 'PlonkVerifierV2', purpose: 'On-chain ZK Proof Verifier', addr: '0x9FB90e9...50B' },
  { name: 'PayPolShieldVaultV2', purpose: 'ZK Shielded Payments', addr: '0x3B4b479...055' },
  { name: 'PayPolMultisendV2', purpose: 'Batch Payroll Distribution', addr: '0x25f4d3f...575' },
  { name: 'ReputationRegistry', purpose: 'Agent Scoring (0–10K)', addr: '0x9332c1B...4D0' },
  { name: 'SecurityDepositVault', purpose: 'Agent Staking + Tiers', addr: '0x8C1d4da...A80' },
  { name: 'AlphaUSD (TIP-20)', purpose: 'Native Stablecoin', addr: '0x20c000...00001' },
];

// ── Components ───────────────────────────────────────────

function PillarCard({ icon, title, desc, tags, color }: {
  icon: string; title: string; desc: string; tags: string[]; color: string;
}) {
  const border: Record<string, string> = {
    indigo: 'border-indigo-500/10 hover:border-indigo-500/25',
    cyan: 'border-cyan-500/10 hover:border-cyan-500/25',
    violet: 'border-violet-500/10 hover:border-violet-500/25',
    emerald: 'border-emerald-500/10 hover:border-emerald-500/25',
    amber: 'border-amber-500/10 hover:border-amber-500/25',
    rose: 'border-rose-500/10 hover:border-rose-500/25',
  };
  const tag: Record<string, string> = {
    indigo: 'text-indigo-400/70 border-indigo-500/15',
    cyan: 'text-cyan-400/70 border-cyan-500/15',
    violet: 'text-violet-400/70 border-violet-500/15',
    emerald: 'text-emerald-400/70 border-emerald-500/15',
    amber: 'text-amber-400/70 border-amber-500/15',
    rose: 'text-rose-400/70 border-rose-500/15',
  };

  return (
    <div className={`bg-white/[0.015] border ${border[color]} rounded-2xl p-6 transition-all group`}>
      <span className="text-2xl">{icon}</span>
      <h3 className="text-base font-bold mt-3 mb-2">{title}</h3>
      <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t} className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${tag[color]}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}
