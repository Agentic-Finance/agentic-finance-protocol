'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
    WarRoomStats, AgentGeoNode, PaymentArc, FlowEdge, TopAgent, AuditEvent, ThreatItem,
} from '../lib/warroom-types';
import { getAgentGeo, getAgentRole } from '../lib/agent-geo-map';

interface UseWarRoomDataOptions {
    pollInterval?: number;  // ms — default 30000
    enabled?: boolean;      // default true — set false to defer fetching
}

interface UseWarRoomDataReturn {
    stats: WarRoomStats | null;
    agents: AgentGeoNode[];
    arcs: PaymentArc[];
    auditEvents: AuditEvent[];
    threats: ThreatItem[];
    flowEdges: FlowEdge[];
    topAgents: TopAgent[];
    isLoading: boolean;
}

const ARC_COLORS: Record<string, string> = {
    a2a: '#06b6d4', escrow: '#f59e0b', intel: '#8b5cf6', milestone: '#22c55e',
};

export function useWarRoomData(options?: UseWarRoomDataOptions): UseWarRoomDataReturn {
    const { pollInterval = 30000, enabled = true } = options || {};

    const [stats, setStats] = useState<WarRoomStats | null>(null);
    const [agents, setAgents] = useState<AgentGeoNode[]>([]);
    const [arcs, setArcs] = useState<PaymentArc[]>([]);
    const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);
    const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
    const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
    const [threats, setThreats] = useState<ThreatItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, economyRes, auditRes] = await Promise.all([
                fetch('/api/swarm/stats'),
                fetch('/api/a2a/economy'),
                fetch('/api/audit/timeline?limit=50'),
            ]);
            const [statsData, economyData, auditData] = await Promise.all([
                statsRes.json(), economyRes.json(), auditRes.json(),
            ]);

            // Stats
            if (statsData.success) {
                setStats({
                    ...statsData.stats,
                    activeAgents: economyData.activeAgents || 0,
                    avgTransfer: economyData.avgTransfer || 0,
                });
            }

            // Economy → agents + arcs
            if (economyData.topAgents) {
                setTopAgents(economyData.topAgents);
                setFlowEdges(economyData.flowEdges || []);

                const now = Date.now();
                const agentNodes: AgentGeoNode[] = economyData.topAgents.map((ta: TopAgent, i: number) => {
                    const geo = getAgentGeo(ta.wallet);
                    const role = getAgentRole(i);
                    const agentEvents = (auditData.events || []).filter(
                        (e: AuditEvent) => e.agentName && ta.wallet.toLowerCase().includes(e.agentName.toLowerCase().slice(0, 4))
                    );
                    const lastEventTime = agentEvents.length > 0
                        ? new Date(agentEvents[0].createdAt).getTime()
                        : now - 999999;
                    const timeDiff = now - lastEventTime;

                    return {
                        id: `agent-${i}`,
                        name: ta.wallet.slice(0, 6) + '...' + ta.wallet.slice(-4),
                        wallet: ta.wallet,
                        lat: geo.lat,
                        lng: geo.lng,
                        city: geo.city,
                        region: geo.region,
                        role,
                        status: timeDiff < 5 * 60 * 1000 ? 'active' : timeDiff < 30 * 60 * 1000 ? 'idle' : 'offline',
                        lastActivity: lastEventTime,
                        totalVolume: ta.totalVolume,
                    } satisfies AgentGeoNode;
                });
                setAgents(agentNodes);

                const newArcs: PaymentArc[] = (economyData.flowEdges || []).slice(0, 30).map((edge: FlowEdge, i: number) => {
                    const fromGeo = getAgentGeo(edge.from);
                    const toGeo = getAgentGeo(edge.to);
                    const type = i % 4 === 0 ? 'escrow' : i % 3 === 0 ? 'intel' : i % 2 === 0 ? 'milestone' : 'a2a';
                    return {
                        id: `arc-${i}`,
                        fromWallet: edge.from,
                        toWallet: edge.to,
                        fromLat: fromGeo.lat,
                        fromLng: fromGeo.lng,
                        toLat: toGeo.lat,
                        toLng: toGeo.lng,
                        volume: edge.volume,
                        color: ARC_COLORS[type],
                        type,
                    } satisfies PaymentArc;
                });
                setArcs(newArcs);
            }

            // Audit events + threats
            if (auditData.events) {
                setAuditEvents(auditData.events);

                const avgTransfer = economyData.avgTransfer || 100;
                const newThreats: ThreatItem[] = [];

                for (const edge of (economyData.flowEdges || []).slice(0, 50)) {
                    if (edge.volume > avgTransfer * 3) {
                        newThreats.push({
                            id: `threat-hv-${edge.from.slice(-4)}-${edge.to.slice(-4)}`,
                            type: 'HIGH_VALUE',
                            severity: 'WARNING',
                            title: `High-value transfer: $${Math.round(edge.volume)}`,
                            detail: `${edge.from.slice(0, 8)}... → ${edge.to.slice(0, 8)}...`,
                            timestamp: Date.now(),
                            amount: edge.volume,
                        });
                    }
                }

                for (const event of auditData.events) {
                    if (event.severity === 'ERROR') {
                        newThreats.push({
                            id: `threat-err-${event.id}`,
                            type: 'FAILED_TX',
                            severity: 'ERROR',
                            title: event.title,
                            detail: event.agentName || 'Unknown agent',
                            timestamp: new Date(event.createdAt).getTime(),
                            agentName: event.agentName || undefined,
                        });
                    }
                }

                setThreats(newThreats.slice(0, 10));
            }

            setIsLoading(false);
        } catch (err) {
            console.error('WarRoom fetch error:', err);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        fetchData();
        intervalRef.current = setInterval(fetchData, pollInterval);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData, pollInterval, enabled]);

    return { stats, agents, arcs, auditEvents, threats, flowEdges, topAgents, isLoading };
}
