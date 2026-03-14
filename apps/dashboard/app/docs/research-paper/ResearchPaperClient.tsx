'use client';

import { DocsSidebar, type TocItem } from '../_components/DocsSidebar';

const tocItems: TocItem[] = [
    { id: 'abstract', label: 'Abstract', level: 2 },
    { id: '1-introduction', label: '1. Introduction', level: 2 },
    { id: '2-system-architecture', label: '2. Architecture', level: 2 },
    { id: '3-economic-model', label: '3. Economic Model', level: 2 },
    { id: '4-trustless-escrow-architecture', label: '4. Escrow', level: 2 },
    { id: '5-cryptographic-privacy', label: '5. Privacy', level: 2 },
    { id: '6-verifiable-ai-proofs', label: '6. Verifiable AI', level: 2 },
    { id: '7-mcp--x402-payment-protocols', label: '7. MCP & x402', level: 2 },
    { id: '8-payfi-credit-system', label: '8. PayFi Credit', level: 2 },
    { id: '9-agent-economy', label: '9. Agent Economy', level: 2 },
    { id: '10-metering--streaming-micropayments', label: '10. Metering', level: 2 },
    { id: '11-aps-1-v21--agent-payment-standard', label: '11. APS-1 v2.1', level: 2 },
    { id: '12-performance-analysis', label: '12. Performance', level: 2 },
    { id: '13-related-work', label: '13. Related Work', level: 2 },
    { id: '14-future-work', label: '14. Future Work', level: 2 },
    { id: '15-conclusion', label: '15. Conclusion', level: 2 },
    { id: '16-references', label: '16. References', level: 2 },
];

const paperStats = [
    { label: 'Sections', value: '16' },
    { label: 'References', value: '11' },
    { label: 'Smart Contracts', value: '9' },
    { label: 'Protocols', value: '7' },
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
                    <span className="px-2.5 py-1 bg-white/5 text-slate-400 text-xs rounded-full border border-white/10">Technical Paper v4.0</span>
                    <span className="text-xs text-slate-500">March 2026</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                    A Deterministic Financial Substrate for{' '}
                    <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                        Autonomous Agent Economies
                    </span>
                </h1>

                <p className="text-base md:text-lg text-slate-400 max-w-3xl leading-relaxed mb-8">
                    Economic models, cryptographic privacy, AI-native credit systems, and protocol design for the Agentic Finance operating system.
                </p>

                {/* Author Card */}
                <div className="p-5 rounded-xl bg-[#152036] border border-white/[0.06] max-w-2xl">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Authors</div>
                            <div className="text-sm text-white font-medium">Agentic Finance Research Team</div>
                        </div>
                        <div className="hidden sm:block w-px h-8 bg-white/10"></div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Affiliation</div>
                            <div className="text-sm text-white font-medium">Agentic Finance, Tempo Network</div>
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
                        {['ZK-SNARKs', 'MCP', 'x402', 'Stealth Addresses', 'PayFi', 'Verifiable AI', 'APS-1'].map((kw) => (
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
                    <div key={stat.label} className="p-4 rounded-xl bg-[#152036] border border-white/[0.06] text-center">
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
