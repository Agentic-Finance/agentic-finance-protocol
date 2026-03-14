'use client';

import { DocsSidebar, type TocItem } from '../_components/DocsSidebar';

const tocItems: TocItem[] = [
    { id: '1-introduction', label: 'Introduction', level: 2 },
    { id: '2-architecture-overview', label: 'Architecture', level: 2 },
    { id: '3-getting-started', label: 'Getting Started', level: 2 },
    { id: '4-core-modules', label: 'Core Modules', level: 2 },
    { id: '5-mcp-server', label: 'MCP Server', level: 2 },
    { id: '6-x402-payment-protocol', label: 'x402 Protocol', level: 2 },
    { id: '7-stealth-addresses', label: 'Stealth Addresses', level: 2 },
    { id: '8-verifiable-ai-engine', label: 'Verifiable AI', level: 2 },
    { id: '9-payfi-credit-layer', label: 'PayFi Credit', level: 2 },
    { id: '10-zk-privacy-shield', label: 'ZK Privacy Shield', level: 2 },
    { id: '11-smart-contract-reference', label: 'Smart Contracts', level: 2 },
    { id: '12-api-reference', label: 'API Reference', level: 2 },
    { id: '13-sdk--plugin-ecosystem', label: 'SDK & Plugins', level: 2 },
    { id: '14-aps-1-v21', label: 'APS-1 v2.1', level: 2 },
    { id: '15-fee-schedule', label: 'Fee Schedule', level: 2 },
    { id: '16-security-model', label: 'Security Model', level: 2 },
    { id: '17-deployment-guide', label: 'Deployment', level: 2 },
];

const quickLinks = [
    {
        title: 'Getting Started',
        desc: 'Prerequisites, project structure, and quick start',
        href: '#3-getting-started',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        ),
    },
    {
        title: 'MCP Server',
        desc: '10 JSON-RPC payment tools for any AI model',
        href: '#5-mcp-server',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
        ),
    },
    {
        title: 'PayFi Credit',
        desc: 'AI agent lending with 5-tier credit scoring',
        href: '#9-payfi-credit-layer',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
        ),
    },
    {
        title: 'API Reference',
        desc: 'REST endpoints for all protocol features',
        href: '#12-api-reference',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
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
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">v4.0</span>
                    <span className="px-2.5 py-1 bg-white/5 text-slate-400 text-xs rounded-full border border-white/10">Tempo Moderato L1</span>
                    <span className="text-xs text-slate-500">Last updated: March 2026</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    Protocol <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Documentation</span>
                </h1>
                <p className="text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed">
                    Complete reference for the PayPol financial operating system — MCP server, x402 payments, stealth addresses, verifiable AI, PayFi credit, ZK privacy, and 9 verified smart contracts.
                </p>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-14">
                {quickLinks.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        className="group p-4 rounded-xl bg-[#152036] border border-white/[0.06] hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all"
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
