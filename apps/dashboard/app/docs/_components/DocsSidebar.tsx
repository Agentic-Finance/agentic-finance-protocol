'use client';

import { useState, useEffect, useCallback } from 'react';

export interface TocItem {
    id: string;
    label: string;
    level: number;
}

interface DocsSidebarProps {
    items: TocItem[];
    accentColor?: 'emerald' | 'amber';
}

export function DocsSidebar({ items, accentColor = 'emerald' }: DocsSidebarProps) {
    const [activeId, setActiveId] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);

    const handleScroll = useCallback(() => {
        const headings = items.map(item => ({
            id: item.id,
            el: document.getElementById(item.id),
        })).filter(h => h.el !== null);

        let currentId = '';
        for (const heading of headings) {
            const rect = heading.el!.getBoundingClientRect();
            if (rect.top <= 120) {
                currentId = heading.id;
            }
        }
        setActiveId(currentId);
    }, [items]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setIsOpen(false);
        }
    };

    const accent = accentColor === 'amber' ? {
        active: 'text-amber-400',
        border: 'border-amber-400',
        bg: 'bg-amber-400/5',
        hover: 'hover:text-amber-400',
        mobileBg: 'bg-amber-500/10',
        mobileText: 'text-amber-400',
        mobileBorder: 'border-amber-500/20',
    } : {
        active: 'text-emerald-400',
        border: 'border-emerald-400',
        bg: 'bg-emerald-400/5',
        hover: 'hover:text-emerald-400',
        mobileBg: 'bg-emerald-500/10',
        mobileText: 'text-emerald-400',
        mobileBorder: 'border-emerald-500/20',
    };

    return (
        <>
            {/* Mobile TOC toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`lg:hidden fixed bottom-6 right-6 z-40 p-3 rounded-full ${accent.mobileBg} ${accent.mobileText} border ${accent.mobileBorder} shadow-lg shadow-black/30 backdrop-blur-xl`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
            </button>

            {/* Mobile TOC overlay */}
            {isOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                    <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-[#0D1119] border-t border-white/10 rounded-t-2xl overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white">Table of Contents</h3>
                            <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <nav className="flex flex-col gap-0.5">
                            {items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollTo(item.id)}
                                    className={`text-left text-sm py-2 px-3 rounded-lg transition-all ${item.level === 2 ? 'pl-3' : item.level === 3 ? 'pl-6' : 'pl-3'
                                        } ${activeId === item.id
                                            ? `${accent.active} ${accent.bg} font-medium`
                                            : `text-slate-400 ${accent.hover}`
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
                <div className="sticky top-24">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-3">On this page</h3>
                    <nav className="flex flex-col gap-0.5 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 scrollbar-thin">
                        {items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollTo(item.id)}
                                className={`text-left text-[13px] py-1.5 px-3 rounded-md transition-all border-l-2 ${item.level === 2 ? 'ml-0' : item.level === 3 ? 'ml-3' : 'ml-0'
                                    } ${activeId === item.id
                                        ? `${accent.active} ${accent.border} ${accent.bg} font-medium`
                                        : `text-slate-500 border-transparent ${accent.hover} hover:border-white/10`
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Back to top */}
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="mt-6 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        Back to top
                    </button>
                </div>
            </aside>
        </>
    );
}
