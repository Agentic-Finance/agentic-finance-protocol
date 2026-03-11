'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
        avatarUrl?: string | null;
        isVerified: boolean;
        totalJobs: number;
        successRate: number;
        avgRating: number;
        ratingCount: number;
        responseTime: number;
        source?: string;       // native | community | eliza | crewai | langchain | olas
        sourceUrl?: string;    // GitHub repo or framework docs URL
        nativeAgentId?: string | null;
        webhookUrl?: string | null;
    };
}

export interface AIProofData {
    commitmentId: string;
    commitTxHash: string;
    verifyTxHash: string;
    proofMatched: boolean | null;
}

export interface ParsedJobResult {
    /** Human-readable summary */
    summary: string;
    /** Raw result for "View Details" toggle */
    raw: any;
    /** If result has an output field */
    output?: string;
    /** If result contains a txHash */
    txHash?: string;
    /** If the result actually contains an error despite API success */
    hasError: boolean;
    /** The raw error message */
    errorMessage?: string;
    /** Structured key-value pairs from complex objects */
    fields?: Array<{ key: string; value: string }>;
}

export interface AgentJobData {
    id: string;
    status: string;
    result?: string;
    parsedResult?: ParsedJobResult;
    aiProof?: AIProofData | null;
    executionTime?: number;
    agent: DiscoveredAgent['agent'];
}

export type MarketplacePhase =
    | 'idle'
    | 'browsing'
    | 'analyzing'
    | 'results'
    | 'task_input'
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

    /** true when discovery fell back to keyword matching (OpenAI unavailable) */
    isKeywordFallback: boolean;

    // Browse state
    allAgents: DiscoveredAgent[];
    filteredBrowseAgents: DiscoveredAgent[];
    activeCategory: string | null;
    isBrowseLoading: boolean;

    // Task prompt (from task_input phase)
    taskPrompt: string;

    // Actions
    discover: (prompt: string, budget?: number) => Promise<void>;
    selectAgent: (agent: DiscoveredAgent) => void;
    submitTaskAndNegotiate: (prompt: string) => void;
    backToBrowse: () => void;
    confirmDeal: (clientWallet: string, prompt: string, skipEscrowQueue?: boolean) => Promise<{ escrowQueued: boolean }>;
    executeDeal: () => Promise<void>;
    cancelExecution: () => void;
    rejectDeal: () => void;
    reset: () => void;
    startBrowsing: () => void;
    filterByCategory: (cat: string | null) => void;
    clearError: () => void;
}

// ══════════════════════════════════════
// RESULT PARSING UTILITIES
// ══════════════════════════════════════

function humanizeKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase()).trim();
}

function friendlyError(error: string): string {
    const l = error.toLowerCase();
    if (l.includes('fetch failed') || l.includes('econnrefused'))
        return 'Agent service is temporarily unavailable. Please try again later.';
    if (l.includes('timeout') || l.includes('aborted'))
        return 'Task took too long to complete. The agent may be under heavy load.';
    if (l.includes('authentication') || l.includes('unauthorized') || l.includes('apikey') || l.includes('authtoken'))
        return 'Authentication issue with the agent service. This is being looked into.';
    if (l.includes('rate limit'))
        return 'Agent is receiving too many requests. Please wait a moment and try again.';
    if (l.includes('not found'))
        return 'The requested agent or resource could not be found.';
    if (l.includes('batch settle'))
        return 'Batch settlement encountered an issue. Your escrow is safe.';
    const first = error.split(/[.!]/)[0];
    return first.length > 120 ? first.slice(0, 117) + '...' : first;
}

