import type { Metadata } from 'next';
import { CommunityNavbar } from './_components/CommunityNavbar';

export const metadata: Metadata = {
    title: 'Agentic Finance Community',
    description: 'Blog posts, research, and insights from the Agentic Finance team — AI-powered payment infrastructure on Tempo L1.',
    openGraph: {
        title: 'Agentic Finance Community',
        description: 'Blog posts, research, and insights from the Agentic Finance team.',
        type: 'website',
    },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0F1724] text-slate-300">
            <CommunityNavbar />

            <main>{children}</main>

            {/* Footer */}
            <footer className="border-t border-white/5 bg-[#070C16]">
                <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
                        {/* Brand */}
                        <div className="md:col-span-2">
                            <a href="/" className="flex items-center mb-4 hover:opacity-90 transition-opacity">
                                <img src="/logo.png" alt="" className="h-9 w-9 object-contain" /><span className="text-xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>Agentic Finance</span>
                            </a>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                                The Financial OS for the Agentic Economy. Where autonomous agents settle billions — privately, instantly, without a single human signature.
                            </p>
                            <div className="mt-4 flex items-center gap-4">
                                <a href="https://x.com/paypol_xyz" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                </a>
                                <a href="mailto:team@agt.finance" className="text-slate-600 hover:text-emerald-400 transition-colors text-sm font-medium">
                                    team@agt.finance
                                </a>
                            </div>
                        </div>

                        {/* Resources */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Resources</h4>
                            <div className="flex flex-col gap-2.5">
                                <a href="/community" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Blog</a>
                                <a href="/docs/documentation" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Documentation</a>
                                <a href="/docs/research-paper" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Research Paper</a>
                                <a href="/protocol" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Protocol</a>
                            </div>
                        </div>

                        {/* Product */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Product</h4>
                            <div className="flex flex-col gap-2.5">
                                <a href="/" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Launch App</a>
                                <a href="/developers" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Developers</a>
                                <a href="/verify" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">AI Proof Verifier</a>
                                <a href="/showcase" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Live Network</a>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
                        <p>&copy; 2026 Agentic Finance. All rights reserved.</p>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Live on Tempo Moderato (Chain 42431)</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
