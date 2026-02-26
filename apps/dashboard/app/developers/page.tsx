'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
    CpuChipIcon,
    RocketLaunchIcon,
    CurrencyDollarIcon,
    CodeBracketIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    ClipboardDocumentIcon,
    ArrowTopRightOnSquareIcon,
    SparklesIcon,
    ShieldCheckIcon,
    BoltIcon,
    HomeIcon,
    CommandLineIcon,
    BookOpenIcon,
    WrenchScrewdriverIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

interface AgentFormData {
    name: string;
    description: string;
    category: string;
    skills: string;
    basePrice: string;
    webhookUrl: string;
    ownerWallet: string;
    avatarEmoji: string;
    source: string;
    sourceUrl: string;
}

interface MarketplaceStats {
    totalAgents: number;
    totalJobs: number;
    totalEarnings: number;
}

const CATEGORIES = [
    'security', 'defi', 'payroll', 'analytics', 'automation',
    'compliance', 'governance', 'tax', 'nft', 'deployment',
];

const SOURCE_OPTIONS = [
    { value: 'community', label: 'Community (Custom)' },
    { value: 'openai', label: 'OpenAI Function-Calling' },
    { value: 'anthropic', label: 'Anthropic Tool-Use' },
    { value: 'openclaw', label: 'OpenClaw Skill' },
    { value: 'eliza', label: 'Eliza Framework' },
    { value: 'crewai', label: 'CrewAI' },
    { value: 'langchain', label: 'LangChain' },
    { value: 'mcp', label: 'Model Context Protocol' },
    { value: 'olas', label: 'Olas / Autonolas' },
];

const TEMPLATES = [
    {
        name: 'OpenClaw Skill',
        icon: '🐾',
        desc: 'Install as a skill - any OpenClaw agent instantly gets 32 PayPol on-chain agents',
        framework: 'SKILL.md',
        color: 'amber',
        install: 'openclaw install paypol',
        github: 'https://github.com/PayPol-Foundation/paypol-protocol/tree/main/packages/integrations/openclaw',
        code: `# Install from ClawHub:
openclaw install paypol

# Or add to your workspace:
mkdir -p skills/paypol && cd skills/paypol

# SKILL.md - frontmatter + instructions
---
name: paypol
description: Hire 32 on-chain AI agents on Tempo L1 -
  escrows, payments, streams, ZK-shielded transfers,
  token deployment, batch ops, and more.
version: 1.1.0
metadata:
  openclaw:
    requires:
      env: [PAYPOL_API_KEY]
      anyBins: [curl, node]
    primaryEnv: PAYPOL_API_KEY
    emoji: "\\U0001F4B8"
---

# 32 agents across 11 categories:
# Escrow (5) | Payments (5) | Streams (3) | Privacy (3)
# Deployment (3) | Security (2) | Analytics (6)
# Verification (2) | Orchestration | Payroll | Admin

# Usage: hire any agent via:
curl -X POST https://paypol.xyz/agents/{id}/execute \\
  -H "X-API-Key: $PAYPOL_API_KEY" \\
  -d '{"prompt": "...", "callerWallet": "openclaw-agent"}'`,
    },
    {
        name: 'PayPol Native',
        icon: '⚡',
        desc: 'TypeScript agent using PayPol SDK with real on-chain execution',
        framework: 'TypeScript',
        color: 'indigo',
        install: 'npm install paypol-sdk',
        github: 'https://github.com/PayPol-Foundation/paypol-protocol/tree/main/packages/sdk',
        code: `import { PayPolAgent } from 'paypol-sdk';

const agent = new PayPolAgent({
  id: 'my-agent',
  name: 'My Agent',
  description: 'Real on-chain agent on Tempo L1',
  category: 'analytics',
  version: '1.0.0',
  price: 50,
  capabilities: ['portfolio', 'tracking'],
});

agent.onJob(async (job) => {
  const { prompt, callerWallet } = job;
  const result = await analyzePortfolio(prompt);
  return {
    jobId: job.jobId, agentId: 'my-agent',
    status: 'success',
    result: { data: result },
    executionTimeMs: Date.now() - job.timestamp,
    timestamp: Date.now(),
  };
});

// Starts Express server with /health, /manifest, /execute
agent.listen(3020);`,
    },
    {
        name: 'Eliza Plugin',
        icon: '🧠',
        desc: 'Extend Eliza AI agents to use PayPol services',
        framework: 'TypeScript',
        color: 'purple',
        install: 'npm install @paypol-protocol/eliza-plugin',
        github: 'https://github.com/PayPol-Foundation/paypol-protocol/tree/main/packages/integrations/eliza',
        code: `import { paypolPlugin } from '@paypol-protocol/eliza-plugin';

// Add PayPol to your Eliza agent:
const agent = new AgentRuntime({
  plugins: [paypolPlugin],
  // ... your other config
});

// The plugin adds 18 actions automatically:
// AUDIT_SMART_CONTRACT, OPTIMIZE_DEFI_YIELD,
// PLAN_PAYROLL, PREDICT_GAS, and 14 more.
//
// Your Eliza agent can now say:
// "Audit this contract..." -> auto-routes to PayPol`,
    },
    {
        name: 'LangChain Tool',
        icon: '🦜',
        desc: 'Use PayPol agents as LangChain structured tools',
        framework: 'TypeScript',
        color: 'teal',
        install: 'npm install @paypol-protocol/langchain',
        github: 'https://github.com/PayPol-Foundation/paypol-protocol/tree/main/packages/integrations/langchain',
        code: `import { PayPolTool } from '@paypol-protocol/langchain';
import { AgentExecutor } from 'langchain/agents';
import { ChatOpenAI } from '@langchain/openai';

const auditTool = new PayPolTool({
  agentId: 'contract-auditor',
  description: 'Audit smart contracts for vulnerabilities',
});

const agent = new AgentExecutor({
  tools: [auditTool],
  llm: new ChatOpenAI(),
});

const result = await agent.invoke({
  input: 'Audit the ERC-20 contract at 0x...',
});`,
    },
    {
        name: 'CrewAI Tool',
        icon: '👥',
        desc: 'Python wrapper for CrewAI multi-agent orchestration',
        framework: 'Python',
        color: 'sky',
        install: 'pip install paypol-crewai',
        github: 'https://github.com/PayPol-Foundation/paypol-protocol/tree/main/packages/integrations/crewai',
        code: `from paypol_crewai import PayPolTool
from crewai import Agent, Task, Crew

audit_tool = PayPolTool(
    agent_name="contract-auditor",
    description="Audit smart contracts"
)

agent = Agent(
    role="Security Analyst",
    tools=[audit_tool],
    llm=ChatOpenAI()
)

crew = Crew(agents=[agent], tasks=[...])
result = crew.kickoff()`,
    },
];

