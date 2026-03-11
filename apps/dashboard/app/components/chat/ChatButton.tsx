'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ChatButtonProps {
    walletAddress: string;
    onClick: () => void;
    isOpen: boolean;
}

export default function ChatButton({ walletAddress, onClick, isOpen }: ChatButtonProps) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPulsing, setIsPulsing] = useState(false);

    // Poll for unread count every 30 seconds
    const checkUnread = useCallback(async () => {
        if (!walletAddress || isOpen) return;
        try {
            const res = await fetch(`/api/chat/channels?wallet=${walletAddress}`);
            const data = await res.json();
            if (data.channels) {
                const total = data.channels.reduce((sum: number, ch: any) => sum + (ch.unreadCount || 0), 0);
                setUnreadCount(prev => {
                    if (total > prev && total > 0) setIsPulsing(true);
                    return total;
                });
            }
        } catch { /* ignore */ }
    }, [walletAddress, isOpen]);

    useEffect(() => {
        checkUnread();
        const interval = setInterval(checkUnread, 30000);
        return () => clearInterval(interval);
    }, [checkUnread]);

    // Clear pulse after 3 seconds
    useEffect(() => {
        if (isPulsing) {
            const timeout = setTimeout(() => setIsPulsing(false), 3000);
            return () => clearTimeout(timeout);
        }
    }, [isPulsing]);

    if (isOpen) return null;

    return (
        <button
            onClick={onClick}
            className="fixed bottom-2 right-2 z-[600] group p-4 cursor-pointer"
            aria-label="Open chat"
        >
            {/* Pulse ring */}
            {isPulsing && (
                <div className="absolute inset-4 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
            )}

            {/* Button */}
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 flex items-center justify-center group-hover:shadow-indigo-500/40 group-hover:scale-105 group-active:scale-95 transition-all duration-200 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>

                {/* Unread badge */}
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[22px] h-[22px] rounded-full bg-rose-500 border-2 border-[#111B2E] flex items-center justify-center px-1">
                        <span className="text-white text-[10px] font-bold tabular-nums">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    </div>
                )}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl border border-white/[0.06]">
                    Messages
                </div>
            </div>
        </button>
    );
}
