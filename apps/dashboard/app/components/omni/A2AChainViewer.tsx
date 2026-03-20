'use client';

import React, { useState, useMemo } from 'react';
import {
    CheckCircleIcon, XCircleIcon, ArrowPathIcon, ClockIcon,
    CpuChipIcon, SparklesIcon, BoltIcon,
} from '@/app/components/icons';
import type {
    A2APlan, A2AChainStatus, A2APhase, A2APlanStep, A2ASubTask,
} from '../../hooks/useA2AOrchestration';
import A2ADAGView from './A2ADAGView';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

interface A2AChainViewerProps {
    plan: A2APlan | null;
    chainStatus: A2AChainStatus | null;
    phase: A2APhase;
    stepLogs?: Record<number, string[]>;
    onConfirm?: () => void;
    onCancel?: () => void;
    onCancelExecution?: () => void;
    // Plan editing callbacks
    onRemoveStep?: (stepIndex: number) => void;
    onUpdateBudget?: (stepIndex: number, newBudget: number) => void;
    onUpdatePrompt?: (stepIndex: number, newPrompt: string) => void;
}

// ══════════════════════════════════════
// STATUS BADGE
// ══════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
    const s = status?.toUpperCase() || 'PENDING';

    if (s === 'COMPLETED' || s === 'DONE') {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircleIcon className="w-3 h-3" /> Done
            </span>
        );
    }
    if (s === 'FAILED' || s === 'ERROR') {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <XCircleIcon className="w-3 h-3" /> Failed
            </span>
        );
    }
    if (s === 'EXECUTING' || s === 'RUNNING') {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                <ArrowPathIcon className="w-3 h-3 animate-spin" /> Running...
            </span>
        );
    }
    if (s === 'CANCELLED') {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 border border-slate-500/20 line-through">
                <XCircleIcon className="w-3 h-3" /> Cancelled
            </span>
        );
    }
    if (s === 'CANCELLING') {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <ArrowPathIcon className="w-3 h-3 animate-spin" /> Cancelling...
            </span>
        );
    }
    if (s === 'MATCHED' || s === 'QUEUED') {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ClockIcon className="w-3 h-3" /> Queued
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-500 border border-white/[0.08]">
            <ClockIcon className="w-3 h-3" /> Waiting
        </span>
    );
}

// ══════════════════════════════════════
// CATEGORY BADGE
// ══════════════════════════════════════