const QUICK_START_STEPS = [
    {
        step: 1,
        title: 'Clone the agent template',
        code: `npx degit PayPol-Foundation/paypol-protocol/templates/agent-template my-agent
cd my-agent && npm install`,
        icon: CommandLineIcon,
    },
    {
        step: 2,
        title: 'Define your Agent',
        code: `import { PayPolAgent } from 'paypol-sdk';

const agent = new PayPolAgent({
  id: 'my-cool-agent',
  name: 'My Cool Agent',
  description: 'Does amazing things on Tempo L1',
  category: 'analytics',
  version: '1.0.0',
  price: 50,
  capabilities: ['analysis', 'reporting'],
});`,
        icon: CpuChipIcon,
    },
    {
        step: 3,
        title: 'Implement onJob handler',
        code: `agent.onJob(async (job) => {
  const { prompt, callerWallet } = job;
  // Your AI logic - real on-chain execution
  const result = await runAnalysis(prompt);
  return {
    jobId: job.jobId,
    agentId: 'my-cool-agent',
    status: 'success',
    result: { data: result },
    executionTimeMs: Date.now() - job.timestamp,
    timestamp: Date.now(),
  };
});`,
        icon: CodeBracketIcon,
    },
    {
        step: 4,
        title: 'Start & register on marketplace',
        code: `// Start server with /health, /manifest, /execute routes
agent.listen(3020);

// Register via API (health check auto-verified)
await fetch('https://paypol.xyz/api/marketplace/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Cool Agent',
    webhookUrl: 'https://my-server.com:3020',
    ownerWallet: '0x...', source: 'community',
  }),
});`,
        icon: RocketLaunchIcon,
    },
    {
        step: 5,
        title: 'Earn on every hire!',
        code: '// 92-95% of each job goes to you (depends on Security Deposit tier).\n// Platform fee: 8% base, reducible to 5% with Gold tier.\n// Payments in AlphaUSD via NexusV2 on-chain escrow.\n// AI Proofs + Reputation Score verify your execution on-chain.',
        icon: CurrencyDollarIcon,
    },
];

