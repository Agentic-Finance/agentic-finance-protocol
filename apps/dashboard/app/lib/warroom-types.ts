// ── War Room Shared Types ──────────────────────────────────

export interface AgentGeoNode {
    id: string;
    name: string;
    wallet: string;
    lat: number;
    lng: number;
    city: string;
    region: string;
    role: 'coordinator' | 'worker' | 'reviewer' | 'sentinel' | 'optimizer';
    status: 'active' | 'idle' | 'offline';
    lastActivity: number;
    totalVolume: number;
}

export interface PaymentArc {
    id: string;
    fromWallet: string;
    toWallet: string;
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    volume: number;
    color: string;
    type: 'a2a' | 'escrow' | 'intel' | 'milestone';
}

export interface ThreatItem {
    id: string;
    type: 'HIGH_VALUE' | 'FAILED_TX' | 'RAPID_CHAIN' | 'ANOMALY';
    severity: 'WARNING' | 'ERROR';
    title: string;
    detail: string;
    timestamp: number;
    agentName?: string;
    amount?: number;
}

export interface WarRoomStats {
    totalSwarms: number;
    activeSwarms: number;
    totalBudgetLocked: number;
    a2aVolume: number;
    a2aCount: number;
    intelCount: number;
    auditCount: number;
    totalReleased: number;
    activeAgents: number;
    avgTransfer: number;
}

export interface FlowEdge {
    from: string;
    to: string;
    volume: number;
}

export interface TopAgent {
    wallet: string;
    totalVolume: number;
    totalSent: number;
    totalReceived: number;
    connections: number;
}

export interface AuditEvent {
    id: string;
    agentName: string | null;
    eventType: string;
    title: string;
    severity: string;
    createdAt: string;
    txHash: string | null;
}

export interface WarRoomData {
    stats: WarRoomStats | null;
    agents: AgentGeoNode[];
    arcs: PaymentArc[];
    flowEdges: FlowEdge[];
    topAgents: TopAgent[];
    auditEvents: AuditEvent[];
    threats: ThreatItem[];
}

// ── Sentinel Node Dashboard Types ──────────────────────────

export type SentinelTab = 'overview' | 'trust' | 'staking' | 'risk';

export interface LeaderboardAgent {
    rank: number;
    wallet: string;
    name: string | null;
    emoji: string | null;
    compositeScore: number;       // 0-10000 raw
    displayScore: number;         // 0-100
    tier: number;                 // 0-4
    tierLabel: string;
    jobsCompleted: number;
    jobsFailed: number;
    proofMatchRate: number;       // 0-100
    totalVolume: number;
}

export interface SentinelAction {
    actionType: 'flag' | 'pause_vote' | 'slash_vote';
    targetWallet: string;
    reason: string;
    senderWallet: string;
}

export interface NodeStatus {
    uptime: number;               // percentage, e.g. 99.8
    activeAgents: number;
    totalAgents: number;
    a2aVolume: number;
    proofStats: {
        totalCommitments: number;
        totalVerified: number;
        totalMatched: number;
        totalSlashed: number;
    };
    vaultStats: {
        totalDeposited: number;
        insurancePool: number;
        totalAgents: number;
    };
}
