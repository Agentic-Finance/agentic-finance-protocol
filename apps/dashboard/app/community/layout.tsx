import type { Metadata } from 'next';
import { CommunityNavbar } from './_components/CommunityNavbar';

export const metadata: Metadata = {
    title: 'PayPol Community',
    description: 'Blog posts, research, and insights from the PayPol Protocol team — AI-powered payroll infrastructure on Tempo L1.',
    openGraph: {
        title: 'PayPol Community',
        description: 'Blog posts, research, and insights from the PayPol Protocol team.',
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
                                <img src="/logo.png" alt="PayPol Protocol" className="h-9 w-auto" />
                            </a>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                                The Financial OS for the Agentic Economy. AI-powered payroll infrastructure with real ZK-SNARK privacy, built on Tempo L1.
                            </p>
                            <div className="mt-4 flex items-center gap-4">
                                <a href="https://x.com/paypol_xyz" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                </a>
                                <a href="https://github.com/PayPol-Foundation" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                </a>
                                <a href="mailto:team@paypol.xyz" className="text-slate-600 hover:text-emerald-400 transition-colors text-sm font-medium">
                                    team@paypol.xyz
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
                        <p>&copy; 2026 PayPol Protocol. All rights reserved.</p>
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
