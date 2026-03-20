'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export interface Notification {
  id: string;
  wallet: string;
  type: string;
  title: string;
  message: string;
  streamJobId?: string | null;
  milestoneId?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications(wallet: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notifications?wallet=${wallet}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('[useNotifications] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!wallet) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, ids }),
      });
      setNotifications(prev =>
        prev.map(n => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - ids.length));
    } catch (err) {
      console.error('[useNotifications] markAsRead error:', err);
    }
  }, [wallet]);

  const markAllAsRead = useCallback(async () => {
    if (!wallet) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, markAllRead: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[useNotifications] markAllAsRead error:', err);
    }
  }, [wallet]);

  // Fetch on mount and when wallet changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // SSE subscription
  useEffect(() => {
    if (!wallet) return;

    const es = new EventSource(`/api/notifications/stream?wallet=${wallet}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.notifications && data.notifications.length > 0) {
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newOnes = data.notifications.filter((n: Notification) => !existingIds.has(n.id));
            return [...newOnes, ...prev].slice(0, 50);
          });
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [wallet]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, refresh: fetchNotifications };
}
