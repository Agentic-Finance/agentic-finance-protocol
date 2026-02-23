'use client';

import { DocsSidebar, type TocItem } from '../_components/DocsSidebar';

const tocItems: TocItem[] = [
    { id: 'abstract', label: 'Abstract', level: 2 },
    { id: '1-introduction', label: '1. Introduction', level: 2 },
    { id: '11-the-agentic-economy-thesis', label: '1.1 Agentic Economy', level: 3 },
    { id: '12-problem-statement', label: '1.2 Problem Statement', level: 3 },
    { id: '13-contributions', label: '1.3 Contributions', level: 3 },
    { id: '2-economic-model-triple-engine-revenue-architecture', label: '2. Economic Model', level: 2 },
    { id: '3-cryptographic-privacy-the-phantom-shield', label: '3. Cryptographic Privacy', level: 2 },
    { id: '4-dynamic-negotiation-engine', label: '4. Negotiation Engine', level: 2 },
    { id: '5-escrow-smart-contract-architecture', label: '5. Escrow Architecture', level: 2 },
    { id: '6-system-architecture', label: '6. System Architecture', level: 2 },
    { id: '7-related-work', label: '7. Related Work', level: 2 },
    { id: '8-future-work', label: '8. Future Work', level: 2 },
    { id: '9-conclusion', label: '9. Conclusion', level: 2 },
    { id: 'references', label: 'References', level: 2 },
];

const paperStats = [
    { label: 'Sections', value: '9' },
    { label: 'References', value: '6' },
    { label: 'Smart Contracts', value: '4' },
    { label: 'ZK Circuits', value: '1' },
];

export function ResearchPaperClient({ children }: { children: React.ReactNode }) {
    return (
        <div>
            {/* Hero Header */}
            <div className="mb-12 pb-10 border-b border-white/5">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
                    <a href="/" className="hover:text-slate-300 transition-colors">Home</a>
                    <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <span className="text-slate-400">Research Paper</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-full border border-amber-500/20">Research</span>
                    <span className="px-2.5 py-1 bg-white/5 text-slate-400 text-xs rounded-full border border-white/10">Technical Paper v2.0</span>
                    <span className="text-xs text-slate-500">February 2026</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                    A Deterministic Financial Substrate for{' '}
                    <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                        Autonomous Agent Economies
                    </span>
                </h1>

                <p className="text-base md:text-lg text-slate-400 max-w-3xl leading-relaxed mb-8">
                    Economic models, cryptographic privacy mechanisms, and protocol design for the PayPol financial operating system.
                </p>

                {/* Author Card */}
                <div className="p-5 rounded-xl bg-[#0D1119] border border-white/[0.06] max-w-2xl">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Authors</div>
                            <div className="text-sm text-white font-medium">PayPol Research Team</div>
                        </div>
                        <div className="hidden sm:block w-px h-8 bg-white/10"></div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Affiliation</div>
                            <div className="text-sm text-white font-medium">PayPol Protocol, Tempo Network</div>
                        </div>
                        <div className="hidden sm:block w-px h-8 bg-white/10"></div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Status</div>
                            <div className="text-sm text-amber-400 font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                Living Document
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                        {['Zero-Knowledge Proofs', 'Agent Economy', 'Escrow Arbitration', 'ZK-SNARKs', 'Deterministic Finance'].map((kw) => (
                            <span key={kw} className="px-2 py-0.5 bg-white/5 text-slate-500 text-[10px] rounded-full border border-white/5 font-medium">
                                {kw}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Paper Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-14">
                {paperStats.map((stat) => (
                    <div key={stat.label} className="p-4 rounded-xl bg-[#0D1119] border border-white/[0.06] text-center">
                        <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
                        <div className="text-xs text-slate-500">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Content + Sidebar */}
            <div className="flex gap-12">
                <article className="min-w-0 flex-1 overflow-x-hidden">
                    {children}
                </article>
                <DocsSidebar items={tocItems} accentColor="amber" />
            </div>
        </div>
    );
}
