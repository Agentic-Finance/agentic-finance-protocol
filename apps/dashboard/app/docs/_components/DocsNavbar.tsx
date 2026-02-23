'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinks = [
    { href: '/docs/documentation', label: 'Documentation' },
    { href: '/docs/research-paper', label: 'Research Paper' },
];

export function DocsNavbar() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-xl">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <a href="/" className="flex items-center hover:opacity-90 transition-opacity">
                    <img src="/logo.png" alt="PayPol Protocol" className="h-9 w-auto" />
                </a>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <a
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-white/[0.08] text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                    }`}
                            >
                                {link.label}
                            </a>
                        );
                    })}
                    <div className="w-px h-6 bg-white/10 mx-2"></div>
                    <a
                        href="/"
                        className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-xs font-bold"
                    >
                        Launch App
                    </a>
                </nav>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-white/5 bg-[#0B1120]/95 backdrop-blur-xl">
                    <div className="px-4 py-4 flex flex-col gap-1">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-white/[0.08] text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                        }`}
                                >
                                    {link.label}
                                </a>
                            );
                        })}
                        <a
                            href="/"
                            onClick={() => setMobileMenuOpen(false)}
                            className="mt-2 px-4 py-3 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 text-sm font-bold text-center"
                        >
                            Launch App
                        </a>
                    </div>
                </div>
            )}
        </header>
    );
}
