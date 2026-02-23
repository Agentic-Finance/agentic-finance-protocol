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
    { label: 'Agent Matched', key: 'matched' },
    { label: 'Deal Confirmed', key: 'confirmed' },
    { label: 'Executing', key: 'executing' },
    { label: 'Completed', key: 'completed' },
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
    const finalLabel = phase === 'failed' ? 'Failed' : 'Completed';

    return (
        <div className="mt-6 bg-[#06080C] border border-indigo-500/20 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Agent Info */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/5">
                <span className="text-3xl">{job.agent.avatarEmoji}</span>
                <div>
                    <h4 className="text-white font-bold text-sm">{job.agent.name}</h4>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Job #{job.id.slice(0, 8)}</span>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-6 relative px-4">
                {/* Progress line */}
                <div className="absolute top-5 left-12 right-12 h-0.5 bg-white/5">
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
                        <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                isDone ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                                isCurrent && isFailed ? 'bg-rose-500/20 border-rose-500 text-rose-400' :
                                isCurrent ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 animate-pulse' :
                                'bg-white/5 border-white/10 text-slate-600'
                            }`}>
                                {isDone ? (
                                    <CheckCircleIcon className="w-5 h-5" />
                                ) : isCurrent && phase === 'executing' ? (
                                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                ) : isCurrent && phase === 'failed' ? (
                                    <XCircleIcon className="w-5 h-5" />
                                ) : isCurrent && phase === 'completed' ? (
                                    <CheckCircleIcon className="w-5 h-5" />
                                ) : (
                                    <span className="text-xs font-bold">{i + 1}</span>
                                )}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
                                isDone || isCurrent ? (isFailed ? 'text-rose-400' : 'text-white') : 'text-slate-600'
                            }`}>
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Execution Status */}
            {phase === 'executing' && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 text-center animate-in fade-in duration-300">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <ArrowPathIcon className="w-5 h-5 text-indigo-400 animate-spin" />
                        <span className="text-indigo-400 font-bold text-sm">Agent is working on your task...</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{job.agent.name} is processing. This may take up to 2 minutes.</p>
                </div>
            )}

            {/* Completed Result */}
            {phase === 'completed' && job.result && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-2 mb-3">
                        <SparklesIcon className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold text-sm">Task Completed Successfully</span>
                        {job.executionTime && (
                            <span className="text-[10px] text-slate-500 ml-auto">in {(job.executionTime / 1000).toFixed(1)}s</span>
                        )}
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 font-mono text-[11px] text-slate-300 leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap scrollbar-hide">
                        {job.result}
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={onShowReview}
                            className="px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                        >
                            {'\u2B50'} Rate Agent
                        </button>
                        <button
                            onClick={onReset}
                            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 text-xs font-bold rounded-xl transition-all"
                        >
                            New Task
                        </button>
                    </div>
                </div>
            )}

            {/* Failed */}
            {phase === 'failed' && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5 text-center animate-in fade-in duration-300">
                    <XCircleIcon className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                    <span className="text-rose-400 font-bold text-sm block">Task execution failed</span>
                    <p className="text-[11px] text-slate-500 mt-1">{job.result || 'An error occurred during execution.'}</p>
                    <button
                        onClick={onReset}
                        className="mt-4 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 text-xs font-bold rounded-xl transition-all"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}

export default React.memo(JobTracker);