function CategoryBadge({ category }: { category: string }) {
    const colorMap: Record<string, string> = {
        security: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        defi: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        analytics: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        compliance: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        payroll: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        governance: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        tax: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        nft: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
        deployment: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
        verification: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        payments: 'text-green-400 bg-green-500/10 border-green-500/20',
        streams: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
        privacy: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        escrow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    };
    const colors = colorMap[category?.toLowerCase()] || 'text-slate-400 bg-white/[0.04] border-white/[0.08]';

    return (
        <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${colors}`}>
            {category}
        </span>
    );
}

// ══════════════════════════════════════
// STEP LOG PANEL
// ══════════════════════════════════════

function StepLogPanel({ logs }: { logs: string[] }) {
    if (logs.length === 0) return null;
    return (
        <div className="mt-2 bg-black/40 rounded-lg p-2.5 max-h-24 overflow-y-auto scrollbar-hide">
            {logs.map((line, i) => (
                <div key={i} className="text-[10px] font-mono text-amber-400/70 leading-relaxed animate-in fade-in duration-200">
                    <span className="text-slate-600 mr-1">&gt;</span> {line}
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════
// STEP CARD
// ══════════════════════════════════════

function StepCard({
    step,
    subTask,
    isExecuting,
    showResult,
    isEditing,
    stepLogs,
    onRemove,
    onUpdateBudget,
    onUpdatePrompt,
}: {
    step: A2APlanStep;
    subTask?: A2ASubTask;
    isExecuting: boolean;
    showResult: boolean;
    isEditing?: boolean;
    stepLogs?: string[];
    onRemove?: () => void;
    onUpdateBudget?: (budget: number) => void;
    onUpdatePrompt?: (prompt: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(false);
    const [editingBudget, setEditingBudget] = useState(false);
    const [tempPrompt, setTempPrompt] = useState(step.prompt);
    const [tempBudget, setTempBudget] = useState(step.budgetAllocation.toString());

    const status = subTask?.status || 'PENDING';
    const executionTime = subTask?.executionTime;
    const result = subTask?.result;
    const hasRetry = subTask?.retryCount && subTask.retryCount > 0;
    const budgetChanged = subTask?.originalBudget && subTask.originalBudget !== subTask.budget;

    const promptPreview = step.prompt.length > 120
        ? step.prompt.slice(0, 117) + '...'
        : step.prompt;

    return (
        <div className={`bg-white/[0.03] border rounded-xl p-4 transition-all duration-300 ${
            status === 'CANCELLED' ? 'border-white/[0.04] opacity-50' :
            status === 'EXECUTING' ? 'border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' :
            'border-white/[0.06] hover:border-white/[0.10]'
        }`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{subTask?.agentEmoji || step.agentEmoji}</span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="text-white font-semibold text-sm truncate">
                                {subTask?.agentName || step.agentName}
                            </h4>
                            <CategoryBadge category={step.category} />
                            {hasRetry && (
                                <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/15">
                                    Retry {subTask!.retryCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono">Step {step.stepIndex + 1}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {isExecuting && <StatusBadge status={status} />}
                    {isEditing && onRemove && (
                        <button
                            onClick={onRemove}
                            className="p-1 text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            title="Remove step"
                        >
                            <XCircleIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Prompt (editable in review mode) */}
            {isEditing && editingPrompt ? (
                <div className="mb-2.5">
                    <textarea
                        value={tempPrompt}
                        onChange={e => setTempPrompt(e.target.value)}
                        className="w-full bg-black/30 border border-indigo-500/20 rounded-lg p-2 text-[12px] text-slate-300 font-mono resize-none focus:outline-none focus:border-indigo-500/40"
                        rows={3}
                    />
                    <div className="flex gap-1.5 mt-1">
                        <button
                            onClick={() => { onUpdatePrompt?.(tempPrompt); setEditingPrompt(false); }}
                            className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-0.5 bg-emerald-500/10 rounded"
                        >
                            Save
                        </button>
                        <button
                            onClick={() => { setTempPrompt(step.prompt); setEditingPrompt(false); }}
                            className="text-[9px] font-bold text-slate-500 hover:text-slate-400 px-2 py-0.5"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <p
                    className={`text-[12px] text-slate-400 leading-relaxed mb-2.5 ${isEditing ? 'cursor-pointer hover:text-slate-300' : ''}`}
                    onClick={() => isEditing && setEditingPrompt(true)}
                >
                    {promptPreview}
                    {isEditing && <span className="text-indigo-400/50 text-[9px] ml-1">(click to edit)</span>}
                </p>
            )}

            {/* Dependencies */}
            {step.dependsOn.length > 0 && (
                <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Depends on:</span>
                    {step.dependsOn.map(dep => (
                        <span key={dep} className="text-[9px] text-indigo-400/70 bg-indigo-500/8 px-1.5 py-0.5 rounded border border-indigo-500/15 font-mono">
                            Step {dep + 1}
                        </span>
                    ))}
                </div>
            )}

            {/* Step Logs (real-time) */}
            {stepLogs && stepLogs.length > 0 && status === 'EXECUTING' && (
                <StepLogPanel logs={stepLogs} />
            )}

            {/* Footer: Budget + Execution time + Proof */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                {isEditing && editingBudget ? (
                    <div className="flex items-center gap-1.5">
                        <input
                            type="number"
                            value={tempBudget}
                            onChange={e => setTempBudget(e.target.value)}
                            className="w-20 bg-black/30 border border-indigo-500/20 rounded px-2 py-0.5 text-[11px] font-mono text-white focus:outline-none focus:border-indigo-500/40"
                            step="0.01"
                            min="0"
                        />
                        <button
                            onClick={() => { onUpdateBudget?.(parseFloat(tempBudget) || 0); setEditingBudget(false); }}
                            className="text-[9px] font-bold text-emerald-400 px-1.5"
                        >
                            OK
                        </button>
                    </div>
                ) : (
                    <span
                        className={`text-[11px] font-mono text-slate-500 ${isEditing ? 'cursor-pointer hover:text-indigo-400' : ''}`}
                        onClick={() => isEditing && setEditingBudget(true)}
                    >
                        {budgetChanged && (
                            <span className="text-slate-600 line-through mr-1">{subTask!.originalBudget!.toFixed(2)}</span>
                        )}
                        {(subTask?.budget ?? step.budgetAllocation).toFixed(2)} <span className="text-slate-600">AlphaUSD</span>
                        {budgetChanged && <span className="text-emerald-400 text-[9px] ml-1">(rebalanced)</span>}
                    </span>
                )}
                <div className="flex items-center gap-2">
                    {executionTime != null && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500">
                            <ClockIcon className="w-3 h-3" /> {executionTime}s
                        </span>
                    )}
                    {subTask?.result && typeof subTask.result === 'string' && (
                        (() => {
                            try {
                                const parsed = JSON.parse(subTask.result);
                                if (parsed?.proofMatched === true || parsed?.commitTxHash) {
                                    return (
                                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15" title="Verified on-chain">
                                            \uD83D\uDD12 Verified
                                        </span>
                                    );
                                }
                            } catch {}
                            return null;
                        })()
                    )}
                </div>
            </div>

            {/* Result */}
            {showResult && result && (
                <div className="mt-2.5">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        {expanded ? 'Hide Result' : 'View Result'}
                    </button>
                    {expanded && (
                        <div className="mt-1.5 bg-black/30 rounded-lg p-3 font-mono text-[10px] text-slate-500 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap scrollbar-hide animate-in fade-in duration-300">
                            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                        </div>
                    )}
                </div>
            )}

            {/* Retry/fallback logs after terminal */}
            {showResult && stepLogs && stepLogs.length > 0 && (
                <StepLogPanel logs={stepLogs} />
            )}
        </div>
    );
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════

function A2AChainViewer({
    plan, chainStatus, phase, stepLogs,
    onConfirm, onCancel, onCancelExecution,
    onRemoveStep, onUpdateBudget, onUpdatePrompt,
}: A2AChainViewerProps) {
    const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

    // All hooks MUST be called before any conditional returns (Rules of Hooks)
    const subTaskMap = useMemo(() => {
        if (!chainStatus?.subTasks) return new Map<number, A2ASubTask>();
        const map = new Map<number, A2ASubTask>();
        chainStatus.subTasks.forEach(st => map.set(st.stepIndex, st));
        return map;
    }, [chainStatus?.subTasks]);

    const totalExecTime = useMemo(() => {
        if (!chainStatus?.subTasks) return 0;
        return chainStatus.subTasks.reduce((sum, st) => sum + (st.executionTime || 0), 0);
    }, [chainStatus?.subTasks]);

    const verifiedCount = useMemo(() => {
        if (!chainStatus?.subTasks) return 0;
        return chainStatus.subTasks.filter(st => {
            try {
                if (st.result && typeof st.result === 'string') {
                    const parsed = JSON.parse(st.result);
                    return parsed?.proofMatched === true || parsed?.commitTxHash;
                }
            } catch {}
            return false;
        }).length;
    }, [chainStatus?.subTasks]);

    // Show loading skeleton during task decomposition
    if (phase === 'decomposing') {
        return (
            <div className="mt-4 bg-[var(--pp-bg-elevated)] border border-violet-500/20 rounded-2xl overflow-hidden animate-in fade-in duration-500">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
                    <CpuChipIcon className="w-5 h-5 text-violet-400 animate-pulse" />
                    <div>
                        <h3 className="text-sm font-semibold text-white">Decomposing Task...</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">AI is splitting your task into sub-tasks and matching agents</p>
                    </div>
                </div>
                <div className="p-5 space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 animate-pulse">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-white/[0.06] rounded-lg" />
                                <div className="flex-1">
                                    <div className="h-3 bg-white/[0.06] rounded w-1/3 mb-1.5" />
                                    <div className="h-2 bg-white/[0.04] rounded w-1/5" />
                                </div>
                                <div className="h-5 bg-white/[0.04] rounded-md w-14" />
                            </div>
                            <div className="h-2 bg-white/[0.04] rounded w-4/5" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!plan && !chainStatus) return null;

    const steps = plan?.steps || [];
    const progress = chainStatus?.progress;
    const budget = chainStatus?.budget;

    const isExecuting = phase === 'executing';
    const isCancelling = phase === 'cancelling';
    const isReviewing = phase === 'reviewing';
    const isTerminal = phase === 'completed' || phase === 'failed';
    const percentComplete = progress?.percentComplete ?? 0;

    return (
        <div className={`mt-4 bg-[var(--pp-bg-elevated)] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 transition-all ${
            isReviewing
                ? 'border-2 border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.15)]'
                : 'border border-white/[0.10]'
        }`}>

            {/* ═══ Header ═══ */}
            <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
                isReviewing ? 'border-violet-500/20 bg-violet-500/5' : 'border-white/[0.04]'
            }`}>
                <div className="flex items-center gap-2.5">
                    <CpuChipIcon className={`w-5 h-5 ${isReviewing ? 'text-violet-400 animate-pulse' : 'text-indigo-400'}`} />
                    <h3 className="text-sm font-semibold text-white">A2A Orchestration</h3>
                    {isReviewing && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/25 animate-pulse">
                            Review Plan
                        </span>
                    )}
                    {isCancelling && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25 animate-pulse">
                            Cancelling...
                        </span>
                    )}
                    {chainStatus?.a2aChainId && (
                        <span className="text-[10px] text-slate-600 font-mono">
                            #{chainStatus.a2aChainId.slice(0, 8)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {(isExecuting || isCancelling) && progress && (
                        <span className="text-[10px] text-indigo-400 font-mono font-bold">
                            {progress.completed}/{progress.total} tasks
                        </span>
                    )}
                    {isTerminal && (
                        <span className={`text-[10px] font-bold ${phase === 'completed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {phase === 'completed' ? 'Completed' : 'Failed'}
                        </span>
                    )}
                    {verifiedCount > 0 && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15">
                            \uD83D\uDD12 {verifiedCount} verified
                        </span>
                    )}
                    {/* View mode toggle: List | Graph */}
                    {steps.length >= 2 && !isReviewing && (
                        <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] overflow-hidden">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                                    viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-600 hover:text-slate-400'
                                }`}
                            >
                                List
                            </button>
                            <button
                                onClick={() => setViewMode('graph')}
                                className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                                    viewMode === 'graph' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-600 hover:text-slate-400'
                                }`}
                            >
                                Graph
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Progress Bar ═══ */}
            {(isExecuting || isCancelling || isTerminal) && (
                <div className="h-1 bg-white/[0.04]">
                    <div
                        className={`h-full transition-all duration-700 ease-out ${
                            phase === 'failed' ? 'bg-rose-500' :
                            isCancelling ? 'bg-amber-500' :
                            phase === 'completed' ? 'bg-emerald-500' :
                            'bg-gradient-to-r from-indigo-500 to-violet-500'
                        }`}
                        style={{ width: `${percentComplete}%` }}
                    />
                </div>
            )}

            <div className="p-5">

                {/* ═══ Plan Review Mode ═══ */}
                {isReviewing && plan && (
                    <>
                        {plan.reasoning && (
                            <div className="mb-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">AI Reasoning</span>
                                </div>
                                <p className="text-[12px] text-slate-400 leading-relaxed">{typeof plan.reasoning === 'string' ? plan.reasoning : JSON.stringify(plan.reasoning)}</p>
                            </div>
                        )}

                        {/* Budget Summary */}
                        <div className="flex items-center justify-between mb-4 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                            <div className="flex items-center gap-4">
                                <div>
                                    <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold block">Total Budget</span>
                                    <span className="text-sm font-bold font-mono text-white">{plan.totalBudget.toFixed(2)} <span className="text-slate-500 text-xs">AlphaUSD</span></span>
                                </div>
                                <div className="w-px h-8 bg-white/[0.06]" />
                                <div>
                                    <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold block">Platform Fee</span>
                                    <span className="text-sm font-bold font-mono text-indigo-400">{plan.platformFee.toFixed(2)} <span className="text-indigo-400/50 text-xs">AlphaUSD</span></span>
                                </div>
                                <div className="w-px h-8 bg-white/[0.06]" />
                                <div>
                                    <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold block">Steps</span>
                                    <span className="text-sm font-bold font-mono text-white">{steps.length}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold block text-right">Allocated</span>
                                <span className={`text-sm font-bold font-mono ${
                                    steps.reduce((sum, s) => sum + s.budgetAllocation, 0) > (plan.totalBudget - plan.platformFee)
                                        ? 'text-rose-400' : 'text-emerald-400'
                                }`}>
                                    {steps.reduce((sum, s) => sum + s.budgetAllocation, 0).toFixed(2)} <span className="text-emerald-400/50 text-xs">AlphaUSD</span>
                                </span>
                            </div>
                        </div>

                        {/* Step Cards (editable) */}
                        <div className="space-y-3 mb-5">
                            {steps.map(step => (
                                <StepCard
                                    key={step.stepIndex}
                                    step={step}
                                    isExecuting={false}
                                    showResult={false}
                                    isEditing={true}
                                    onRemove={steps.length > 1 ? () => onRemoveStep?.(step.stepIndex) : undefined}
                                    onUpdateBudget={b => onUpdateBudget?.(step.stepIndex, b)}
                                    onUpdatePrompt={p => onUpdatePrompt?.(step.stepIndex, p)}
                                />
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-4 border-t border-violet-500/15">
                            {onConfirm && (
                                <button
                                    onClick={onConfirm}
                                    className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-black rounded-xl transition-all duration-200 flex items-center gap-2.5 shadow-[0_0_25px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.5)] hover:scale-[1.02]"
                                >
                                    <BoltIcon className="w-4.5 h-4.5" />
                                    Confirm &amp; Execute All Steps
                                </button>
                            )}
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="px-5 py-3.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.10] text-slate-400 text-sm font-semibold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* ═══ Execution Progress ═══ */}
                {(isExecuting || isCancelling) && (
                    <>
                        {viewMode === 'graph' ? (
                            <A2ADAGView
                                steps={chainStatus?.subTasks || steps.map(s => ({ ...s, status: 'PENDING', id: '', budget: s.budgetAllocation, result: null }))}
                                isExecuting={true}
                            />
                        ) : (
                            <div className="space-y-3">
                                {steps.map(step => (
                                    <StepCard
                                        key={step.stepIndex}
                                        step={step}
                                        subTask={subTaskMap.get(step.stepIndex)}
                                        isExecuting={true}
                                        showResult={false}
                                        stepLogs={stepLogs?.[step.stepIndex]}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Cancel Execution Button */}
                        {isExecuting && onCancelExecution && (
                            <div className="mt-4 pt-3 border-t border-white/[0.04]">
                                <button
                                    onClick={onCancelExecution}
                                    className="px-5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[11px] font-bold rounded-lg transition-all"
                                >
                                    Cancel Execution
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* ═══ Completed / Failed Results ═══ */}
                {isTerminal && (
                    <>
                        <div className={`mb-4 p-4 rounded-xl border ${
                            phase === 'completed'
                                ? 'bg-emerald-500/5 border-emerald-500/15'
                                : 'bg-rose-500/5 border-rose-500/15'
                        }`}>
                            <div className="flex items-center gap-3">
                                {phase === 'completed' ? (
                                    <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                                ) : (
                                    <XCircleIcon className="w-5 h-5 text-rose-400 shrink-0" />
                                )}
                                <div className="flex-1">
                                    <span className={`font-semibold text-sm ${
                                        phase === 'completed' ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                        {phase === 'completed'
                                            ? `Orchestration completed \u2014 ${progress?.completed || 0} task${(progress?.completed || 0) !== 1 ? 's' : ''} finished`
                                            : `Orchestration finished with ${progress?.failed || 0} failure${(progress?.failed || 0) !== 1 ? 's' : ''}`
                                        }
                                    </span>
                                    <div className="flex items-center gap-3 mt-1">
                                        {totalExecTime > 0 && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <ClockIcon className="w-3 h-3" /> {totalExecTime}s total
                                            </span>
                                        )}
                                        {budget && (
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                {budget.spent.toFixed(2)} / {budget.total.toFixed(2)} AlphaUSD spent
                                            </span>
                                        )}
                                        {verifiedCount > 0 && (
                                            <span className="text-[10px] text-emerald-400 font-bold">
                                                \uD83D\uDD12 {verifiedCount}/{steps.length} on-chain verified
                                            </span>
                                        )}
                                        {progress?.cancelled && progress.cancelled > 0 && (
                                            <span className="text-[10px] text-slate-500">
                                                {progress.cancelled} cancelled
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {viewMode === 'graph' ? (
                            <A2ADAGView
                                steps={chainStatus?.subTasks || steps.map(s => ({ ...s, status: 'PENDING', id: '', budget: s.budgetAllocation, result: null }))}
                                isExecuting={false}
                            />
                        ) : (
                            <div className="space-y-3">
                                {steps.map(step => (
                                    <StepCard
                                        key={step.stepIndex}
                                        step={step}
                                        subTask={subTaskMap.get(step.stepIndex)}
                                        isExecuting={true}
                                        showResult={true}
                                        stepLogs={stepLogs?.[step.stepIndex]}
                                    />
                                ))}
                            </div>
                        )}

                        {onCancel && (
                            <div className="mt-4 pt-3 border-t border-white/[0.04]">
                                <button
                                    onClick={onCancel}
                                    className="px-5 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.10] text-slate-400 text-[11px] font-semibold rounded-lg transition-all"
                                >
                                    New Task
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default React.memo(A2AChainViewer);
