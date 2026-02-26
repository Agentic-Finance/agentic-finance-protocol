'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────

export interface ProtocolEvent {
  id: string;
  type: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface LiveDashboardState {
  txFeed: ProtocolEvent[];
  agentActivity: Record<string, { jobs: number; lastActive: number; active: boolean }>;
  stats: {
    totalTxs: number;
    totalEscrowCreated: number;
    totalEscrowSettled: number;
    totalShieldPayouts: number;
    totalMultisendBatches: number;
    totalAgentJobs: number;
    totalA2AChains: number;
    totalZKProofs: number;
    totalFeesCollected: number;
    totalTokensDeployed: number;
  };
  tvl: { escrow: number; shield: number; multisend: number; total: number };
  connected: boolean;
  connectionCount: number;
}

const INITIAL_STATE: LiveDashboardState = {
  txFeed: [],
  agentActivity: {},
  stats: {
    totalTxs: 0, totalEscrowCreated: 0, totalEscrowSettled: 0,
    totalShieldPayouts: 0, totalMultisendBatches: 0, totalAgentJobs: 0,
    totalA2AChains: 0, totalZKProofs: 0, totalFeesCollected: 0, totalTokensDeployed: 0,
  },
  tvl: { escrow: 0, shield: 0, multisend: 0, total: 0 },
  connected: false,
  connectionCount: 0,
};

const MAX_FEED_SIZE = 100;

// ── Hook ──────────────────────────────────────────────────────

export function useSSE(orchestratorUrl?: string): LiveDashboardState {
  const [state, setState] = useState<LiveDashboardState>(INITIAL_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Auto-detect base URL: use provided URL, or current origin (works in both dev & production)
  const baseUrl = orchestratorUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (!baseUrl) return;

    try {
      const es = new EventSource(`${baseUrl}/api/live/stream`);
      eventSourceRef.current = es;

      es.onopen = () => {
        retryCountRef.current = 0; // Reset retry count on successful connection
        setState(prev => ({ ...prev, connected: true }));
        console.log('[SSE] Connected to live stream');
      };

      // Handle initial data
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init') {
            setState(prev => ({
              ...prev,
              stats: data.stats || prev.stats,
              txFeed: (data.recentEvents || []).slice(-MAX_FEED_SIZE),
            }));
          }
        } catch { /* ignore */ }
      };

      // Handle protocol events
      es.addEventListener('protocol-event', (event: any) => {
        try {
          const protocolEvent: ProtocolEvent = JSON.parse(event.data);
          setState(prev => {
            const newFeed = [...prev.txFeed, protocolEvent].slice(-MAX_FEED_SIZE);

            // Update agent activity
            const agentId = protocolEvent.data?.agentId;
            const newActivity = { ...prev.agentActivity };
            if (agentId) {
              newActivity[agentId] = {
                jobs: (newActivity[agentId]?.jobs || 0) + 1,
                lastActive: Date.now(),
                active: true,
              };
            }

            // Update stats based on event type
            const newStats = { ...prev.stats };
            if (protocolEvent.type.startsWith('tx:')) newStats.totalTxs++;
            if (protocolEvent.type === 'tx:escrow_created') newStats.totalEscrowCreated++;
            if (protocolEvent.type === 'tx:escrow_settled') newStats.totalEscrowSettled++;
            if (protocolEvent.type === 'agent:job_completed') newStats.totalAgentJobs++;
            if (protocolEvent.type === 'agent:a2a_chain_completed') newStats.totalA2AChains++;
            if (protocolEvent.type === 'revenue:fee_collected' && protocolEvent.data.feeAmount) {
              newStats.totalFeesCollected += protocolEvent.data.feeAmount;
            }

            return { ...prev, txFeed: newFeed, agentActivity: newActivity, stats: newStats };
          });
        } catch { /* ignore */ }
      });

      // Handle heartbeat
      es.addEventListener('heartbeat', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          setState(prev => ({ ...prev, connectionCount: data.connections || 0 }));
        } catch { /* ignore */ }
      });

      es.onerror = () => {
        setState(prev => ({ ...prev, connected: false }));
        es.close();
        // Exponential backoff: 5s, 10s, 20s, 30s max
        retryCountRef.current++;
        const delay = Math.min(5000 * Math.pow(2, retryCountRef.current - 1), 30000);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    } catch {
      setState(prev => ({ ...prev, connected: false }));
      retryCountRef.current++;
      const delay = Math.min(5000 * Math.pow(2, retryCountRef.current - 1), 30000);
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    }
  }, [baseUrl]);

  // Fetch TVL periodically
  useEffect(() => {
    if (!baseUrl) return;

    const fetchTVL = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/live/tvl`);
        if (res.ok) {
          const tvl = await res.json();
          setState(prev => ({ ...prev, tvl }));
        }
      } catch { /* ignore */ }
    };

    fetchTVL();
    const interval = setInterval(fetchTVL, 30_000); // Every 30s
    return () => clearInterval(interval);
  }, [baseUrl]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return state;
}
