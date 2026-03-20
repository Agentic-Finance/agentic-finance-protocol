'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ChatBubbleLeftRightIcon, BriefcaseIcon, ActivityIcon, GlobeAltIcon } from '../icons';

const TABS = [
    { href: '/?app=1', label: 'Dashboard', Icon: HomeIcon, matchPath: '/' },
    { href: '/chat', label: 'Chat', Icon: ChatBubbleLeftRightIcon, matchPath: '/chat' },
    { href: '/portfolio', label: 'Portfolio', Icon: BriefcaseIcon, matchPath: '/portfolio' },
    { href: '/live', label: 'Live', Icon: ActivityIcon, matchPath: '/live' },
    { href: '/cortex', label: 'More', Icon: GlobeAltIcon, matchPath: '/cortex' },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pp-glass" style={{ borderTop: '1px solid var(--pp-border)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex items-center justify-around h-16 px-2">
                {TABS.map(tab => {
                    const isActive = tab.matchPath === '/'
                        ? pathname === '/'
                        : pathname.startsWith(tab.matchPath);

                    return (
                        <Link key={tab.label} href={tab.href}
                            className={`relative flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-all ${isActive ? '' : 'text-slate-500 hover:text-slate-300'}`}
                            style={isActive ? { color: 'var(--agt-pink)' } : undefined}
                        >
                            {isActive && (
                                <span className="absolute top-0 w-8 h-0.5 rounded-full" style={{ background: 'var(--agt-pink)' }} />
                            )}
                            <tab.Icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default MobileNav;
