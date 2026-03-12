'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

export type A2APhase =
    | 'idle'
    | 'decomposing'
    | 'reviewing'
    | 'executing'
    | 'cancelling'
    | 'completed'
    | 'failed';

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
    cancelled: number;
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
    originalBudget?: number;
    status: string;
    result: any;
    dependsOn: number[];
    executionTime?: number;
    retryCount?: number;
    originalAgentId?: string;
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
    stepLogs: Record<number, string[]>;
    // Plan editing
    removeStep: (stepIndex: number) => void;
    reorderStep: (fromIndex: number, toIndex: number) => void;
    updateStepBudget: (stepIndex: number, newBudget: number) => void;
    swapAgent: (stepIndex: number, newAgentId: string, agentName: string, agentEmoji: string) => void;
    updateStepPrompt: (stepIndex: number, newPrompt: string) => void;
    // Actions
    orchestrate: (prompt: string, budget: number, clientWallet: string) => Promise<void>;
    confirmExecution: () => Promise<void>;
    cancelExecution: () => Promise<void>;
    cancelPlan: () => void;
    refreshStatus: () => Promise<void>;
}

// ══════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════

const POLL_INTERVAL_MS = 10_000; // Backup polling (SSE is primary)

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
    const [stepLogs, setStepLogs] = useState<Record<number, string[]>>({});

    const abortRef = useRef<AbortController | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sseRef = useRef<EventSource | null>(null);
    const phaseRef = useRef<A2APhase>('idle');
    const walletRef = useRef<string | null>(null);
    const chainIdRef = useRef<string | null>(null);

    // Keep refs in sync
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { chainIdRef.current = a2aChainId; }, [a2aChainId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortRef.current) abortRef.current.abort();
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            if (sseRef.current) sseRef.current.close();
        };
    }, []);

    // ════════════════════════════════════
    // STOP POLLING & SSE
    // ════════════════════════════════════
    const stopPolling = useCallback(() => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    }, []);

    const stopSSE = useCallback(() => {
        if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
        }
    }, []);

    // ════════════════════════════════════
    // REFRESH STATUS (single fetch — backup)
    // ════════════════════════════════════
    const refreshStatus = useCallback(async () => {
        if (!chainIdRef.current) return;

        try {
            const headers: Record<string, string> = {};
            if (walletRef.current) headers['X-Wallet-Address'] = walletRef.current;

            const res = await fetch(`/api/a2a/chain/${chainIdRef.current}`, {
                headers,
                signal: abortRef.current?.signal,
            });
            if (!res.ok) throw new Error('Failed to fetch chain status');

            const json = await res.json();
            const data = json.success !== undefined ? json : json;

            setChainStatus(prev => ({
                a2aChainId: chainIdRef.current!,
                rootJob: data.rootJob || prev?.rootJob || {},
                subTasks: (data.subTasks || []).map((t: any) => ({
                    id: t.id || '',
                    stepIndex: t.stepIndex ?? 0,
                    agentId: t.agentId || '',
                    agentName: t.agent?.name || t.agentName || '',
                    agentEmoji: t.agent?.avatarEmoji || t.agentEmoji || '\uD83E\uDD16',
                    prompt: t.prompt || '',
                    budget: t.negotiatedPrice || t.budget || 0,
                    status: t.status || 'PENDING',
                    result: t.result,
                    dependsOn: t.dependsOn || [],
                    executionTime: t.executionTime,
                })),
                progress: data.progress || prev?.progress || {
                    total: 0, completed: 0, failed: 0, executing: 0, pending: 0, cancelled: 0, percentComplete: 0,
                },
                budget: data.budget || prev?.budget || { total: 0, spent: 0, remaining: 0 },
            }));

            // Check if all sub-tasks are terminal
            const progress = data.progress;
            if (progress && progress.completed + progress.failed >= progress.total && progress.total > 0) {
                stopPolling();
                stopSSE();
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
    }, [stopPolling, stopSSE]);

    // ════════════════════════════════════
    // SSE LISTENER (real-time progress)
    // ════════════════════════════════════
    const startSSE = useCallback((chainId: string) => {
        stopSSE();

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        if (!baseUrl) return;

        try {
            const es = new EventSource(`${baseUrl}/api/live/stream`);
            sseRef.current = es;

            es.addEventListener('protocol-event', (event: any) => {
                try {
                    const parsed = JSON.parse(event.data);
                    if (!parsed.data?.a2aChainId || parsed.data.a2aChainId !== chainId) return;

                    const evtType = parsed.type || parsed.data?.type;
                    const evtData = parsed.data;

                    switch (evtType) {
                        case 'a2a:step_started':
                            setChainStatus(prev => {
                                if (!prev) return prev;
                                const updated = { ...prev, subTasks: [...prev.subTasks] };
                                const idx = updated.subTasks.findIndex(t => t.stepIndex === evtData.stepIndex);
                                if (idx >= 0) {
                                    updated.subTasks[idx] = { ...updated.subTasks[idx], status: 'EXECUTING', id: evtData.jobId || updated.subTasks[idx].id };
                                } else {
                                    updated.subTasks.push({
                                        id: evtData.jobId || '', stepIndex: evtData.stepIndex ?? 0,
                                        agentId: '', agentName: evtData.agentName || '', agentEmoji: evtData.agentEmoji || '\uD83E\uDD16',
                                        prompt: '', budget: evtData.budget?.allocated || 0, status: 'EXECUTING',
                                        result: null, dependsOn: [],
                                    });
                                }
                                return recalcProgress(updated);
                            });
                            break;

                        case 'a2a:step_completed':
                            setChainStatus(prev => {
                                if (!prev) return prev;
                                const updated = { ...prev, subTasks: [...prev.subTasks] };
                                const idx = updated.subTasks.findIndex(t => t.stepIndex === evtData.stepIndex);
                                if (idx >= 0) {
                                    updated.subTasks[idx] = {
                                        ...updated.subTasks[idx],
                                        status: 'COMPLETED',
                                        executionTime: evtData.executionTime,
                                        budget: evtData.budget?.spent ?? updated.subTasks[idx].budget,
                                    };
                                }
                                return recalcProgress(updated);
                            });
                            break;

                        case 'a2a:step_failed':
                            setChainStatus(prev => {
                                if (!prev) return prev;
                                const updated = { ...prev, subTasks: [...prev.subTasks] };
                                const idx = updated.subTasks.findIndex(t => t.stepIndex === evtData.stepIndex);
                                if (idx >= 0) {
                                    updated.subTasks[idx] = { ...updated.subTasks[idx], status: 'FAILED' };
                                }
                                return recalcProgress(updated);
                            });
                            break;

                        case 'a2a:step_retry':
                        case 'a2a:step_fallback':
                            setStepLogs(prev => {
                                const stepIdx = evtData.stepIndex ?? 0;
                                const logs = [...(prev[stepIdx] || [])];
                                logs.push(evtData.message || `${evtType === 'a2a:step_retry' ? 'Retrying' : 'Fallback to'} ${evtData.agentName || 'agent'}...`);
                                return { ...prev, [stepIdx]: logs };
                            });
                            if (evtType === 'a2a:step_fallback') {
                                setChainStatus(prev => {
                                    if (!prev) return prev;
                                    const updated = { ...prev, subTasks: [...prev.subTasks] };
                                    const idx = updated.subTasks.findIndex(t => t.stepIndex === evtData.stepIndex);
                                    if (idx >= 0) {
                                        updated.subTasks[idx] = {
                                            ...updated.subTasks[idx],
                                            originalAgentId: updated.subTasks[idx].agentId,
                                            agentName: evtData.agentName || updated.subTasks[idx].agentName,
                                            agentEmoji: evtData.agentEmoji || updated.subTasks[idx].agentEmoji,
                                        };
                                    }
                                    return updated;
                                });
                            }
                            break;

                        case 'a2a:step_log':
                            setStepLogs(prev => {
                                const stepIdx = evtData.stepIndex ?? 0;
                                return { ...prev, [stepIdx]: [...(prev[stepIdx] || []), evtData.logLine || ''] };
                            });
                            break;

                        case 'a2a:budget_rebalanced':
                            if (evtData.reallocation) {
                                setChainStatus(prev => {
                                    if (!prev) return prev;
                                    const updated = { ...prev, subTasks: [...prev.subTasks] };
                                    for (const r of evtData.reallocation!) {
                                        const idx = updated.subTasks.findIndex(t => t.stepIndex === r.stepIndex);
                                        if (idx >= 0) {
                                            updated.subTasks[idx] = {
                                                ...updated.subTasks[idx],
                                                originalBudget: r.oldBudget,
                                                budget: r.newBudget,
                                            };
                                        }
                                    }
                                    return updated;
                                });
                            }
                            break;

                        case 'a2a:chain_completed':
                        case 'a2a:chain_cancelled':
                            stopPolling();
                            stopSSE();
                            setTimeout(() => refreshStatus(), 500);
                            if (evtData.status === 'CANCELLED') {
                                setPhase('completed');
                                setError(evtData.message || 'Orchestration cancelled.');
                            } else if (evtData.status === 'FAILED') {
                                setPhase('failed');
                                setError(evtData.message || 'Orchestration failed.');
                            } else {
                                setPhase('completed');
                                setError(null);
                            }
                            break;
                    }
                } catch { /* ignore */ }
            });

            es.onerror = () => {
                console.warn('[A2A_SSE] Connection lost, relying on backup polling');
            };
        } catch {
            console.warn('[A2A_SSE] Failed to connect, relying on backup polling');
        }
    }, [stopSSE, stopPolling, refreshStatus]);

    // ════════════════════════════════════
    // START POLLING (backup for SSE)
    // ════════════════════════════════════
    const startPolling = useCallback(() => {
        stopPolling();
        refreshStatus();
        pollTimerRef.current = setInterval(() => {
            if (phaseRef.current !== 'executing' && phaseRef.current !== 'cancelling') {
                stopPolling();
                return;
            }
            refreshStatus();
        }, POLL_INTERVAL_MS);
    }, [refreshStatus, stopPolling]);

    // ════════════════════════════════════
    // PLAN EDITING FUNCTIONS
    // ════════════════════════════════════

    const removeStep = useCallback((stepIndex: number) => {
        setPlan(prev => {
            if (!prev) return prev;
            const newSteps = prev.steps
                .filter(s => s.stepIndex !== stepIndex)
                .map((s, idx) => ({
                    ...s,
                    stepIndex: idx,
                    dependsOn: s.dependsOn
                        .filter(d => d !== stepIndex)
                        .map(d => d > stepIndex ? d - 1 : d),
                }));
            const removedBudget = prev.steps.find(s => s.stepIndex === stepIndex)?.budgetAllocation || 0;
            const perStep = newSteps.length > 0 ? removedBudget / newSteps.length : 0;
            const updatedSteps = newSteps.map(s => ({
                ...s,
                budgetAllocation: Math.round((s.budgetAllocation + perStep) * 100) / 100,
            }));
            return { ...prev, steps: updatedSteps };
        });
    }, []);

    const reorderStep = useCallback((fromIndex: number, toIndex: number) => {
        setPlan(prev => {
            if (!prev) return prev;
            const steps = [...prev.steps];
            const [moved] = steps.splice(fromIndex, 1);
            steps.splice(toIndex, 0, moved);
            const reindexed = steps.map((s, idx) => ({
                ...s,
                stepIndex: idx,
                dependsOn: idx === 0 ? [] : [idx - 1],
            }));
            return { ...prev, steps: reindexed };
        });
    }, []);

    const updateStepBudget = useCallback((stepIndex: number, newBudget: number) => {
        setPlan(prev => {
            if (!prev) return prev;
            const steps = prev.steps.map(s =>
                s.stepIndex === stepIndex ? { ...s, budgetAllocation: newBudget } : s
            );
            return { ...prev, steps };
        });
    }, []);

    const swapAgent = useCallback((stepIndex: number, newAgentId: string, agentName: string, agentEmoji: string) => {
        setPlan(prev => {
            if (!prev) return prev;
            const steps = prev.steps.map(s =>
                s.stepIndex === stepIndex ? { ...s, agentId: newAgentId, agentName, agentEmoji } : s
            );
            return { ...prev, steps };
        });
    }, []);

    const updateStepPrompt = useCallback((stepIndex: number, newPrompt: string) => {
        setPlan(prev => {
            if (!prev) return prev;
            const steps = prev.steps.map(s =>
                s.stepIndex === stepIndex ? { ...s, prompt: newPrompt } : s
            );
            return { ...prev, steps };
        });
    }, []);

    // ════════════════════════════════════
    // 1. ORCHESTRATE: Decompose task into plan
    // ════════════════════════════════════
    const orchestrate = useCallback(async (prompt: string, budget: number, clientWallet: string) => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setPhase('decomposing');
        setError(null);
        setPlan(null);
        setA2aChainId(null);
        setOrchestratorJobId(null);
        setChainStatus(null);
        setStepLogs({});
        setIsLoading(true);
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
    // 2. CONFIRM EXECUTION (async, non-blocking 202)
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
        setPhase('executing');
        setStepLogs({});

        // Initialize chainStatus with plan steps (optimistic)
        setChainStatus({
            a2aChainId,
            rootJob: { status: 'EXECUTING' },
            subTasks: plan.steps.map(s => ({
                id: '', stepIndex: s.stepIndex, agentId: s.agentId,
                agentName: s.agentName, agentEmoji: s.agentEmoji,
                prompt: s.prompt, budget: s.budgetAllocation,
                status: 'PENDING', result: null, dependsOn: s.dependsOn,
            })),
            progress: {
                total: plan.steps.length, completed: 0, failed: 0,
                executing: 0, pending: plan.steps.length, cancelled: 0, percentComplete: 0,
            },
            budget: { total: plan.totalBudget, spent: 0, remaining: plan.totalBudget },
        });

        try {
            // Persist any plan edits before execution
            await fetch('/api/a2a/orchestrate/update', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(walletRef.current ? { 'X-Wallet-Address': walletRef.current } : {}),
                },
                body: JSON.stringify({ orchestratorJobId, steps: plan.steps }),
            }).catch(() => {});

            const walletHeader: Record<string, string> = { 'Content-Type': 'application/json' };
            if (walletRef.current) walletHeader['X-Wallet-Address'] = walletRef.current;

            const res = await fetch('/api/a2a/orchestrate/execute', {
                method: 'POST',
                headers: walletHeader,
                body: JSON.stringify({ a2aChainId, orchestratorJobId }),
                signal: abortRef.current.signal,
            });

            const data = await res.json().catch(() => ({ success: false, error: 'No response body' }));

            if (!res.ok && res.status !== 202) {
                throw new Error(data.error || `Execution failed (${res.status})`);
            }

            // 202 Accepted — execution is running async
            startSSE(a2aChainId);
            startPolling();
        } catch (err: any) {
            if (err.name === 'AbortError') return;

            try {
                const headers: Record<string, string> = {};
                if (walletRef.current) headers['X-Wallet-Address'] = walletRef.current;
                const statusRes = await fetch(`/api/a2a/chain/${a2aChainId}`, { headers });
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (statusData.subTasks?.length > 0) {
                        startSSE(a2aChainId);
                        startPolling();
                        return;
                    }
                }
            } catch { /* ignore */ }

            setError(err.message || 'Failed to start execution.');
            setPhase('failed');
        } finally {
            setIsLoading(false);
        }
    }, [plan, orchestratorJobId, a2aChainId, startSSE, startPolling]);

    // ════════════════════════════════════
    // 3. CANCEL EXECUTION (graceful)
    // ════════════════════════════════════
    const cancelExecution = useCallback(async () => {
        if (!a2aChainId) return;
        setPhase('cancelling');

        try {
            const walletHeader: Record<string, string> = { 'Content-Type': 'application/json' };
            if (walletRef.current) walletHeader['X-Wallet-Address'] = walletRef.current;

            await fetch('/api/a2a/orchestrate/cancel', {
                method: 'POST',
                headers: walletHeader,
                body: JSON.stringify({ a2aChainId }),
            });
        } catch (err: any) {
            console.error('Cancel execution failed:', err);
            setError('Failed to cancel execution.');
        }
    }, [a2aChainId]);

    // ════════════════════════════════════
    // 4. CANCEL PLAN (discard)
    // ════════════════════════════════════
    const cancelPlan = useCallback(() => {
        if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
        stopPolling();
        stopSSE();
        setPhase('idle');
        setPlan(null);
        setA2aChainId(null);
        setOrchestratorJobId(null);
        setChainStatus(null);
        setError(null);
        setIsLoading(false);
        setStepLogs({});
    }, [stopPolling, stopSSE]);

    return {
        phase, plan, a2aChainId, orchestratorJobId, chainStatus, error, isLoading, stepLogs,
        removeStep, reorderStep, updateStepBudget, swapAgent, updateStepPrompt,
        orchestrate, confirmExecution, cancelExecution, cancelPlan, refreshStatus,
    };
}

// ── Helper: Recalculate progress from subTasks ──

function recalcProgress(status: A2AChainStatus): A2AChainStatus {
    const completed = status.subTasks.filter(t => t.status === 'COMPLETED').length;
    const failed = status.subTasks.filter(t => t.status === 'FAILED').length;
    const executing = status.subTasks.filter(t => t.status === 'EXECUTING').length;
    const cancelled = status.subTasks.filter(t => t.status === 'CANCELLED').length;
    const total = status.progress.total || status.subTasks.length;
    const pending = total - executing - completed - failed - cancelled;

    return {
        ...status,
        progress: {
            total,
            completed,
            failed,
            executing,
            pending,
            cancelled,
            percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
    };
}