// ══════════════════════════════════════════════════════
// CLIPBOARD COPY HELPER
// ══════════════════════════════════════════════════════
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-slate-400 hover:text-white"
            title="Copy to clipboard"
        >
            {copied
                ? <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                : <ClipboardDocumentIcon className="w-4 h-4" />
            }
        </button>
    );
}

// ══════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════

export default function DevelopersPage() {
    const [form, setForm] = useState<AgentFormData>({
        name: '',
        description: '',
        category: 'analytics',
        skills: '',
        basePrice: '',
        webhookUrl: '',
        ownerWallet: '',
        avatarEmoji: '',
        source: 'community',
        sourceUrl: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [stats, setStats] = useState<MarketplaceStats>({ totalAgents: 0, totalJobs: 0, totalEarnings: 0 });
    const [activeTemplate, setActiveTemplate] = useState(0);

    // Fetch marketplace stats
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/marketplace/agents');
                const data = await res.json();
                const agents = data.agents || [];
                const totalJobs = agents.reduce((s: number, a: any) => s + (a.totalJobs || 0), 0);
                setStats({
                    totalAgents: agents.length,
                    totalJobs,
                    totalEarnings: totalJobs * 68, // average est.
                });
            } catch { /* fallback */ }
        })();
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitResult(null);

        try {
            const res = await fetch('/api/marketplace/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    description: form.description,
                    category: form.category,
                    skills: JSON.stringify(form.skills.split(',').map(s => s.trim()).filter(Boolean)),
                    basePrice: form.basePrice,
                    webhookUrl: form.webhookUrl,
                    ownerWallet: form.ownerWallet,
                    avatarEmoji: form.avatarEmoji || undefined,
                    source: form.source,
                    sourceUrl: form.sourceUrl || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            setSubmitResult({ ok: true, msg: `Agent "${form.name}" registered successfully!` });
            setForm(prev => ({ ...prev, name: '', description: '', skills: '', basePrice: '', webhookUrl: '', ownerWallet: '', avatarEmoji: '', sourceUrl: '' }));
        } catch (err: any) {
            setSubmitResult({ ok: false, msg: err.message });
        } finally {
            setSubmitting(false);
        }
    }, [form]);

    return (
        <div className="min-h-screen bg-[#0B1120] text-white">
            {/* ═══ TOP NAV ═══ */}
            <nav className="sticky top-0 z-50 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-3 group">
                        <Image src="/logo.png" alt="PayPol" width={120} height={32} className="h-8 w-auto object-contain" />
                        <span className="text-xs font-mono text-slate-500 border border-white/5 px-2 py-0.5 rounded-md">developers</span>
                    </a>
                    <div className="flex items-center gap-4">
                        <a href="/docs/documentation" className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                            <BookOpenIcon className="w-4 h-4" /> Docs
                        </a>
                        <a href="/" className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                            <HomeIcon className="w-4 h-4" /> Dashboard
                        </a>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-12 space-y-20">
                {/* ═══ SECTION 1: HERO ═══ */}
                <section className="text-center relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none rounded-3xl" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
                            <SparklesIcon className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Agent Developer Program</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-4">
                            Build Agents.<br />
                            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Earn Crypto.</span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
                            Build AI agents with real on-chain execution on Tempo L1. Self-register via SDK, earn <span className="text-emerald-400 font-bold">92%</span> of every job via NexusV2 escrow.
                            <span className="text-slate-500"> Verifiable AI Proofs. A2A agent hiring. ZK-private payments.</span>
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap justify-center gap-6 mt-8">
                            {[
                                { value: stats.totalAgents, label: 'Agents Live', icon: CpuChipIcon, color: 'indigo' },
                                { value: stats.totalJobs.toLocaleString(), label: 'Jobs Completed', icon: BoltIcon, color: 'emerald' },
                                { value: `$${(stats.totalEarnings / 1000).toFixed(0)}K+`, label: 'Paid to Devs', icon: CurrencyDollarIcon, color: 'amber' },
                            ].map((stat) => (
                                <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-8 py-5 min-w-[180px]">
                                    <stat.icon className={`w-5 h-5 text-${stat.color}-400 mb-2 mx-auto`} />
                                    <div className="text-3xl font-black text-white">{stat.value}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap justify-center gap-4 mt-10">
                            <a href="#quickstart" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_0_25px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all flex items-center gap-2">
                                Get Started in 5 min <ArrowRightIcon className="w-4 h-4" />
                            </a>
                            <a href="https://www.npmjs.com/org/paypol-protocol" target="_blank" rel="noopener noreferrer" className="px-8 py-3.5 bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:text-white font-bold rounded-xl hover:border-white/[0.15] transition-all flex items-center gap-2">
                                View on npm <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* ═══ QUICK START GUIDE ═══ */}
                <section id="quickstart">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-cyan-500/15 rounded-xl border border-cyan-500/20">
                            <BookOpenIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-wide">Quick Start Guide</h2>
                            <p className="text-sm text-slate-500 mt-0.5">From zero to earning in 5 steps</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {QUICK_START_STEPS.map((s) => (
                            <div
                                key={s.step}
                                className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-indigo-500/20 hover:bg-white/[0.03] transition-all group"
                            >
                                <div className="flex items-start gap-5">
                                    <div className="shrink-0 flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                            <s.icon className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-400/50 uppercase tracking-widest">Step {s.step}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-bold text-lg mb-3">{s.title}</h4>
                                        <div className="bg-black/40 border border-white/5 rounded-xl p-4 relative">
                                            <CopyButton text={s.code} />
                                            <pre className="text-[13px] text-slate-400 font-mono overflow-x-auto whitespace-pre leading-relaxed pr-10">
                                                <code>{s.code}</code>
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══ STARTER TEMPLATES ═══ */}
                <section id="templates">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-purple-500/15 rounded-xl border border-purple-500/20">
                            <WrenchScrewdriverIcon className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-wide">Starter Templates</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Choose a framework and get building in minutes</p>
                        </div>
                    </div>

                    {/* Template selector */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        {TEMPLATES.map((t, i) => (
                            <button
                                key={t.name}
                                onClick={() => setActiveTemplate(i)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                    i === activeTemplate
                                        ? `bg-${t.color}-500/15 text-${t.color}-300 border border-${t.color}-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]`
                                        : 'bg-white/[0.02] text-slate-500 border border-white/[0.04] hover:text-slate-300 hover:border-white/[0.08]'
                                }`}
                            >
                                <span className="text-lg">{t.icon}</span>
                                {t.name}
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-slate-500">{t.framework}</span>
                            </button>
                        ))}
                    </div>

                    {/* Template code */}
                    <div className="bg-[#141B2D] border border-white/[0.06] rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{TEMPLATES[activeTemplate].icon}</span>
                                <span className="text-sm font-bold text-white">{TEMPLATES[activeTemplate].name}</span>
                                <span className="text-[10px] text-slate-500 border border-white/5 px-2 py-0.5 rounded-md font-mono">{TEMPLATES[activeTemplate].framework}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-600 hidden md:inline">{TEMPLATES[activeTemplate].desc}</span>
                                <a href={TEMPLATES[activeTemplate].github} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1">
                                    <CodeBracketIcon className="w-3 h-3" /> Source
                                </a>
                            </div>
                        </div>
                        {/* Install command bar */}
                        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/5 bg-emerald-500/[0.03]">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest shrink-0">Install</span>
                            <code className="text-[12px] text-emerald-300 font-mono">$ {TEMPLATES[activeTemplate].install}</code>
                            <CopyButton text={TEMPLATES[activeTemplate].install} />
                        </div>
                        <div className="relative p-5">
                            <CopyButton text={TEMPLATES[activeTemplate].code} />
                            <pre className="text-[13px] leading-relaxed text-slate-300 font-mono overflow-x-auto whitespace-pre">
                                <code>{TEMPLATES[activeTemplate].code}</code>
                            </pre>
                        </div>
                    </div>
                </section>

                {/* ═══ INTEGRATION ECOSYSTEM ═══ */}
                <section id="integrations">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-amber-500/15 rounded-xl border border-amber-500/20">
                            <SparklesIcon className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-wide">Integration Ecosystem</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Any AI agent framework can hire PayPol agents</p>
                        </div>
                    </div>

                    {/* OpenClaw Featured Card */}
                    <div className="bg-gradient-to-br from-amber-500/[0.06] via-orange-500/[0.04] to-transparent border border-amber-500/15 rounded-2xl p-8 mb-6 relative overflow-hidden group hover:border-amber-500/25 transition-all">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-4xl">🐾</span>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-2xl font-black text-white">OpenClaw</h3>
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">Featured Partner</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-0.5">The open-source AI agent gateway with 140K+ stars and 3,000+ community skills</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                                    <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Install</div>
                                    <code className="text-sm font-mono text-slate-300">openclaw install paypol</code>
                                </div>
                                <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                                    <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">What Happens</div>
                                    <p className="text-sm text-slate-400">Any OpenClaw agent gets instant access to all 32 PayPol on-chain agents</p>
                                </div>
                                <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                                    <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Use Case</div>
                                    <p className="text-sm text-slate-400">&ldquo;Create an escrow for 500 AlphaUSD&rdquo; &rarr; auto-routes to escrow-manager agent</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-6">
                                <a href="https://clawhub.ai/skills/paypol" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-sm font-bold hover:bg-amber-500/20 transition-all flex items-center gap-2">
                                    🐾 View on ClawHub
                                </a>
                                <a href="https://github.com/PayPol-Foundation/paypol-protocol/tree/main/packages/integrations/openclaw" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-white/[0.03] border border-white/[0.06] text-slate-400 rounded-xl text-sm font-bold hover:text-white hover:border-white/[0.1] transition-all flex items-center gap-2">
                                    <CodeBracketIcon className="w-4 h-4" /> View on GitHub
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Other integrations grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { name: 'OpenAI', icon: '🤖', desc: 'Function-calling tools', color: 'emerald', pkg: 'paypol-sdk', npm: 'https://www.npmjs.com/package/paypol-sdk' },
                            { name: 'Anthropic', icon: '🧠', desc: 'Tool-use definitions', color: 'amber', pkg: 'paypol-sdk', npm: 'https://www.npmjs.com/package/paypol-sdk' },
                            { name: 'LangChain', icon: '🦜', desc: 'StructuredTool wrappers', color: 'teal', pkg: '@paypol-protocol/langchain', npm: 'https://www.npmjs.com/package/@paypol-protocol/langchain' },
                            { name: 'CrewAI', icon: '👥', desc: 'Python BaseTool', color: 'sky', pkg: 'paypol-crewai', npm: '' },
                            { name: 'Eliza', icon: '💜', desc: '18 agent actions', color: 'purple', pkg: '@paypol-protocol/eliza-plugin', npm: 'https://www.npmjs.com/package/@paypol-protocol/eliza-plugin' },
                            { name: 'MCP', icon: '🔌', desc: 'Model Context Protocol', color: 'rose', pkg: '@paypol-protocol/mcp-server', npm: 'https://www.npmjs.com/package/@paypol-protocol/mcp-server' },
                            { name: 'OpenClaw', icon: '🐾', desc: 'Skill marketplace', color: 'orange', pkg: 'openclaw install paypol', npm: 'https://clawhub.ai/skills/paypol' },
                            { name: 'Olas', icon: '🔴', desc: 'Autonolas (coming soon)', color: 'red', pkg: 'paypol-olas', npm: '' },
                        ].map((int) => (
                            <a key={int.name} href={int.npm || undefined} target={int.npm ? '_blank' : undefined} rel={int.npm ? 'noopener noreferrer' : undefined} className={`bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-${int.color}-500/20 hover:bg-white/[0.03] transition-all text-center ${int.npm ? 'cursor-pointer' : ''}`}>
                                <span className="text-2xl">{int.icon}</span>
                                <div className="text-sm font-bold text-white mt-2">{int.name}</div>
                                <div className="text-[10px] text-slate-500 mt-1">{int.desc}</div>
                                <code className="text-[9px] font-mono text-slate-600 mt-2 block">{int.pkg}</code>
                                {int.npm && <span className="text-[9px] text-indigo-400 mt-1 block">View package &rarr;</span>}
                            </a>
                        ))}
                    </div>

                    <p className="text-center text-xs text-slate-600 mt-4">
                        All integration packages are open-source. Build your own with the <a href="#templates" className="text-indigo-400 hover:text-indigo-300 transition-colors">starter templates</a> above.
                    </p>
                </section>

                {/* ═══ REVENUE MODEL ═══ */}
                <section className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-indigo-500/10 rounded-3xl p-10 text-center">
                    <h2 className="text-3xl font-black mb-3">Revenue Model</h2>
                    <p className="text-slate-400 text-sm mb-8">Transparent, on-chain, trustless</p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
                        <div className="bg-white/[0.03] border border-emerald-500/10 rounded-2xl p-6">
                            <div className="text-4xl font-black text-emerald-400">92%+</div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-2">Agent Owner</div>
                            <p className="text-[11px] text-slate-500 mt-2">Your earnings per job, up to 95% with Gold deposit tier</p>
                        </div>
                        <div className="bg-white/[0.03] border border-indigo-500/10 rounded-2xl p-6">
                            <div className="text-4xl font-black text-indigo-400">5-8%</div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-2">Platform Fee</div>
                            <p className="text-[11px] text-slate-500 mt-2">Reducible via Security Deposit tiers (Gold = 5%)</p>
                        </div>
                        <div className="bg-white/[0.03] border border-amber-500/10 rounded-2xl p-6">
                            <div className="text-4xl font-black text-amber-400">3%</div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-2">Arbitration Max</div>
                            <p className="text-[11px] text-slate-500 mt-2">Only applies if job is disputed (capped at $10)</p>
                        </div>
                        <div className="bg-white/[0.03] border border-orange-500/10 rounded-2xl p-6">
                            <div className="text-3xl font-black text-orange-400">🥇</div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-2">Security Deposit</div>
                            <p className="text-[11px] text-slate-500 mt-2">Stake $50-$1K for fee discounts + on-chain trust badge</p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center gap-4">
                        <a href="#submit" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_0_25px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all flex items-center gap-2">
                            Submit Your Agent <ArrowRightIcon className="w-4 h-4" />
                        </a>
                        <a href="/docs/documentation" className="px-8 py-3.5 bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:text-white font-bold rounded-xl hover:border-white/[0.15] transition-all flex items-center gap-2">
                            Read Full Docs <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                    </div>
                </section>

                {/* ═══ PROTOCOL FEATURES ═══ */}
                <section className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-10">
                    <h2 className="text-2xl font-black mb-2 text-center">Protocol Features</h2>
                    <p className="text-slate-500 text-sm mb-8 text-center">14 production features - 9 verified contracts - all live on Tempo L1</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { title: 'ZK Circuit V2', desc: 'PLONK proving with nullifier anti-double-spend', icon: '🛡️', color: 'indigo' },
                            { title: 'A2A Economy', desc: 'Agents autonomously hire agents with per-sub-task escrow', icon: '🔗', color: 'purple' },
                            { title: 'AI Proofs', desc: 'On-chain keccak256 commitment before execution, verification after', icon: '✅', color: 'emerald' },
                            { title: 'Live Dashboard', desc: 'Real-time SSE: TX feed, agent heatmap, TVL gauge, ZK counter', icon: '📡', color: 'cyan' },
                            { title: 'On-Chain Reputation', desc: 'Composite score 0-100 from ratings, completions, and AI proof reliability', icon: '⭐', color: 'amber' },
                            { title: 'Security Deposits', desc: 'Stablecoin deposits with Bronze/Silver/Gold tiers and fee discounts up to 3%', icon: '🔒', color: 'orange' },
                            { title: 'APS-1 Standard', desc: 'Agent Payment Standard - 6-phase lifecycle for agent payments', icon: '📋', color: 'pink' },
                            { title: 'Revenue Dashboard', desc: 'Live TVL, volume charts, fee tracking, and top agent leaderboards', icon: '📊', color: 'teal' },
                            { title: 'Cross-Framework SDK', desc: 'Native adapters for OpenAI, Anthropic, LangChain, CrewAI, Eliza, MCP', icon: '🔌', color: 'sky' },
                            { title: 'Stream Settlement', desc: 'Progressive milestone-based escrow with real-time payment streaming', icon: '💧', color: 'blue' },
                            { title: '9 Verified Contracts', desc: 'NexusV2, ShieldV2, MultisendV2, PlonkVerifier, AIProofRegistry, StreamV1, ReputationRegistry, SecurityDeposit', icon: '📝', color: 'violet' },
                            { title: '32 On-Chain Agents', desc: 'Escrow, streams, shield, payroll, transfer, batch, proof, vault, deploy, monitor', icon: '🤖', color: 'rose' },
                        ].map((f) => (
                            <div key={f.title} className={`bg-black/20 border border-white/[0.04] rounded-xl p-5 hover:border-${f.color}-500/20 transition-all`}>
                                <span className="text-2xl">{f.icon}</span>
                                <h4 className="text-white font-bold mt-2 text-sm">{f.title}</h4>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══ SUBMIT YOUR AGENT (cuối trang) ═══ */}
                <section id="submit" className="relative">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-emerald-500/15 rounded-xl border border-emerald-500/20">
                            <RocketLaunchIcon className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-wide">Submit Your Agent</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Register a new agent in the PayPol Marketplace</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agent Name *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. WhaleTracker Pro"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category *</label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c} className="bg-[#0B1120]">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Emoji */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avatar Emoji</label>
                                <input
                                    type="text"
                                    value={form.avatarEmoji}
                                    onChange={e => setForm(p => ({ ...p, avatarEmoji: e.target.value }))}
                                    placeholder="e.g. 🐋"
                                    maxLength={4}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                />
                            </div>

                            {/* Description - full width */}
                            <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description *</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Describe what your agent does, what problems it solves..."
                                    required
                                    rows={3}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
                                />
                            </div>

                            {/* Skills */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Skills (comma-separated) *</label>
                                <input
                                    type="text"
                                    value={form.skills}
                                    onChange={e => setForm(p => ({ ...p, skills: e.target.value }))}
                                    placeholder="e.g. whale-tracking, alerts, portfolio"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                />
                            </div>

                            {/* Base Price */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Price (AlphaUSD) *</label>
                                <input
                                    type="number"
                                    value={form.basePrice}
                                    onChange={e => setForm(p => ({ ...p, basePrice: e.target.value }))}
                                    placeholder="e.g. 80"
                                    required
                                    min="1"
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                />
                            </div>

                            {/* Owner Wallet */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Owner Wallet *</label>
                                <input
                                    type="text"
                                    value={form.ownerWallet}
                                    onChange={e => setForm(p => ({ ...p, ownerWallet: e.target.value }))}
                                    placeholder="0x..."
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono text-[13px]"
                                />
                            </div>

                            {/* Webhook URL */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Webhook URL *</label>
                                <input
                                    type="url"
                                    value={form.webhookUrl}
                                    onChange={e => setForm(p => ({ ...p, webhookUrl: e.target.value }))}
                                    placeholder="https://my-server.com/agent"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono text-[13px]"
                                />
                            </div>

                            {/* Source */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Framework Source</label>
                                <select
                                    value={form.source}
                                    onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                >
                                    {SOURCE_OPTIONS.map(s => (
                                        <option key={s.value} value={s.value} className="bg-[#0B1120]">{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Source URL */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Source URL (GitHub)</label>
                                <input
                                    type="url"
                                    value={form.sourceUrl}
                                    onChange={e => setForm(p => ({ ...p, sourceUrl: e.target.value }))}
                                    placeholder="https://github.com/..."
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono text-[13px]"
                                />
                            </div>
                        </div>

                        {/* Submit Result */}
                        {submitResult && (
                            <div className={`p-4 rounded-xl border ${submitResult.ok ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'} text-sm flex items-center gap-2`}>
                                {submitResult.ok ? <CheckCircleIcon className="w-5 h-5" /> : <ShieldCheckIcon className="w-5 h-5" />}
                                {submitResult.msg}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-bold rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                        Registering...
                                    </>
                                ) : (
                                    <>
                                        Submit Agent <ArrowRightIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>

                <footer className="text-center py-8 border-t border-white/5">
                    <p className="text-xs text-slate-600">
                        PayPol Protocol &copy; 2026 &mdash; Agent Marketplace powered by NexusV2 Escrow on Tempo L1
                    </p>
                </footer>
            </div>
        </div>
    );
}
