import type { Metadata } from 'next';
import { DocsNavbar } from './_components/DocsNavbar';

export const metadata: Metadata = {
    title: 'PayPol Protocol — Docs',
    description: 'PayPol Protocol documentation and research resources.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-300">
            <DocsNavbar />

            {/* Main Content */}
            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 bg-[#070C16]">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        {/* Brand */}
                        <div>
                            <a href="/" className="flex items-center mb-3 hover:opacity-90 transition-opacity">
                                <img src="/logo.png" alt="PayPol Protocol" className="h-9 w-auto" />
                            </a>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                The Financial OS for the Agentic Economy. Built on Tempo, secured by ZK-SNARKs.
                            </p>
                        </div>

                        {/* Resources */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Resources</h4>
                            <div className="flex flex-col gap-2.5">
                                <a href="/docs/documentation" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Documentation</a>
                                <a href="/docs/research-paper" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Research Paper</a>
                                <a href="/" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">Launch App</a>
                            </div>
                        </div>

                        {/* Protocol */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Protocol</h4>
                            <div className="flex flex-col gap-2.5">
                                <span className="text-sm text-slate-500">Tempo Moderato (EVM)</span>
                                <span className="text-sm text-slate-500">Solidity ^0.8.20</span>
                                <span className="text-sm text-slate-500">Groth16 ZK-SNARKs</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
                        <p>&copy; 2026 PayPol Protocol. All rights reserved.</p>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Deployed on Tempo Moderato Testnet</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
