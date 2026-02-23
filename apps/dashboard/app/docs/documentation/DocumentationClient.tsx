'use client';

import { DocsSidebar, type TocItem } from '../_components/DocsSidebar';

const tocItems: TocItem[] = [
    { id: '1-introduction', label: 'Introduction', level: 2 },
    { id: '2-architecture-overview', label: 'Architecture Overview', level: 2 },
    { id: '3-getting-started', label: 'Getting Started', level: 2 },
    { id: '4-core-modules', label: 'Core Modules', level: 2 },
    { id: '5-smart-contract-reference', label: 'Smart Contract Reference', level: 2 },
    { id: '6-api-reference', label: 'API Reference', level: 2 },
    { id: '7-zk-privacy-shield', label: 'ZK Privacy Shield', level: 2 },
    { id: '8-agent-marketplace-a2a', label: 'Agent Marketplace', level: 2 },
    { id: '9-sdk--integrations', label: 'SDK & Integrations', level: 2 },
    { id: '10-fee-schedule', label: 'Fee Schedule', level: 2 },
    { id: '11-security-model', label: 'Security Model', level: 2 },
    { id: '12-deployment-guide', label: 'Deployment Guide', level: 2 },
    { id: 'appendix', label: 'Appendix', level: 2 },
];

const quickLinks = [
    {
        title: 'Getting Started',
        desc: 'Prerequisites, project structure, and quick start guide',
        href: '#3-getting-started',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        ),
    },
    {
        title: 'Smart Contracts',
        desc: 'NexusV2, ShieldVault, and MultisendVault references',
        href: '#5-smart-contract-reference',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
        ),
    },
    {
        title: 'API Reference',
        desc: 'REST endpoints for workspace, payroll, marketplace, and escrow',
        href: '#6-api-reference',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
        ),
    },
    {
        title: 'ZK Privacy Shield',
        desc: 'Poseidon commitments, Groth16 proofs, and privacy guarantees',
        href: '#7-zk-privacy-shield',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        ),
    },
];

export function DocumentationClient({ children }: { children: React.ReactNode }) {
    return (
        <div>
            {/* Hero Header */}
            <div className="mb-12 pb-10 border-b border-white/5">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
                    <a href="/" className="hover:text-slate-300 transition-colors">Home</a>
                    <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <span className="text-slate-400">Documentation</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">v2.0</span>
                    <span className="px-2.5 py-1 bg-white/5 text-slate-400 text-xs rounded-full border border-white/10">Tempo Moderato Testnet</span>
                    <span className="text-xs text-slate-500">Last updated: February 2026</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    Protocol <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Documentation</span>
                </h1>
                <p className="text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed">
                    Comprehensive guides, API references, and smart contract integration for the PayPol Protocol — the autonomous payroll and agent marketplace infrastructure.
                </p>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-14">
                {quickLinks.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        className="group p-4 rounded-xl bg-[#0D1119] border border-white/[0.06] hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all"
                    >
                        <div className="text-slate-500 group-hover:text-emerald-400 transition-colors mb-2.5">
                            {link.icon}
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-1">{link.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{link.desc}</p>
                    </a>
                ))}
            </div>

            {/* Content + Sidebar */}
            <div className="flex gap-12">
                <article className="min-w-0 flex-1 overflow-x-hidden">
                    {children}
                </article>
                <DocsSidebar items={tocItems} accentColor="emerald" />
            </div>
        </div>
    );
}
