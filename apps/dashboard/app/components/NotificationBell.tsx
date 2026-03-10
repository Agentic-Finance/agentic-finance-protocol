'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    streamJobId?: string;
}

interface Toast {
    id: string;
    icon: string;
    title: string;
    color: string;
    ts: number;
}

interface NotificationBellProps {
    walletAddress: string | null;
}

// ── Category Config ──────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; label: string; route: string }> = {
    stream:  { icon: '\uD83D\uDD04', color: '#818cf8', label: 'Stream',  route: '/stream' },
    job:     { icon: '\uD83D\uDCBC', color: '#f59e0b', label: 'Job',     route: '/' },
    escrow:  { icon: '\uD83D\uDD12', color: '#06b6d4', label: 'Escrow',  route: '/' },
    fiat:    { icon: '\uD83D\uDCB3', color: '#10b981', label: 'Fiat',    route: '/wallets' },
    swarm:   { icon: '\uD83D\uDC1D', color: '#f97316', label: 'Swarm',   route: '/swarm' },
    a2a:     { icon: '\u26A1',       color: '#a855f7', label: 'A2A',     route: '/swarm' },
    intel:   { icon: '\uD83E\uDDE0', color: '#ef4444', label: 'Intel',   route: '/swarm' },
    payroll: { icon: '\uD83D\uDCB0', color: '#22c55e', label: 'Payroll', route: '/wallets' },
    wallet:  { icon: '\uD83D\uDC5B', color: '#ec4899', label: 'Wallet',  route: '/wallets' },
    review:  { icon: '\u2B50',       color: '#eab308', label: 'Review',  route: '/' },
    agent:   { icon: '\uD83E\uDD16', color: '#6366f1', label: 'Agent',   route: '/' },
    offramp: { icon: '\uD83C\uDFE6', color: '#14b8a6', label: 'Offramp', route: '/wallets' },
    judge:   { icon: '\u2696\uFE0F', color: '#f43f5e', label: 'Judge',   route: '/' },
};

const FILTER_TABS = ['all', 'stream', 'job', 'escrow', 'swarm', 'fiat', 'payroll'];

function getCategory(type: string): string {
    return type.split(':')[0] || 'stream';
}

function getCategoryConfig(type: string) {
    return CATEGORY_CONFIG[getCategory(type)] || CATEGORY_CONFIG.stream;
}

function getSubtypeIcon(type: string): string {
    if (type.includes('completed') || type.includes('approved') || type.includes('settled')) return '\u2705';
    if (type.includes('failed') || type.includes('rejected') || type.includes('cancelled')) return '\u274C';
    if (type.includes('disputed')) return '\u26A0\uFE0F';
    if (type.includes('submitted')) return '\uD83D\uDCE4';
    if (type.includes('locked')) return '\uD83D\uDD10';
    if (type.includes('released')) return '\uD83D\uDD13';
    if (type.includes('transfer')) return '\u26A1';
    if (type.includes('recorded')) return '\u2705';
    return getCategoryConfig(type).icon;
}

