'use client';
import React from 'react';
import Image from 'next/image';
import { useSidebar } from './SidebarContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    HomeIcon, ChatBubbleLeftRightIcon, BriefcaseIcon, ActivityIcon,
    SignalIcon, AiBrainIcon, BoltIcon, ShieldIcon, ChartBarIcon,
    CurrencyDollarIcon, WalletIcon, ClipboardIcon,
    WrenchScrewdriverIcon, CodeBracketIcon,
    ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
    ArrowsRightLeftIcon, CreditCardIcon, GlobeAltIcon,
} from '../icons';

interface NavSection { label: string; items: NavItem[]; }
interface NavItem { href: string; label: string; icon: React.ReactNode; }

const sections: NavSection[] = [
    {
        label: 'Main',
        items: [
            { href: '/', label: 'Dashboard', icon: <HomeIcon className="w-[18px] h-[18px]" /> },
            { href: '/chat', label: 'Chat', icon: <ChatBubbleLeftRightIcon className="w-[18px] h-[18px]" /> },
            { href: '/portfolio', label: 'Portfolio', icon: <BriefcaseIcon className="w-[18px] h-[18px]" /> },
            { href: '/live', label: 'Live Feed', icon: <ActivityIcon className="w-[18px] h-[18px]" /> },
            { href: '/stream', label: 'Streams', icon: <SignalIcon className="w-[18px] h-[18px]" /> },
        ],
    },
    {
        label: 'Intelligence',
        items: [
            { href: '/cortex', label: 'Cortex', icon: <AiBrainIcon className="w-[18px] h-[18px]" /> },
            { href: '/swarm', label: 'Swarm', icon: <BoltIcon className="w-[18px] h-[18px]" /> },
            { href: '/sentinel', label: 'Sentinel', icon: <ShieldIcon className="w-[18px] h-[18px]" /> },
            { href: '/analytics', label: 'Analytics', icon: <ChartBarIcon className="w-[18px] h-[18px]" /> },
        ],
    },
    {
        label: 'Payments',
        items: [
            { href: '/mpp', label: 'MPP Protocol', icon: <ArrowsRightLeftIcon className="w-[18px] h-[18px]" /> },
            { href: '/mpp/catalog', label: 'API Catalog', icon: <GlobeAltIcon className="w-[18px] h-[18px]" /> },
            { href: '/mpp/laso', label: 'Laso Finance', icon: <CreditCardIcon className="w-[18px] h-[18px]" /> },
        ],
    },
    {
        label: 'Finance',
        items: [
            { href: '/shield', label: 'Shield', icon: <ShieldIcon className="w-[18px] h-[18px]" /> },
            { href: '/revenue', label: 'Revenue', icon: <CurrencyDollarIcon className="w-[18px] h-[18px]" /> },
            { href: '/wallets', label: 'Wallets', icon: <WalletIcon className="w-[18px] h-[18px]" /> },
            { href: '/transactions', label: 'History', icon: <ClipboardIcon className="w-[18px] h-[18px]" /> },
        ],
    },
    {
        label: 'System',
        items: [
            { href: '/admin', label: 'Admin', icon: <WrenchScrewdriverIcon className="w-[18px] h-[18px]" /> },
            { href: '/developers', label: 'Developers', icon: <CodeBracketIcon className="w-[18px] h-[18px]" /> },
        ],
    },
];

function NavItemLink({ item, collapsed, isActive, onClick }: {
    item: NavItem; collapsed: boolean; isActive: boolean; onClick?: () => void;
}) {
    return (
        <Link href={item.href} onClick={onClick} title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative
                ${collapsed ? 'justify-center' : ''}
                border-l-2
                ${isActive
                    ? 'bg-white/[0.06]'
                    : 'hover:bg-white/[0.04] border-transparent'
                }`}
            style={{
                color: isActive ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)',
                ...(isActive ? { borderLeftColor: 'var(--agt-pink)' } : {}),
            }}
        >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
    );
}

export function Sidebar() {
    const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
    const pathname = usePathname();

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5 px-3 py-4 group">
                    <Image src="/logo.png" alt="Agentic Finance" width={32} height={32} className="flex-shrink-0 rounded-full" />
                    {!collapsed && (
                        <span className="text-sm font-bold text-white tracking-tight whitespace-nowrap" style={{ fontFamily: 'var(--agt-font-display)' }}>
                            Agentic Finance
                        </span>
                    )}
                </Link>
                <button onClick={() => setMobileOpen(false)}
                    className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
                    aria-label="Close sidebar"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1" aria-label="Sidebar navigation">
                {sections.map((section, idx) => (
                    <div key={section.label}>
                        {idx > 0 && <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }} />}
                        {!collapsed && (
                            <div className="text-[10px] uppercase tracking-widest px-4 mb-1 mt-2" style={{ color: 'var(--pp-text-muted)' }}>
                                {section.label}
                            </div>
                        )}
                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <NavItemLink key={item.href + item.label} item={item} collapsed={collapsed}
                                    isActive={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)}
                                    onClick={() => setMobileOpen(false)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Collapse toggle */}
            <div className="p-2 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <button onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all text-xs"
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed
                        ? <ChevronRightIcon className="w-4 h-4" />
                        : <><ChevronLeftIcon className="w-4 h-4" /><span>Collapse</span></>
                    }
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop sidebar */}
            <aside className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 sidebar-bg backdrop-blur-xl transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-60'}`}
                style={{ borderRight: '1px solid var(--pp-border)' }}
            >
                {sidebarContent}
            </aside>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Navigation sidebar">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute left-0 top-0 h-full w-64 sidebar-bg backdrop-blur-xl animate-slide-in-left"
                        style={{ borderRight: '1px solid var(--pp-border)' }}
                    >
                        {sidebarContent}
                    </aside>
                </div>
            )}
        </>
    );
}

export default Sidebar;
