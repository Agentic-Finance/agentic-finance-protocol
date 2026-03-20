'use client';
import React, { useState } from 'react';
import { AppShell } from '../components/ui/AppShell';
import { useWallet } from '../hooks/useWallet';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { Bell, Check, Filter } from 'lucide-react';

const TABS = ['All', 'Unread', 'Escrow', 'Stream', 'Agent', 'System'] as const;
type TabType = typeof TABS[number];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function typeEmoji(type: string): string {
  if (type.startsWith('stream:')) return '\u{1F4A7}';
  if (type.startsWith('escrow:')) return '\u{1F512}';
  if (type.startsWith('job:')) return '\u{1F916}';
  if (type.startsWith('fiat:')) return '\u{1F4B3}';
  if (type.startsWith('swarm:')) return '\u{1F41D}';
  return '\u{1F514}';
}

function filterByTab(notifications: Notification[], tab: TabType): Notification[] {
  switch (tab) {
    case 'Unread': return notifications.filter(n => !n.isRead);
    case 'Escrow': return notifications.filter(n => n.type.startsWith('escrow:'));
    case 'Stream': return notifications.filter(n => n.type.startsWith('stream:'));
    case 'Agent': return notifications.filter(n => n.type.startsWith('job:') || n.type.startsWith('agent:'));
    case 'System': return notifications.filter(n => n.type.startsWith('fiat:') || n.type.startsWith('wallet:') || n.type.startsWith('payroll:'));
    default: return notifications;
  }
}

export default function NotificationsPage() {
  const { address } = useWallet();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications(address);
  const [activeTab, setActiveTab] = useState<TabType>('All');

  const filtered = filterByTab(notifications, activeTab);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-slate-400 mt-1">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="space-y-1">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl pp-skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs mt-1 text-slate-600">
                {activeTab !== 'All' ? `No ${activeTab.toLowerCase()} notifications` : 'You\'re all caught up'}
              </p>
            </div>
          ) : (
            filtered.map(n => (
              <button
                key={n.id}
                onClick={() => { if (!n.isRead) markAsRead([n.id]); }}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
                  !n.isRead
                    ? 'bg-cyan-500/[0.03] border-cyan-500/10 hover:bg-cyan-500/[0.06]'
                    : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                <span className="text-lg mt-0.5">{typeEmoji(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{n.title}</span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                </div>
                <span className="text-[10px] text-slate-600 flex-shrink-0 mt-1">{timeAgo(n.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
