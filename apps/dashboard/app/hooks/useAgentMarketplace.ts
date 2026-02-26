'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { negotiate, NegotiationResult, NegotiationRound } from '../lib/negotiation-engine';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

export interface DiscoveredAgent {
    agentId: string;
    relevanceScore: number;
    reasoning: string;
    agent: {
        id: string;
        name: string;
        description: string;
        category: string;
        skills: string[];
        basePrice: number;
        ownerWallet: string;
        avatarEmoji: string;
        isVerified: boolean;
        totalJobs: number;
        successRate: number;
        avgRating: number;
        ratingCount: number;
        responseTime: number;
        source?: string;       // native | community | eliza | crewai | langchain | olas
        sourceUrl?: string;    // GitHub repo or framework docs URL
    };
}

export interface AgentJobData {
    id: string;
    status: string;
    result?: string;
    executionTime?: number;
    agent: DiscoveredAgent['agent'];
}

export type MarketplacePhase =
    | 'idle'
    | 'browsing'
    | 'analyzing'
    | 'results'
    | 'negotiating'
    | 'confirming'
    | 'executing'
    | 'completed'
    | 'failed';

export interface UseAgentMarketplaceReturn {
    // State
    phase: MarketplacePhase;
    matchedAgents: DiscoveredAgent[];
    selectedAgent: DiscoveredAgent | null;
    negotiation: NegotiationResult | null;
    negotiationLogs: NegotiationRound[];
    activeJob: AgentJobData | null;
    suggestedBudget: number;
    error: string | null;

    // Browse state
    allAgents: DiscoveredAgent[];
    filteredBrowseAgents: DiscoveredAgent[];
    activeCategory: string | null;
    isBrowseLoading: boolean;

    // Actions
    discover: (prompt: string, budget?: number) => Promise<void>;
    selectAgent: (agent: DiscoveredAgent) => void;
    confirmDeal: (clientWallet: string, prompt: string) => Promise<void>;
    executeDeal: () => Promise<void>;
    rejectDeal: () => void;
    reset: () => void;
    startBrowsing: () => void;
    filterByCategory: (cat: string | null) => void;
}

// ══════════════════════════════════════
// HOOK
// ══════════════════════════════════════

