'use client';

import React, { useState, useMemo } from 'react';
import {
    CheckCircleIcon, XCircleIcon, ArrowPathIcon, ClockIcon,
    CpuChipIcon, SparklesIcon, BoltIcon,
} from '@/app/components/icons';
import type {
    A2APlan, A2AChainStatus, A2APhase, A2APlanStep, A2ASubTask,
} from '../../hooks/useA2AOrchestration';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

interface A2AChainViewerProps {
    plan: A2APlan | null;
    chainStatus: A2AChainStatus | null;
    phase: A2APhase;
    onConfirm?: () => void;
    onCancel?: () => void;
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
    if (s === 'MATCHED' || s === 'QUEUED') {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ClockIcon className="w-3 h-3" /> Queued
            </span>
        );
    }

    // Default: PENDING
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
    };
    const colors = colorMap[category?.toLowerCase()] || 'text-slate-400 bg-white/[0.04] border-white/[0.08]';

    return (
        <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${colors}`}>
            {category}
        </span>
    );
}

// ══════════════════════════════════════
// STEP CARD (Plan Review / Execution)
// ══════════════════════════════════════

function StepCard({
    step,
    subTask,
    isExecuting,
    showResult,
}: {
    step: A2APlanStep;
    subTask?: A2ASubTask;
    isExecuting: boolean;
    showResult: boolean;
}) {
    const [expanded, setExpanded] = useState(false);

    const status = subTask?.status || 'PENDING';
    const executionTime = subTask?.executionTime;
    const result = subTask?.result;

    // Truncate prompt for display
    const promptPreview = step.prompt.length > 120
        ? step.prompt.slice(0, 117) + '...'
        : step.prompt;

    return (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-all duration-300 hover:border-white/[0.10]">
            {/* Header: Agent info + Status */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{step.agentEmoji}</span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="text-white font-semibold text-sm truncate">{step.agentName}</h4>
                            <CategoryBadge category={step.category} />
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono">Step {step.stepIndex + 1}</span>
                    </div>
                </div>
                {isExecuting && <StatusBadge status={status} />}
            </div>

            {/* Prompt */}
            <p className="text-[12px] text-slate-400 leading-relaxed mb-2.5">{promptPreview}</p>

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

            {/* Footer: Budget + Execution time */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                <span className="text-[11px] font-mono text-slate-500">
                    {step.budgetAllocation.toFixed(2)} <span className="text-slate-600">AlphaUSD</span>
                </span>
                {executionTime != null && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500">
                        <ClockIcon className="w-3 h-3" /> {executionTime}s
                    </span>
                )}
            </div>

            {/* Result (after completion) */}
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
        </div>
    );
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════

function A2AChainViewer({ plan, chainStatus, phase, onConfirm, onCancel }: A2AChainViewerProps) {
    if (!plan && !chainStatus) return null;

    const steps = plan?.steps || [];
    const progress = chainStatus?.progress;
    const budget = chainStatus?.budget;
    const subTaskMap = useMemo(() => {
        if (!chainStatus?.subTasks) return new Map<number, A2ASubTask>();
        const map = new Map<number, A2ASubTask>();
        chainStatus.subTasks.forEach(st => map.set(st.stepIndex, st));
        return map;
    }, [chainStatus?.subTasks]);

    const isExecuting = phase === 'executing';
    const isReviewing = phase === 'reviewing';
    const isTerminal = phase === 'completed' || phase === 'failed';
    const percentComplete = progress?.percentComplete ?? 0;

    // Compute total execution time for completed chains
    const totalExecTime = useMemo(() => {
        if (!chainStatus?.subTasks) return 0;
        return chainStatus.subTasks.reduce((sum, st) => sum + (st.executionTime || 0), 0);
    }, [chainStatus?.subTasks]);

    return (
        <div className="mt-4 bg-[#141926] border border-white/[0.10] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                    <CpuChipIcon className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">A2A Orchestration</h3>
                    {chainStatus?.a2aChainId && (
                        <span className="text-[10px] text-slate-600 font-mono">
                            #{chainStatus.a2aChainId.slice(0, 8)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isExecuting && progress && (
                        <span className="text-[10px] text-indigo-400 font-mono font-bold">
                            {progress.completed}/{progress.total} tasks
                        </span>
                    )}
                    {isTerminal && (
                        <span className={`text-[10px] font-bold ${phase === 'completed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {phase === 'completed' ? 'Completed' : 'Failed'}
                        </span>
                    )}
                </div>
            </div>

            {/* ═══ Progress Bar (Executing / Terminal) ═══ */}
            {(isExecuting || isTerminal) && (
                <div className="h-1 bg-white/[0.04]">
                    <div
                        className={`h-full transition-all duration-700 ease-out ${
                            phase === 'failed' ? 'bg-rose-500' :
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
                        {/* AI Reasoning */}
                        {plan.reasoning && (
                            <div className="mb-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">AI Reasoning</span>
                                </div>
                                <p className="text-[12px] text-slate-400 leading-relaxed">{plan.reasoning}</p>
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
                                <span className="text-sm font-bold font-mono text-emerald-400">
                                    {steps.reduce((sum, s) => sum + s.budgetAllocation, 0).toFixed(2)} <span className="text-emerald-400/50 text-xs">AlphaUSD</span>
                                </span>
                            </div>
                        </div>

                        {/* Step Cards */}
                        <div className="space-y-3 mb-5">
                            {steps.map(step => (
                                <StepCard
                                    key={step.stepIndex}
                                    step={step}
                                    isExecuting={false}
                                    showResult={false}
                                />
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04]">
                            {onConfirm && (
                                <button
                                    onClick={onConfirm}
                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white text-sm font-bold rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    <BoltIcon className="w-4 h-4" />
                                    Confirm &amp; Execute
                                </button>
                            )}
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.10] text-slate-400 text-sm font-semibold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* ═══ Execution Progress ═══ */}
                {isExecuting && (
                    <div className="space-y-3">
                        {steps.map(step => (
                            <StepCard
                                key={step.stepIndex}
                                step={step}
                                subTask={subTaskMap.get(step.stepIndex)}
                                isExecuting={true}
                                showResult={false}
                            />
                        ))}
                    </div>
                )}

                {/* ═══ Completed / Failed Results ═══ */}
                {isTerminal && (
                    <>
                        {/* Summary banner */}
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
                                            ? `Orchestration completed — ${progress?.completed || 0} task${(progress?.completed || 0) !== 1 ? 's' : ''} finished`
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
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step results */}
                        <div className="space-y-3">
                            {steps.map(step => (
                                <StepCard
                                    key={step.stepIndex}
                                    step={step}
                                    subTask={subTaskMap.get(step.stepIndex)}
                                    isExecuting={true}
                                    showResult={true}
                                />
                            ))}
                        </div>

                        {/* Reset button */}
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
