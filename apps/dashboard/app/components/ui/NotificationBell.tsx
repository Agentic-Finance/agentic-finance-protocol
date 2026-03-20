'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useNotifications } from '../../hooks/useNotifications';
import Link from 'next/link';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function typeEmoji(type: string): string {
  if (type.startsWith('stream:')) return '\u{1F4A7}';
  if (type.startsWith('escrow:')) return '\u{1F512}';
  if (type.startsWith('job:')) return '\u{1F916}';
  if (type.startsWith('fiat:')) return '\u{1F4B3}';
  if (type.startsWith('swarm:')) return '\u{1F41D}';
  if (type.startsWith('a2a:')) return '\u26A1';
  if (type.startsWith('review:')) return '\u2B50';
  if (type.startsWith('payroll:')) return '\u{1F4B0}';
  if (type.startsWith('wallet:')) return '\u{1F45B}';
  return '\u{1F514}';
}

export function NotificationBell() {
  const { address } = useWallet();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(
    address as string | null
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-slate-400 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] bg-[#111118] border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[380px] cyber-scroll-y">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markAsRead([n.id]);
                  }}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] ${
                    !n.isRead ? 'bg-cyan-500/[0.03]' : ''
                  }`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{typeEmoji(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{n.title}</span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-white transition-colors py-1"
            >
              View all <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