export function useAgentMarketplace(): UseAgentMarketplaceReturn {
    const [phase, setPhase] = useState<MarketplacePhase>('idle');
    const [matchedAgents, setMatchedAgents] = useState<DiscoveredAgent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<DiscoveredAgent | null>(null);
    const [negotiation, setNegotiation] = useState<NegotiationResult | null>(null);
    const [negotiationLogs, setNegotiationLogs] = useState<NegotiationRound[]>([]);
    const [activeJob, setActiveJob] = useState<AgentJobData | null>(null);
    const [suggestedBudget, setSuggestedBudget] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Browse state
    const [allAgents, setAllAgents] = useState<DiscoveredAgent[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [isBrowseLoading, setIsBrowseLoading] = useState(false);

    const jobPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const negotiationTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // ════════════════════════════════════
    // BROWSE: Fetch all agents from catalog
    // ════════════════════════════════════
    const fetchAllAgents = useCallback(async () => {
        setIsBrowseLoading(true);
        try {
            const res = await fetch('/api/marketplace/agents');
            if (!res.ok) throw new Error('Failed to fetch agents');
            const data = await res.json();
            const mapped: DiscoveredAgent[] = (data.agents || []).map((a: any) => ({
                agentId: a.id,
                relevanceScore: 0,
                reasoning: '',
                agent: {
                    id: a.id,
                    name: a.name,
                    description: a.description,
                    category: a.category,
                    skills: typeof a.skills === 'string' ? (() => { try { return JSON.parse(a.skills); } catch { return []; } })() : (a.skills || []),
                    basePrice: a.basePrice,
                    ownerWallet: a.ownerWallet,
                    avatarEmoji: a.avatarEmoji,
                    isVerified: a.isVerified,
                    totalJobs: a.totalJobs,
                    successRate: a.successRate,
                    avgRating: a.avgRating,
                    ratingCount: a.ratingCount,
                    responseTime: a.responseTime,
                    source: a.source || 'native',
                    sourceUrl: a.sourceUrl || null,
                },
            }));
            setAllAgents(mapped);
        } catch (err) {
            console.error('Failed to fetch agents:', err);
        } finally {
            setIsBrowseLoading(false);
        }
    }, []);

    const startBrowsing = useCallback(() => {
        setPhase('browsing');
        setError(null);
        if (allAgents.length === 0) {
            fetchAllAgents();
        }
    }, [fetchAllAgents, allAgents.length]);

    const filterByCategory = useCallback((category: string | null) => {
        setActiveCategory(category);
    }, []);

    const filteredBrowseAgents = useMemo(() => {
        if (!activeCategory) return allAgents;
        return allAgents.filter(a => a.agent.category === activeCategory);
    }, [allAgents, activeCategory]);

    // ════════════════════════════════════
    // 1. DISCOVER: AI-powered agent matching
    // ════════════════════════════════════
    const discover = useCallback(async (prompt: string, budget?: number) => {
        setPhase('analyzing');
        setError(null);
        setMatchedAgents([]);
        setSelectedAgent(null);
        setNegotiation(null);
        setNegotiationLogs([]);
        setActiveJob(null);

        try {
            const res = await fetch('/api/marketplace/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, budget }),
            });

            if (!res.ok) throw new Error('Discovery failed');

            const data = await res.json();

            if (!data.matches || data.matches.length === 0) {
                setError('No suitable agents found. Try a different description or browse the catalog below.');
                setPhase('browsing');
                return;
            }

            setMatchedAgents(data.matches);
            setSuggestedBudget(data.suggestedBudget || 100);
            setPhase('results');

        } catch (err: any) {
            setError(err.message || 'Discovery failed. Showing all agents instead.');
            setPhase('browsing');
        }
    }, []);

    // ════════════════════════════════════
    // 2. SELECT AGENT → AUTO-NEGOTIATE
    // ════════════════════════════════════
    const selectAgent = useCallback((agent: DiscoveredAgent) => {
        // Clear any previous negotiation timers
        negotiationTimersRef.current.forEach(t => clearTimeout(t));
        negotiationTimersRef.current = [];

        setSelectedAgent(agent);
        setPhase('negotiating');

        // Run negotiation engine
        const budget = suggestedBudget || agent.agent.basePrice * 1.2;
        const result = negotiate(budget, agent.agent);

        // Animate negotiation logs one by one
        setNegotiationLogs([]);
        result.rounds.forEach((round, i) => {
            const timer = setTimeout(() => {
                setNegotiationLogs(prev => [...prev, round]);
                // After all rounds, move to confirming
                if (i === result.rounds.length - 1) {
                    setNegotiation(result);
                    setPhase('confirming');
                }
            }, (i + 1) * 600);
            negotiationTimersRef.current.push(timer);
        });
    }, [suggestedBudget]);

    // ════════════════════════════════════
    // 3. CONFIRM DEAL → CREATE JOB
    // ════════════════════════════════════
    const confirmDeal = useCallback(async (clientWallet: string, prompt: string) => {
        if (!selectedAgent || !negotiation) {
            throw new Error('Missing agent or negotiation data');
        }

        setError(null);

        const res = await fetch('/api/marketplace/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId: selectedAgent.agent.id,
                clientWallet,
                prompt: prompt || selectedAgent.agent.description || 'Agent task via marketplace',
                taskDescription: selectedAgent.agent.description,
                budget: suggestedBudget || negotiation.finalPrice || selectedAgent.agent.basePrice,
                negotiatedPrice: negotiation.finalPrice,
                platformFee: negotiation.platformFee,
            }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to create job');
        }

        const data = await res.json();
        setActiveJob({
            id: data.job.id,
            status: 'MATCHED',
            agent: selectedAgent.agent,
        });
        setPhase('executing');

        // Also queue in boardroom for on-chain escrow
        try {
            const escrowRes = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: selectedAgent.agent.name,
                    wallet: selectedAgent.agent.ownerWallet,
                    amount: String(negotiation.finalPrice),
                    token: 'AlphaUSD',
                    note: `A2A Task Escrow (Fee: ${negotiation.platformFee.toFixed(2)}) | Job: ${data.job.id}`,
                    isDiscovery: true,
                }),
            });
            if (!escrowRes.ok) console.error('Failed to queue escrow in boardroom');
        } catch (escrowErr) {
            console.error('Escrow queue error:', escrowErr);
        }
    }, [selectedAgent, negotiation, suggestedBudget]);

    // ════════════════════════════════════
    // 4. EXECUTE → Call agent + poll status
    // ════════════════════════════════════
    const executeDeal = useCallback(async () => {
        if (!activeJob) return;

        try {
            const res = await fetch('/api/marketplace/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: activeJob.id }),
            });
            if (!res.ok) throw new Error('Agent execution failed');

            const data = await res.json();

            setActiveJob(prev => prev ? {
                ...prev,
                status: data.status || 'COMPLETED',
                result: typeof data.result === 'string' ? data.result : JSON.stringify(data.result),
                executionTime: data.executionTime,
            } : null);

            setPhase(data.success ? 'completed' : 'failed');

        } catch (err: any) {
            setError(err.message);
            setPhase('failed');
        }
    }, [activeJob]);

    // ════════════════════════════════════
    // 5. REJECT / RESET
    // ════════════════════════════════════
    const rejectDeal = useCallback(() => {
        setSelectedAgent(null);
        setNegotiation(null);
        setNegotiationLogs([]);
        setPhase('results'); // back to results to pick another agent
    }, []);

    const reset = useCallback(() => {
        if (jobPollingRef.current) clearInterval(jobPollingRef.current);
        negotiationTimersRef.current.forEach(t => clearTimeout(t));
        negotiationTimersRef.current = [];
        setPhase('idle');
        setMatchedAgents([]);
        setSelectedAgent(null);
        setNegotiation(null);
        setNegotiationLogs([]);
        setActiveJob(null);
        setSuggestedBudget(0);
        setError(null);
        setActiveCategory(null);
        // Note: do NOT clear allAgents - they are cached
    }, []);

    return {
        phase,
        matchedAgents,
        selectedAgent,
        negotiation,
        negotiationLogs,
        activeJob,
        suggestedBudget,
        error,
        allAgents,
        filteredBrowseAgents,
        activeCategory,
        isBrowseLoading,
        discover,
        selectAgent,
        confirmDeal,
        executeDeal,
        rejectDeal,
        reset,
        startBrowsing,
        filterByCategory,
    };
}
