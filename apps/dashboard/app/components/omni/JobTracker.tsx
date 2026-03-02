import React, { useEffect, useState } from 'react';
import {
    CheckCircleIcon, XCircleIcon, ArrowPathIcon, SparklesIcon,
    ClipboardDocumentIcon, ArrowTopRightOnSquareIcon, ShieldCheckIcon,
    ClockIcon, XMarkIcon, MagnifyingGlassIcon, StarIcon,
} from '@heroicons/react/24/outline';
import type { AgentJobData, MarketplacePhase, AIProofData } from '../../hooks/useAgentMarketplace';

const EXPLORER = 'https://explore.tempo.xyz';

interface JobTrackerProps {
    phase: MarketplacePhase;
    job: AgentJobData | null;
    onExecute: () => void;
    onShowReview: () => void;
    onReset: () => void;
    onCancel: () => void;
    onRetry: () => void;
}

const STEPS = [
    { label: 'Matched', key: 'matched' },
    { label: 'Confirmed', key: 'confirmed' },
    { label: 'Executing', key: 'executing' },
    { label: 'Done', key: 'completed' },
];

function JobTracker({ phase, job, onExecute, onShowReview, onReset, onCancel, onRetry }: JobTrackerProps) {
    // Auto-execute when phase enters 'executing'
    useEffect(() => {
        if (phase === 'executing' && job && job.status === 'MATCHED') {
            const timer = setTimeout(onExecute, 1500);
            return () => clearTimeout(timer);
        }
    }, [phase, job, onExecute]);

    if (!job) return null;

    const currentStepIdx = phase === 'executing' ? 2 : (phase === 'completed' || phase === 'failed') ? 3 : 1;
    const finalLabel = phase === 'failed' ? 'Failed' : 'Done';

    return (
        <div className="mt-4 bg-[#06080C] border border-white/[0.06] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Agent Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04]">
                <span className="text-2xl">{job.agent.avatarEmoji}</span>
                <div>
                    <h4 className="text-white font-semibold text-sm">{job.agent.name}</h4>
                    <span className="text-[10px] text-slate-600 font-mono">#{job.id.slice(0, 8)}</span>
                </div>
            </div>

            <div className="p-5">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-5 relative px-2">
                    <div className="absolute top-4 left-10 right-10 h-px bg-white/[0.06]">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000 ease-out"
                            style={{ width: `${(currentStepIdx / (STEPS.length - 1)) * 100}%` }}
                        />
                    </div>

                    {STEPS.map((step, i) => {
                        const label = i === 3 ? finalLabel : step.label;
                        const isDone = i < currentStepIdx;
                        const isCurrent = i === currentStepIdx;
                        const isFailed = phase === 'failed' && i === 3;

                        return (
                            <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${
                                    isDone ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' :
                                    isCurrent && isFailed ? 'bg-rose-500/15 border-rose-500/40 text-rose-400' :
                                    isCurrent ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400' :
                                    'bg-white/[0.03] border-white/[0.06] text-slate-600'
                                }`}>
                                    {isDone ? (
                                        <CheckCircleIcon className="w-4 h-4" />
                                    ) : isCurrent && phase === 'executing' ? (
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    ) : isCurrent && phase === 'failed' ? (
                                        <XCircleIcon className="w-4 h-4" />
                                    ) : isCurrent && phase === 'completed' ? (
                                        <CheckCircleIcon className="w-4 h-4" />
                                    ) : (
                                        <span className="text-[10px] font-semibold">{i + 1}</span>
                                    )}
                                </div>
                                <span className={`text-[9px] font-medium whitespace-nowrap ${
                                    isDone || isCurrent ? (isFailed ? 'text-rose-400' : 'text-slate-300') : 'text-slate-600'
                                }`}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* ═══ Executing ═══ */}
                {phase === 'executing' && (
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowPathIcon className="w-4 h-4 text-indigo-400 animate-spin" />
                                <span className="text-indigo-400 font-semibold text-sm">
                                    {job.agent.name} is working...
                                </span>
                            </div>
                            <button
                                onClick={onCancel}
                                className="px-3 py-1.5 bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/20 text-slate-500 hover:text-rose-400 text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1"
                            >
                                <XMarkIcon className="w-3 h-3" /> Cancel
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 ml-6">This may take up to 2 minutes</p>
                    </div>
                )}

                {/* ═══ Completed ═══ */}
                {phase === 'completed' && (
                    <CompletedReceipt job={job} onShowReview={onShowReview} onReset={onReset} />
                )}

                {/* ═══ Failed ═══ */}
                {phase === 'failed' && (
                    <FailedReceipt job={job} onRetry={onRetry} onReset={onReset} />
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Completed Receipt
// ═══════════════════════════════════════

function CompletedReceipt({ job, onShowReview, onReset }: {
    job: AgentJobData;
    onShowReview: () => void;
    onReset: () => void;
}) {
    const [showRaw, setShowRaw] = useState(false);
    const parsed = job.parsedResult;
    const summary = parsed?.summary || job.result || 'Task completed.';

    return (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-0.5 bg-emerald-500" />
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{job.agent.avatarEmoji}</span>
                    <div className="flex-1">
                        <span className="text-emerald-400 font-semibold text-sm">{job.agent.name} completed your task</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            {job.executionTime != null && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20">
                                    <ClockIcon className="w-3 h-3" /> {job.executionTime}s
                                </span>
                            )}
                        </div>
                    </div>
                    <SparklesIcon className="w-5 h-5 text-emerald-400" />
                </div>

                {/* Result Summary */}
                <div className="bg-black/30 rounded-lg p-3 mb-3">
                    <p className="text-slate-300 text-[12px] leading-relaxed whitespace-pre-wrap">{summary}</p>

                    {parsed?.fields && parsed.fields.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] space-y-1.5">
                            {parsed.fields.map((f, i) => (
                                <div key={i} className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">{f.key}</span>
                                    <span className="text-slate-300 font-mono">{f.value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {parsed?.txHash && (
                        <a
                            href={`${EXPLORER}/tx/${parsed.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400/70 hover:text-emerald-400 font-mono transition-colors"
                        >
                            Tx: {parsed.txHash.slice(0, 10)}...{parsed.txHash.slice(-8)}
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                    )}
                </div>

                {/* AI Proof On-Chain */}
                {job.aiProof && <AIProofSection proof={job.aiProof} />}

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onShowReview}
                        className="px-4 py-2 bg-amber-500/8 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5"
                    >
                        <StarIcon className="w-3.5 h-3.5" /> Rate Agent
                    </button>
                    <button
                        onClick={onReset}
                        className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-400 text-[11px] font-semibold rounded-lg transition-all"
                    >
                        New Task
                    </button>
                    <button
                        onClick={() => setShowRaw(!showRaw)}
                        className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-400 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1"
                    >
                        <ClipboardDocumentIcon className="w-3.5 h-3.5" /> {showRaw ? 'Hide' : 'Details'}
                    </button>
                </div>

                {showRaw && parsed?.raw && (
                    <div className="mt-3 bg-black/40 rounded-lg p-3 font-mono text-[10px] text-slate-500 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap scrollbar-hide animate-in fade-in duration-300">
                        {typeof parsed.raw === 'string' ? parsed.raw : JSON.stringify(parsed.raw, null, 2)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Failed Receipt
// ═══════════════════════════════════════

function FailedReceipt({ job, onRetry, onReset }: {
    job: AgentJobData;
    onRetry: () => void;
    onReset: () => void;
}) {
    const parsed = job.parsedResult;
    const summary = parsed?.summary || job.result || 'An unexpected error occurred.';
    const isCancelled = job.status === 'CANCELLED';

    return (
        <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-0.5 bg-rose-500" />
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{job.agent.avatarEmoji}</span>
                    <div className="flex-1">
                        <span className="text-rose-400 font-semibold text-sm">
                            {isCancelled ? 'Task cancelled' : `${job.agent.name} could not complete your task`}
                        </span>
                    </div>
                    <XCircleIcon className="w-5 h-5 text-rose-400" />
                </div>

                {/* Error message */}
                <div className="bg-black/30 rounded-lg p-3 mb-3">
                    <p className="text-slate-300 text-[12px] leading-relaxed">{summary}</p>
                    {parsed?.errorMessage && parsed.errorMessage !== summary && (
                        <p className="text-[10px] text-slate-600 font-mono mt-2 break-all">
                            {parsed.errorMessage.length > 200 ? parsed.errorMessage.slice(0, 200) + '...' : parsed.errorMessage}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {!isCancelled && (
                        <button
                            onClick={onRetry}
                            className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5"
                        >
                            <ArrowPathIcon className="w-3.5 h-3.5" /> Try Again
                        </button>
                    )}
                    <button
                        onClick={onReset}
                        className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-400 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5"
                    >
                        <MagnifyingGlassIcon className="w-3.5 h-3.5" /> New Search
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// AI Proof On-Chain
// ═══════════════════════════════════════

function AIProofSection({ proof }: { proof: AIProofData }) {
    if (!proof.commitTxHash && !proof.verifyTxHash) return null;

    return (
        <div className="bg-violet-500/5 border border-violet-500/15 rounded-lg p-3 mb-3 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-2">
                <ShieldCheckIcon className="w-4 h-4 text-violet-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">AI Proof On-Chain</span>
                {proof.proofMatched !== null && (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        proof.proofMatched ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                        {proof.proofMatched ? 'Verified' : 'Divergent'}
                    </span>
                )}
            </div>
            <div className="space-y-1.5">
                {proof.commitTxHash && (
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Commit</span>
                        <a href={`${EXPLORER}/tx/${proof.commitTxHash}`} target="_blank" rel="noopener noreferrer"
                            className="text-violet-400/70 hover:text-violet-400 font-mono flex items-center gap-1 transition-colors">
                            {proof.commitTxHash.slice(0, 10)}...{proof.commitTxHash.slice(-6)}
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                    </div>
                )}
                {proof.verifyTxHash && (
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Verify</span>
                        <a href={`${EXPLORER}/tx/${proof.verifyTxHash}`} target="_blank" rel="noopener noreferrer"
                            className="text-violet-400/70 hover:text-violet-400 font-mono flex items-center gap-1 transition-colors">
                            {proof.verifyTxHash.slice(0, 10)}...{proof.verifyTxHash.slice(-6)}
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(JobTracker);
