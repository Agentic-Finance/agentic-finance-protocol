import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { AgentJobData, MarketplacePhase } from '../../hooks/useAgentMarketplace';

interface JobTrackerProps {
    phase: MarketplacePhase;
    job: AgentJobData | null;
    onExecute: () => void;
    onShowReview: () => void;
    onReset: () => void;
}

const STEPS = [
    { label: 'Matched', key: 'matched' },
    { label: 'Confirmed', key: 'confirmed' },
    { label: 'Executing', key: 'executing' },
    { label: 'Done', key: 'completed' },
];

function JobTracker({ phase, job, onExecute, onShowReview, onReset }: JobTrackerProps) {
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
                    {/* Progress line */}
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

                {/* Execution Status */}
                {phase === 'executing' && (
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <ArrowPathIcon className="w-4 h-4 text-indigo-400 animate-spin" />
                            <span className="text-indigo-400 font-semibold text-sm">Working on your task...</span>
                        </div>
                        <p className="text-[11px] text-slate-500">This may take up to 2 minutes</p>
                    </div>
                )}

                {/* Completed Result */}
                {phase === 'completed' && job.result && (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 animate-in fade-in duration-500">
                        <div className="flex items-center gap-2 mb-2.5">
                            <SparklesIcon className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold text-sm">Completed</span>
                            {job.executionTime && (
                                <span className="text-[10px] text-slate-500 ml-auto">{(job.executionTime / 1000).toFixed(1)}s</span>
                            )}
                        </div>
                        <div className="bg-black/30 rounded-lg p-3 font-mono text-[11px] text-slate-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap scrollbar-hide">
                            {job.result}
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={onShowReview}
                                className="px-4 py-2 bg-amber-500/8 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5"
                            >
                                ⭐ Rate
                            </button>
                            <button
                                onClick={onReset}
                                className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-400 text-[11px] font-semibold rounded-lg transition-all"
                            >
                                New Task
                            </button>
                        </div>
                    </div>
                )}

                {/* Failed */}
                {phase === 'failed' && (
                    <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-4 text-center">
                        <XCircleIcon className="w-6 h-6 text-rose-400 mx-auto mb-1.5" />
                        <span className="text-rose-400 font-semibold text-sm block">Execution failed</span>
                        <p className="text-[11px] text-slate-500 mt-1">{job.result || 'An error occurred.'}</p>
                        <button
                            onClick={onReset}
                            className="mt-3 px-5 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-400 text-[11px] font-semibold rounded-lg transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(JobTracker);
