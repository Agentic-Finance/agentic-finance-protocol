'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

export type A2APhase = 'idle' | 'decomposing' | 'reviewing' | 'executing' | 'completed' | 'failed';

export interface A2APlanStep {
    stepIndex: number;
    agentId: string;
    agentName: string;
    agentEmoji: string;
    prompt: string;
    budgetAllocation: number;
    dependsOn: number[];
    category: string;
}

export interface A2APlan {
    steps: A2APlanStep[];
    reasoning: string;
    totalBudget: number;
    platformFee: number;
}

export interface A2AChainProgress {
    total: number;
    completed: number;
    failed: number;
    executing: number;
    pending: number;
    percentComplete: number;
}

export interface A2ASubTask {
    id: string;
    stepIndex: number;
    agentId: string;
    agentName: string;
    agentEmoji: string;
    prompt: string;
    budget: number;
    status: string;
    result: any;
    dependsOn: number[];
    executionTime?: number;
}

export interface A2AChainStatus {
    a2aChainId: string;
    rootJob: any;
    subTasks: A2ASubTask[];
    progress: A2AChainProgress;
    budget: { total: number; spent: number; remaining: number };
}

export interface UseA2AOrchestrationReturn {
    phase: A2APhase;
    plan: A2APlan | null;
    a2aChainId: string | null;
    orchestratorJobId: string | null;
    chainStatus: A2AChainStatus | null;
    error: string | null;
    isLoading: boolean;
    orchestrate: (prompt: string, budget: number, clientWallet: string) => Promise<void>;
    confirmExecution: () => Promise<void>;
    cancelPlan: () => void;
    refreshStatus: () => Promise<void>;
}

// ══════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════

const POLL_INTERVAL_MS = 3000;

// ══════════════════════════════════════
// HOOK
// ══════════════════════════════════════

export function useA2AOrchestration(): UseA2AOrchestrationReturn {
    const [phase, setPhase] = useState<A2APhase>('idle');
    const [plan, setPlan] = useState<A2APlan | null>(null);
    const [a2aChainId, setA2aChainId] = useState<string | null>(null);
    const [orchestratorJobId, setOrchestratorJobId] = useState<string | null>(null);
    const [chainStatus, setChainStatus] = useState<A2AChainStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const abortRef = useRef<AbortController | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const phaseRef = useRef<A2APhase>('idle');
    const walletRef = useRef<string | null>(null);

    // Keep phaseRef in sync so polling callbacks can read current phase
    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortRef.current) abortRef.current.abort();
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, []);

    // ════════════════════════════════════
    // STOP POLLING
    // ════════════════════════════════════
    const stopPolling = useCallback(() => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    }, []);

    // ════════════════════════════════════
    // REFRESH STATUS (single fetch)
    // ════════════════════════════════════
    const refreshStatus = useCallback(async () => {
        if (!a2aChainId) return;

        try {
            const headers: Record<string, string> = {};
            if (walletRef.current) headers['X-Wallet-Address'] = walletRef.current;

            const res = await fetch(`/api/a2a/chain/${a2aChainId}`, {
                headers,
                signal: abortRef.current?.signal,
            });
            if (!res.ok) throw new Error('Failed to fetch chain status');

            const data: A2AChainStatus = await res.json();
            setChainStatus(data);

            // Check if all sub-tasks are terminal
            const { progress } = data;
            if (progress.completed + progress.failed >= progress.total && progress.total > 0) {
                stopPolling();
                if (progress.failed > 0 && progress.completed === 0) {
                    setPhase('failed');
                    setError(`All ${progress.failed} sub-task${progress.failed > 1 ? 's' : ''} failed.`);
                } else if (progress.failed > 0) {
                    setPhase('completed');
                    setError(`${progress.completed}/${progress.total} tasks completed, ${progress.failed} failed.`);
                } else {
                    setPhase('completed');
                    setError(null);
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error('Chain status poll error:', err);
        }
    }, [a2aChainId, stopPolling]);

    // ════════════════════════════════════
    // START POLLING
    // ════════════════════════════════════
    const startPolling = useCallback(() => {
        stopPolling();

        // Immediate first fetch
        refreshStatus();

        pollTimerRef.current = setInterval(() => {
            // Stop polling if phase is no longer executing
            if (phaseRef.current !== 'executing') {
                stopPolling();
                return;
            }
            refreshStatus();
        }, POLL_INTERVAL_MS);
    }, [refreshStatus, stopPolling]);

    // ════════════════════════════════════
    // 1. ORCHESTRATE: Decompose task into plan
    // ════════════════════════════════════
    const orchestrate = useCallback(async (prompt: string, budget: number, clientWallet: string) => {
        // Abort any previous in-flight request
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setPhase('decomposing');
        setError(null);
        setPlan(null);
        setA2aChainId(null);
        setOrchestratorJobId(null);
        setChainStatus(null);
        setIsLoading(true);
        // Store wallet for subsequent API calls (execute, chain status)
        walletRef.current = clientWallet;

        try {
            const res = await fetch('/api/a2a/orchestrate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Wallet-Address': clientWallet,
                },
                body: JSON.stringify({ prompt, budget, clientWallet }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Orchestration failed (${res.status})`);
            }

            const data = await res.json();

            if (!data.plan || !data.plan.steps || data.plan.steps.length === 0) {
                throw new Error('No valid plan generated. Try rephrasing your task.');
            }

            setPlan(data.plan);
            setA2aChainId(data.a2aChainId || null);
            setOrchestratorJobId(data.orchestratorJobId || null);
            setPhase('reviewing');
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.message || 'Failed to decompose task.');
            setPhase('failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ════════════════════════════════════
    // 2. CONFIRM EXECUTION: Start the chain
    // ════════════════════════════════════
    const confirmExecution = useCallback(async () => {
        if (!plan || !orchestratorJobId || !a2aChainId) {
            setError('No plan to execute. Orchestrate a task first.');
            return;
        }

        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            const walletHeader: Record<string, string> = { 'Content-Type': 'application/json' };
            if (walletRef.current) walletHeader['X-Wallet-Address'] = walletRef.current;

            const res = await fetch('/api/a2a/orchestrate/execute', {
                method: 'POST',
                headers: walletHeader,
                body: JSON.stringify({ a2aChainId, orchestratorJobId }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Execution failed (${res.status})`);
            }

            setPhase('executing');

            // Start polling for progress
            setTimeout(() => startPolling(), 100);
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.message || 'Failed to start execution.');
            setPhase('failed');
        } finally {
            setIsLoading(false);
        }
    }, [plan, orchestratorJobId, a2aChainId, startPolling]);

    // ════════════════════════════════════
    // 3. CANCEL PLAN
    // ════════════════════════════════════
    const cancelPlan = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        stopPolling();
        setPhase('idle');
        setPlan(null);
        setA2aChainId(null);
        setOrchestratorJobId(null);
        setChainStatus(null);
        setError(null);
        setIsLoading(false);
    }, [stopPolling]);

    return {
        phase,
        plan,
        a2aChainId,
        orchestratorJobId,
        chainStatus,
        error,
        isLoading,
        orchestrate,
        confirmExecution,
        cancelPlan,
        refreshStatus,
    };
}
