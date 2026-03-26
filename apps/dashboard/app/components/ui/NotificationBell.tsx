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
        className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all"
        style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-muted)' }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full" style={{ background: 'var(--agt-pink)' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', boxShadow: '0 16px 48px rgba(0,0,0,0.3)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--pp-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Notifications</h3>
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
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--pp-text-muted)' }}>
                <Bell className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm font-medium" style={{ color: 'var(--pp-text-secondary)' }}>No notifications yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>Payments, escrows, and agent jobs will appear here</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markAsRead([n.id]);
                  }}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
                  style={{
                    borderBottom: '1px solid var(--pp-border)',
                    background: !n.isRead ? 'var(--pp-surface-1)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--pp-surface-2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = !n.isRead ? 'var(--pp-surface-1)' : 'transparent'; }}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{typeEmoji(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--pp-text-primary)' }}>{n.title}</span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--agt-blue)' }} />
                      )}
                    </div>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--pp-text-muted)' }}>{n.message}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }}>{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2" style={{ borderTop: '1px solid var(--pp-border)' }}>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 text-xs transition-colors py-1 hover:opacity-80"
              style={{ color: 'var(--pp-text-muted)' }}
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
