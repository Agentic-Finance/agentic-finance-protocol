'use client';

import React from 'react';

interface OnboardingStep {
    key: string;
    title: string;
    description: string;
    completed: boolean;
    action: () => void;
    actionLabel: string;
}

interface OnboardingChecklistProps {
    steps: OnboardingStep[];
    completedCount: number;
    totalSteps: number;
    onDismiss: () => void;
}

function OnboardingChecklist({ steps, completedCount, totalSteps, onDismiss }: OnboardingChecklistProps) {
    const progress = (completedCount / totalSteps) * 100;

    return (
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-5 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-base font-bold text-white">Get Started</h3>
                    <p className="text-xs text-white/30 mt-0.5">{completedCount} of {totalSteps} steps completed</p>
                </div>
                <button onClick={onDismiss} className="text-xs text-white/20 hover:text-white/40 transition-colors px-2 py-1 rounded hover:bg-white/[0.03]">
                    Dismiss
                </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-white/[0.04] mb-5 overflow-hidden">
                <div
                    className="h-full rounded-full bg-emerald-400/60 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Steps */}
            <div className="space-y-2">
                {steps.map((step) => (
                    <div
                        key={step.key}
                        className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                            step.completed
                                ? 'bg-emerald-400/[0.03]'
                                : 'bg-white/[0.01] hover:bg-white/[0.03]'
                        }`}
                    >
                        {/* Checkmark / Number */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.completed
                                ? 'bg-emerald-400/20'
                                : 'border border-white/10'
                        }`}>
                            {step.completed ? (
                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <span className="text-[10px] text-white/20 font-mono">{steps.indexOf(step) + 1}</span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${step.completed ? 'text-white/40 line-through' : 'text-white/80'}`}>
                                {step.title}
                            </p>
                            <p className="text-xs text-white/20 mt-0.5 truncate">{step.description}</p>
                        </div>

                        {/* Action button */}
                        {!step.completed && (
                            <button
                                onClick={step.action}
                                className="text-xs font-medium text-white/50 hover:text-white/80 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all flex-shrink-0"
                            >
                                {step.actionLabel}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default React.memo(OnboardingChecklist);