function parseAgentResult(rawResult: any): ParsedJobResult {
    if (!rawResult) return { summary: 'No output received.', raw: null, hasError: false };

    // Plain string — try to parse as JSON first
    if (typeof rawResult === 'string') {
        try { return parseAgentResult(JSON.parse(rawResult)); } catch { /* not JSON */ }
        return { summary: rawResult, raw: rawResult, hasError: false };
    }

    // Has an error field → mark as error
    if (rawResult.error) {
        return { summary: friendlyError(rawResult.error), raw: rawResult, hasError: true, errorMessage: rawResult.error };
    }

    // Has an output field → use as summary
    if (rawResult.output) {
        const fields: Array<{ key: string; value: string }> = [];
        if (rawResult.metadata) {
            Object.entries(rawResult.metadata).forEach(([k, v]) => fields.push({ key: humanizeKey(k), value: String(v) }));
        }
        return {
            summary: rawResult.output, raw: rawResult, hasError: false, output: rawResult.output,
            txHash: rawResult.txHash || rawResult.metadata?.txHash,
            fields: fields.length > 0 ? fields : undefined,
        };
    }

    // Has txHash at top level
    if (rawResult.txHash) {
        return { summary: rawResult.message || rawResult.status || 'Transaction completed.', raw: rawResult, hasError: false, txHash: rawResult.txHash };
    }

    // Complex object → extract flat key-value fields
    const fields: Array<{ key: string; value: string }> = [];
    Object.entries(rawResult).forEach(([k, v]) => {
        if (['raw', 'debug', 'logs', 'trace'].includes(k)) return;
        if (typeof v === 'object' && v !== null) return;
        fields.push({ key: humanizeKey(k), value: String(v) });
    });

    return { summary: rawResult.message || rawResult.status || 'Task completed.', raw: rawResult, hasError: false, fields: fields.length > 0 ? fields : undefined };
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

    const [taskPrompt, setTaskPrompt] = useState('');
    const [isKeywordFallback, setIsKeywordFallback] = useState(false);

    const negotiationTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const executionAbortRef = useRef<AbortController | null>(null);
    const confirmLockRef = useRef(false);
    const phaseRef = useRef<MarketplacePhase>('idle');

    // Keep phaseRef in sync so callbacks can read current phase
    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            negotiationTimersRef.current.forEach(t => clearTimeout(t));
            negotiationTimersRef.current = [];
            if (executionAbortRef.current) executionAbortRef.current.abort();
        };
    }, []);

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
                    avatarUrl: a.avatarUrl || null,
                    isVerified: a.isVerified,
                    totalJobs: a.totalJobs,
                    successRate: a.successRate,
                    avgRating: a.avgRating,
                    ratingCount: a.ratingCount,
                    responseTime: a.responseTime,
                    source: a.source || 'native',
                    sourceUrl: a.sourceUrl || null,
                    nativeAgentId: a.nativeAgentId || null,
                    webhookUrl: a.webhookUrl || null,
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
            setIsKeywordFallback(!!data.fallback);
            setPhase('results');

        } catch (err: any) {
            setError(err.message || 'Discovery failed. Showing all agents instead.');
            setPhase('browsing');
        }
    }, []);

    // ════════════════════════════════════
    // 2. SELECT AGENT → TASK INPUT or NEGOTIATE
    // ════════════════════════════════════

    /** Shared: run negotiation engine + animate rounds */
    const beginNegotiation = useCallback((agent: DiscoveredAgent) => {
        negotiationTimersRef.current.forEach(t => clearTimeout(t));
        negotiationTimersRef.current = [];

        setPhase('negotiating');

        const budget = suggestedBudget || agent.agent.basePrice * 1.2;
        const result = negotiate(budget, agent.agent);

        setNegotiationLogs([]);
        result.rounds.forEach((round, i) => {
            const timer = setTimeout(() => {
                setNegotiationLogs(prev => [...prev, round]);
                if (i === result.rounds.length - 1) {
                    setNegotiation(result);
                    setPhase('confirming');
                }
            }, (i + 1) * 600);
            negotiationTimersRef.current.push(timer);
        });
    }, [suggestedBudget]);

    /** Click "Hire" on an agent card */
    const selectAgent = useCallback((agent: DiscoveredAgent) => {
        setSelectedAgent(agent);

        // From AI results: user already typed a task → negotiate immediately
        // From browse catalog: no task yet → prompt for task first
        if (phaseRef.current === 'results') {
            beginNegotiation(agent);
        } else {
            setPhase('task_input');
        }
    }, [beginNegotiation]);

    /** Submit task description from task_input phase → start negotiation */
    const submitTaskAndNegotiate = useCallback((prompt: string) => {
        if (!selectedAgent) return;
        setTaskPrompt(prompt);
        beginNegotiation(selectedAgent);
    }, [selectedAgent, beginNegotiation]);

    /** Go back from task_input to browse catalog */
    const backToBrowse = useCallback(() => {
        setSelectedAgent(null);
        setNegotiation(null);
        setNegotiationLogs([]);
        setTaskPrompt('');
        setPhase('browsing');
    }, []);

    // ════════════════════════════════════
    // 3. CONFIRM DEAL → CREATE JOB
    // ════════════════════════════════════
    const confirmDeal = useCallback(async (clientWallet: string, prompt: string, skipEscrowQueue?: boolean): Promise<{ escrowQueued: boolean }> => {
        if (!selectedAgent || !negotiation) {
            throw new Error('Missing agent or negotiation data');
        }

        // Prevent double-confirmation (ref-based lock survives re-renders)
        if (confirmLockRef.current) return { escrowQueued: false };
        confirmLockRef.current = true;

        let escrowQueued = true;

        try {
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

            // Queue in boardroom for on-chain escrow — SKIP for card payments
            // (card path handles funds via FiatCheckout/Shield deposit; Boardroom is only for crypto signing)
            if (!skipEscrowQueue) {
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
                    if (!escrowRes.ok) {
                        console.error('Failed to queue escrow in boardroom');
                        escrowQueued = false;
                        // Update job status to reflect escrow failure
                        setActiveJob(prev => prev ? {
                            ...prev,
                            status: 'MATCHED_NO_ESCROW',
                        } : null);
                    }
                } catch (escrowErr) {
                    console.error('Escrow queue error:', escrowErr);
                    escrowQueued = false;
                    setActiveJob(prev => prev ? {
                        ...prev,
                        status: 'MATCHED_NO_ESCROW',
                    } : null);
                }
            }
        } catch (jobErr: any) {
            confirmLockRef.current = false; // Release lock on job creation failure so user can retry
            throw jobErr;
        } finally {
            // Lock remains held on success — only released on reset() to prevent re-confirmation
        }

        return { escrowQueued };
    }, [selectedAgent, negotiation, suggestedBudget]);

    // ════════════════════════════════════
    // 4. EXECUTE → Call agent + poll status
    // ════════════════════════════════════
    const executeDeal = useCallback(async () => {
        if (!activeJob) return;

        executionAbortRef.current = new AbortController();

        try {
            const res = await fetch('/api/marketplace/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: activeJob.id }),
                signal: executionAbortRef.current.signal,
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || `Agent execution failed (${res.status})`);
            }

            const data = await res.json();
            const parsed = parseAgentResult(data.result);

            // If API says success but result contains an error → treat as failed
            const effectiveSuccess = data.success && !parsed.hasError;

            setActiveJob(prev => prev ? {
                ...prev,
                status: effectiveSuccess ? (data.status || 'COMPLETED') : 'FAILED',
                result: typeof data.result === 'string' ? data.result : JSON.stringify(data.result),
                parsedResult: parsed,
                aiProof: data.aiProof || null,
                executionTime: data.executionTime,
            } : null);

            setPhase(effectiveSuccess ? 'completed' : 'failed');

        } catch (err: any) {
            if (err.name === 'AbortError') return; // cancelled by user, already handled
            const errorMsg = err.message || 'An unexpected error occurred.';
            setActiveJob(prev => prev ? {
                ...prev,
                status: 'FAILED',
                result: errorMsg,
                parsedResult: { summary: friendlyError(errorMsg), raw: errorMsg, hasError: true, errorMessage: errorMsg },
            } : null);
            setError(errorMsg);
            setPhase('failed');
        } finally {
            executionAbortRef.current = null;
        }
    }, [activeJob]);

    const cancelExecution = useCallback(() => {
        if (executionAbortRef.current) {
            executionAbortRef.current.abort();
            executionAbortRef.current = null;
        }
        setActiveJob(prev => prev ? {
            ...prev,
            status: 'CANCELLED',
            parsedResult: { summary: 'Task was cancelled.', raw: null, hasError: false },
        } : null);
        setPhase('failed');
    }, []);

    // ════════════════════════════════════
    // 5. REJECT / RESET
    // ════════════════════════════════════
    const rejectDeal = useCallback(() => {
        confirmLockRef.current = false; // Release lock when rejecting
        setSelectedAgent(null);
        setNegotiation(null);
        setNegotiationLogs([]);
        setPhase('results'); // back to results to pick another agent
    }, []);

    const reset = useCallback(() => {
        negotiationTimersRef.current.forEach(t => clearTimeout(t));
        negotiationTimersRef.current = [];
        confirmLockRef.current = false; // Release confirm lock for new tasks
        setPhase('idle');
        setMatchedAgents([]);
        setSelectedAgent(null);
        setNegotiation(null);
        setNegotiationLogs([]);
        setActiveJob(null);
        setSuggestedBudget(0);
        setError(null);
        setIsKeywordFallback(false);
        setActiveCategory(null);
        setTaskPrompt('');
        // Note: do NOT clear allAgents - they are cached
    }, []);

    /** Clear error only — used when user starts typing a new prompt */
    const clearError = useCallback(() => {
        setError(null);
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
        isKeywordFallback,
        allAgents,
        filteredBrowseAgents,
        activeCategory,
        isBrowseLoading,
        taskPrompt,
        discover,
        selectAgent,
        submitTaskAndNegotiate,
        backToBrowse,
        confirmDeal,
        executeDeal,
        cancelExecution,
        rejectDeal,
        reset,
        startBrowsing,
        filterByCategory,
        clearError,
    };
}
