'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    streamJobId?: string;
}

interface NotificationBellProps {
    walletAddress: string | null;
}

function NotificationBell({ walletAddress }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!walletAddress) return;
        try {
            const res = await fetch(`/api/notifications?wallet=${walletAddress}&limit=20`);
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (err) {
            console.error('Notification fetch error:', err);
        }
    }, [walletAddress]);

    // Poll every 15 seconds
    useEffect(() => {
        if (!walletAddress) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, [walletAddress, fetchNotifications]);

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

    const getTypeIcon = (type: string) => {
        if (type.includes('submitted')) return '📤';
        if (type.includes('approved')) return '✅';
        if (type.includes('rejected')) return '❌';
        if (type.includes('completed')) return '🎉';
        if (type.includes('cancelled')) return '🚫';
        if (type.includes('created')) return '🔄';
        return '🔔';
    };

    const getTypeColor = (type: string) => {
        if (type.includes('approved') || type.includes('completed')) return '#10b981';
        if (type.includes('rejected') || type.includes('cancelled')) return '#ef4444';
        if (type.includes('submitted')) return '#f59e0b';
        return '#818cf8';
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    if (!walletAddress) return null;

    return (
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
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-[380px] max-h-[480px] overflow-y-auto bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl z-[100]">
                    {/* Header */}
                    <div className="sticky top-0 bg-[#111827] border-b border-white/[0.06] px-4 py-3 flex items-center justify-between z-10">
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

                    {/* Notification List */}
                    {notifications.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <p className="text-slate-500 text-sm">No notifications yet</p>
                            <p className="text-slate-600 text-xs mt-1">Stream events will appear here</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`px-4 py-3 hover:bg-white/[0.02] transition-colors ${!n.isRead ? 'bg-indigo-500/[0.03]' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg mt-0.5">{getTypeIcon(n.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-bold text-white truncate">{n.title}</span>
                                                {!n.isRead && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{n.message}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span
                                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                                                    style={{
                                                        color: getTypeColor(n.type),
                                                        backgroundColor: `${getTypeColor(n.type)}10`,
                                                        borderColor: `${getTypeColor(n.type)}25`,
                                                    }}
                                                >
                                                    {n.type.replace('stream:', '').replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                                <span className="text-[10px] text-slate-600">{timeAgo(n.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default React.memo(NotificationBell);