function getTypeColor(type: string): string {
    if (type.includes('completed') || type.includes('approved') || type.includes('settled') || type.includes('recorded')) return '#10b981';
    if (type.includes('failed') || type.includes('rejected') || type.includes('cancelled') || type.includes('disputed')) return '#ef4444';
    if (type.includes('submitted') || type.includes('executing') || type.includes('checkout')) return '#f59e0b';
    return getCategoryConfig(type).color;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function formatTypeBadge(type: string): string {
    const parts = type.split(':');
    return parts.length > 1 ? parts[1].replace(/_/g, ' ').toUpperCase() : type.toUpperCase();
}

// ── Component ────────────────────────────────────────────────

function NotificationBell({ walletAddress }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const prevUnreadRef = useRef(0);
    const router = useRouter();
    const pathname = usePathname();

    const fetchNotifications = useCallback(async () => {
        if (!walletAddress) return;
        try {
            const res = await fetch(`/api/notifications?wallet=${walletAddress}&limit=30`);
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (err) {
            console.error('Notification fetch error:', err);
        }
    }, [walletAddress]);

    // Poll every 10 seconds
    useEffect(() => {
        if (!walletAddress) return;
        fetchNotifications();
        const interval = setInterval(() => { if (!document.hidden) fetchNotifications(); }, 10000);
        return () => clearInterval(interval);
    }, [walletAddress, fetchNotifications]);

    // Toast on new notification
    useEffect(() => {
        if (unreadCount > prevUnreadRef.current && prevUnreadRef.current > 0 && !isOpen) {
            // Find latest unread
            const latest = notifications.find(n => !n.isRead);
            if (latest) {
                const cat = getCategoryConfig(latest.type);
                const newToast: Toast = {
                    id: latest.id,
                    icon: getSubtypeIcon(latest.type),
                    title: latest.title,
                    color: cat.color,
                    ts: Date.now(),
                };
                setToasts(prev => [newToast, ...prev].slice(0, 3));
            }
        }
        prevUnreadRef.current = unreadCount;
    }, [unreadCount, notifications, isOpen]);

    // Auto-dismiss toasts after 4s
    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => Date.now() - t.ts < 4000));
        }, 4100);
        return () => clearTimeout(timer);
    }, [toasts]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllRead = async () => {
        if (!walletAddress) return;
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: walletAddress, markAllRead: true }),
            });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Mark read error:', err);
        }
    };

    // Mark a single notification as read
    const markSingleRead = useCallback(async (notifId: string) => {
        if (!walletAddress) return;
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: walletAddress, ids: [notifId] }),
            });
            setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* ignore */ }
    }, [walletAddress]);

    // Determine where to navigate for a notification (used for potential external links)
    const getNotificationRoute = useCallback((n: Notification): string => {
        const cat = getCategory(n.type);
        const catConfig = CATEGORY_CONFIG[cat];

        // Job/Escrow/Agent/Judge → chat panel for that job
        if ((cat === 'job' || cat === 'escrow' || cat === 'agent' || cat === 'judge') && n.streamJobId) {
            return `/?app=1&chat=${n.streamJobId}`;
        }
        // Stream → stream page with ID
        if (cat === 'stream' && n.streamJobId) {
            return `/stream?id=${n.streamJobId}`;
        }
        // Fiat/Payroll/Wallet/Offramp → wallets page
        if (cat === 'fiat' || cat === 'payroll' || cat === 'wallet' || cat === 'offramp') {
            return '/wallets';
        }
        // Default to category route
        return catConfig?.route || '/';
    }, []);

    // Handle clicking on a notification
    const handleNotificationClick = useCallback((n: Notification) => {
        // 1. Mark as read
        if (!n.isRead) markSingleRead(n.id);

        // 2. Close dropdown
        setIsOpen(false);

        const cat = getCategory(n.type);

        // Use setTimeout to ensure dropdown close animation doesn't block navigation
        setTimeout(() => {
            // 3. Job/Escrow/Agent/Judge → open chat panel (dispute context)
            if (cat === 'job' || cat === 'escrow' || cat === 'agent' || cat === 'judge') {
                if (pathname === '/') {
                    window.dispatchEvent(new CustomEvent('paypol:openChat', {
                        detail: { jobId: n.streamJobId || null },
                    }));
                } else {
                    router.push(n.streamJobId ? `/?app=1&chat=${n.streamJobId}` : '/?app=1&openChat=1');
                }
                return;
            }

            // 4. Stream notifications → stream page
            if (cat === 'stream') {
                const target = n.streamJobId ? `/stream?id=${n.streamJobId}` : '/stream';
                if (pathname === '/stream') {
                    if (n.streamJobId) window.location.href = `/stream?id=${n.streamJobId}`;
                } else {
                    router.push(target);
                }
                return;
            }

            // 5. Fiat/Payroll/Wallet/Offramp → wallets page
            if (cat === 'fiat' || cat === 'payroll' || cat === 'wallet' || cat === 'offramp') {
                if (pathname !== '/wallets') router.push('/wallets');
                return;
            }

            // 6. Swarm/A2A/Intel → swarm page
            if (cat === 'swarm' || cat === 'a2a' || cat === 'intel') {
                if (pathname !== '/swarm') router.push('/swarm');
                return;
            }

            // 7. Review/Other → open chat panel as fallback
            if (pathname === '/') {
                window.dispatchEvent(new CustomEvent('paypol:openChat', {
                    detail: { jobId: n.streamJobId || null },
                }));
            } else {
                router.push('/?app=1&openChat=1');
            }
        }, 50);
    }, [markSingleRead, pathname, router]);

    const filteredNotifications = activeFilter === 'all'
        ? notifications
        : notifications.filter(n => getCategory(n.type) === activeFilter);

    // Count by category for filter badges
    const categoryCounts: Record<string, number> = {};
    notifications.forEach(n => {
        if (!n.isRead) {
            const cat = getCategory(n.type);
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
    });

    if (!walletAddress) return null;

    return (
        <>
            {/* Toast Notifications — Fixed top-right */}
            {toasts.length > 0 && (
                <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
                    {toasts.map((t) => (
                        <div
                            key={t.id}
                            className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-2xl animate-slide-in-right"
                            style={{
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                borderColor: `${t.color}40`,
                                boxShadow: `0 8px 32px ${t.color}20`,
                            }}
                        >
                            <span className="text-base">{t.icon}</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{t.title}</span>
                                <span className="text-[10px] text-slate-500">just now</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse ml-1" style={{ background: t.color }} />
                        </div>
                    ))}
                </div>
            )}

            <div ref={dropdownRef} className="relative">
                {/* Bell Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-[400px] max-h-[540px] flex flex-col bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl z-[100]">
                        {/* Header */}
                        <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">Notifications</span>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Filter Tabs */}
                        <div className="border-b border-white/[0.04] px-3 py-2 flex gap-1 overflow-x-auto shrink-0 scrollbar-hide">
                            {FILTER_TABS.map((tab) => {
                                const isActive = activeFilter === tab;
                                const tabConf = CATEGORY_CONFIG[tab];
                                const count = tab === 'all' ? unreadCount : (categoryCounts[tab] || 0);
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveFilter(tab)}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                                            isActive
                                                ? 'bg-white/[0.08] text-white'
                                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                                        }`}
                                    >
                                        {tab === 'all' ? '\uD83D\uDD14' : tabConf?.icon}
                                        <span>{tab === 'all' ? 'All' : tabConf?.label}</span>
                                        {count > 0 && (
                                            <span
                                                className="ml-0.5 text-[8px] px-1 py-0 rounded-full"
                                                style={{
                                                    background: tab === 'all' ? '#ef444420' : `${tabConf?.color}20`,
                                                    color: tab === 'all' ? '#ef4444' : tabConf?.color,
                                                }}
                                            >
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Notification List */}
                        <div className="overflow-y-auto flex-1">
                            {filteredNotifications.length === 0 ? (
                                <div className="px-4 py-12 text-center">
                                    <div className="text-3xl mb-2">{activeFilter === 'all' ? '\uD83D\uDD14' : CATEGORY_CONFIG[activeFilter]?.icon}</div>
                                    <p className="text-slate-500 text-sm font-medium">
                                        {activeFilter === 'all' ? 'No notifications yet' : `No ${CATEGORY_CONFIG[activeFilter]?.label || activeFilter} notifications`}
                                    </p>
                                    <p className="text-slate-600 text-xs mt-1">
                                        {activeFilter === 'all' ? 'Events from all platform actions will appear here' : 'Events will appear as they happen'}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.03]">
                                    {filteredNotifications.map((n) => {
                                        const cat = getCategoryConfig(n.type);
                                        return (
                                            <div
                                                key={n.id}
                                                onClick={() => handleNotificationClick(n)}
                                                className={`px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer ${!n.isRead ? 'bg-white/[0.02]' : ''}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Icon */}
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                                                        style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}25` }}
                                                    >
                                                        {getSubtypeIcon(n.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        {/* Title row */}
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-xs font-bold text-white truncate">{n.title}</span>
                                                            {!n.isRead && (
                                                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                                                            )}
                                                        </div>
                                                        {/* Message */}
                                                        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{n.message}</p>
                                                        {/* Meta row */}
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            {/* Category badge */}
                                                            <span
                                                                className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                                                                style={{
                                                                    color: cat.color,
                                                                    backgroundColor: `${cat.color}10`,
                                                                    border: `1px solid ${cat.color}20`,
                                                                }}
                                                            >
                                                                {cat.label.toUpperCase()}
                                                            </span>
                                                            {/* Type badge */}
                                                            <span
                                                                className="text-[8px] font-bold px-1.5 py-0.5 rounded border"
                                                                style={{
                                                                    color: getTypeColor(n.type),
                                                                    backgroundColor: `${getTypeColor(n.type)}10`,
                                                                    borderColor: `${getTypeColor(n.type)}20`,
                                                                }}
                                                            >
                                                                {formatTypeBadge(n.type)}
                                                            </span>
                                                            <span className="text-[10px] text-slate-600">{timeAgo(n.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Inline keyframe for toast slide-in */}
            <style jsx global>{`
                @keyframes slide-in-right {
                    from { opacity: 0; transform: translateX(100px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out forwards;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </>
    );
}

export default React.memo(NotificationBell);
