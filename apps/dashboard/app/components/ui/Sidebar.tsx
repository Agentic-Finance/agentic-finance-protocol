'use client';
import React from 'react';
import Image from 'next/image';
import { useSidebar } from './SidebarContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    HomeIcon, ChatBubbleLeftRightIcon, BriefcaseIcon,
    AiBrainIcon, BoltIcon, ShieldIcon, ChartBarIcon,
    CurrencyDollarIcon, WalletIcon, ClipboardIcon,
    WrenchScrewdriverIcon, CodeBracketIcon,
    ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
    ArrowsRightLeftIcon, CreditCardIcon, GlobeAltIcon,
    SignalIcon, RobotIcon, BookOpenIcon, MessageIcon,
    PulseIcon, ShieldCheckIcon, CoinsIcon, AiNetworkIcon,
    ArrowPathIcon,
} from '../icons';

interface NavSection { label: string; items: NavItem[]; }
interface NavItem { href: string; label: string; icon: React.ReactNode; }

const sections: NavSection[] = [
    {
        label: 'Main',
        items: [
            { href: '/?app=1', label: 'Dashboard', icon: <HomeIcon className="w-[18px] h-[18px]" /> },
            { href: '/chat', label: 'Chat', icon: <ChatBubbleLeftRightIcon className="w-[18px] h-[18px]" /> },
            { href: '/portfolio', label: 'Portfolio', icon: <BriefcaseIcon className="w-[18px] h-[18px]" /> },
            { href: '/stream', label: 'Streams', icon: <PulseIcon className="w-[18px] h-[18px]" /> },
        ],
    },
    {
        label: 'Intelligence',
        items: [
            { href: '/cortex', label: 'Cortex', icon: <AiBrainIcon className="w-[18px] h-[18px]" /> },
            { href: '/swarm', label: 'Swarm', icon: <AiNetworkIcon className="w-[18px] h-[18px]" /> },
            { href: '/sentinel', label: 'Sentinel', icon: <ShieldCheckIcon className="w-[18px] h-[18px]" /> },
            { href: '/analytics', label: 'Analytics', icon: <ChartBarIcon className="w-[18px] h-[18px]" /> },
        ],
    },
    {
        label: 'Payments',
        items: [
            { href: '/payments/send', label: 'Send & Receive', icon: <ArrowsRightLeftIcon className="w-[18px] h-[18px]" /> },
            { href: '/payments/swap', label: 'Swap & Bridge', icon: <ArrowPathIcon className="w-[18px] h-[18px]" /> },
            { href: '/payments/buy', label: 'Buy & Sell', icon: <CreditCardIcon className="w-[18px] h-[18px]" /> },
            { href: '/payments/subscriptions', label: 'Subscriptions', icon: <SignalIcon className="w-[18px] h-[18px]" /> },
            { href: '/payments/agents', label: 'Agent Payments', icon: <RobotIcon className="w-[18px] h-[18px]" /> },
        ],
    },
    {
        label: 'Finance',
        items: [
            { href: '/shield', label: 'Shield', icon: <ShieldIcon className="w-[18px] h-[18px]" /> },
            { href: '/revenue', label: 'Revenue', icon: <CoinsIcon className="w-[18px] h-[18px]" /> },
            { href: '/wallets', label: 'Wallets', icon: <WalletIcon className="w-[18px] h-[18px]" /> },
            { href: '/transactions', label: 'History', icon: <ClipboardIcon className="w-[18px] h-[18px]" /> },
        ],
    },
    {
        label: 'Resources',
        items: [
            { href: '/docs', label: 'Docs', icon: <BookOpenIcon className="w-[18px] h-[18px]" /> },
            { href: '/community', label: 'Blog', icon: <MessageIcon className="w-[18px] h-[18px]" /> },
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
                <Link href="/?app=1" className="flex items-center gap-3 px-3 py-4 group" title="Dashboard">
                    <div className="flex-shrink-0 relative" style={{ width: 36, height: 36, perspective: '200px' }}>
                        <div className="absolute inset-[-6px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(62,221,185,0.1) 0%, rgba(27,191,236,0.05) 50%, transparent 70%)', animation: 'pulse-glow 4s ease-in-out infinite' }} />
                        <div style={{
                            animation: 'sidebar-logo-rotate 20s ease-in-out infinite, logo-float 6s ease-in-out infinite',
                            filter: 'drop-shadow(0 0 8px rgba(62,221,185,0.3)) drop-shadow(0 0 16px rgba(27,191,236,0.15))',
                        }}>
                            <Image src="/logo-v2.png" alt="Agentic Finance" width={36} height={36} />
                        </div>
                    </div>
                    {!collapsed && (
                        <span className="text-[15px] font-extrabold tracking-tight whitespace-nowrap" style={{ fontFamily: 'var(--agt-font-display)', color: 'var(--pp-text-primary)' }}>
                            Agentic Finance
                        </span>
                    )}
                </Link>
                <button onClick={() => setMobileOpen(false)}
                    className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                    style={{ color: 'var(--pp-text-secondary)' }}
                    aria-label="Close sidebar"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1" aria-label="Sidebar navigation">
                {sections.map((section, idx) => (
                    <div key={section.label}>
                        {idx > 0 && <div className="my-2" style={{ borderTop: '1px solid var(--pp-border)' }} />}
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
            <div className="p-2 space-y-1" style={{ borderTop: '1px solid var(--pp-border)' }}>
                <button onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all text-xs"
                    style={{ color: 'var(--pp-text-muted)' }}
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
