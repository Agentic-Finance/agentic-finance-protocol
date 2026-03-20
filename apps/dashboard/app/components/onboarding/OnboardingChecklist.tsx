'use client';

import React, { useState, useEffect } from 'react';

interface OnboardingStep {
    key: string;
    title: string;
    description: string;
    completed: boolean;
    action: () => void;
    actionLabel: string;
    icon: React.ReactNode;
}

interface OnboardingChecklistProps {
    steps: OnboardingStep[];
    completedCount: number;
    totalSteps: number;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onDismiss: () => void;
}

function OnboardingChecklist({ steps, completedCount, totalSteps, collapsed, onToggleCollapse, onDismiss }: OnboardingChecklistProps) {
    const progress = (completedCount / totalSteps) * 100;
    const [mounted, setMounted] = useState(false);
    const [justCompleted, setJustCompleted] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(t);
    }, []);

    // Celebrate when all done
    useEffect(() => {
        if (completedCount === totalSteps) {
            setJustCompleted(true);
            const t = setTimeout(() => setJustCompleted(false), 3000);
            return () => clearTimeout(t);
        }
    }, [completedCount, totalSteps]);

    // Progress ring for collapsed state
    const ringSize = 36;
    const strokeWidth = 3;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Collapsed pill
    if (collapsed) {
        return (
            <div
                className={`onboarding-panel fixed bottom-6 right-6 z-50 cursor-pointer transition-all duration-300 ${mounted ? 'onboarding-slide-up' : 'opacity-0 translate-y-4'}`}
                onClick={onToggleCollapse}
                title="Open getting started guide"
            >
                <div className="flex items-center gap-3 rounded-full px-4 py-2.5 shadow-2xl border"
                    style={{
                        background: 'var(--pp-bg-card)',
                        borderColor: 'var(--pp-border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                >
                    <svg width={ringSize} height={ringSize} className="flex-shrink-0 -rotate-90">
                        <circle
                            cx={ringSize / 2} cy={ringSize / 2} r={radius}
                            stroke="var(--pp-border)" strokeWidth={strokeWidth} fill="none"
                        />
                        <circle
                            cx={ringSize / 2} cy={ringSize / 2} r={radius}
                            stroke="var(--agt-mint)" strokeWidth={strokeWidth} fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-700"
                        />
                    </svg>
                    <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--pp-text-primary)' }}>
                            {completedCount}/{totalSteps} completed
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Getting Started</p>
                    </div>
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </div>
            </div>
        );
    }

    // Expanded panel
    return (
        <div
            className={`onboarding-panel fixed bottom-6 right-6 z-50 w-[360px] max-h-[85vh] overflow-y-auto transition-all duration-300 ${mounted ? 'onboarding-slide-up' : 'opacity-0 translate-y-4'}`}
            style={{
                background: 'var(--pp-bg-card)',
                border: '1px solid var(--pp-border)',
                borderRadius: 'var(--pp-radius-lg)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px var(--pp-border)',
            }}
        >
            {/* Header */}
            <div className="p-5 pb-0">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>Getting Started</h3>
                            <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>{completedCount} of {totalSteps} completed</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onToggleCollapse}
                            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                            style={{ color: 'var(--pp-text-muted)' }}
                            title="Minimize"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={onDismiss}
                            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                            style={{ color: 'var(--pp-text-muted)' }}
                            title="Dismiss guide"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 mb-2">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--pp-surface-1)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${progress}%`,
                                background: progress === 100
                                    ? 'var(--agt-mint)'
                                    : 'linear-gradient(90deg, var(--agt-pink), var(--agt-blue))',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Steps */}
            <div className="p-3 pt-2 space-y-1">
                {steps.map((step, i) => (
                    <div
                        key={step.key}
                        className="group flex items-start gap-3 p-3 rounded-xl transition-all duration-200"
                        style={{
                            background: step.completed ? 'var(--pp-surface-1)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!step.completed) e.currentTarget.style.background = 'var(--pp-surface-1)'; }}
                        onMouseLeave={(e) => { if (!step.completed) e.currentTarget.style.background = 'transparent'; }}
                    >
                        {/* Step indicator */}
                        <div className="flex-shrink-0 mt-0.5">
                            {step.completed ? (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(62, 221, 185, 0.15)' }}>
                                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--agt-mint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center border" style={{ borderColor: 'var(--pp-border)' }}>
                                    <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--pp-text-muted)' }}>{i + 1}</span>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 flex-shrink-0" style={{ color: step.completed ? 'var(--pp-text-muted)' : 'var(--pp-text-secondary)' }}>
                                    {step.icon}
                                </span>
                                <p className={`text-[13px] font-medium ${step.completed ? 'line-through' : ''}`}
                                    style={{ color: step.completed ? 'var(--pp-text-muted)' : 'var(--pp-text-primary)' }}>
                                    {step.title}
                                </p>
                            </div>
                            <p className="text-[11px] mt-0.5 ml-6" style={{ color: 'var(--pp-text-muted)' }}>
                                {step.description}
                            </p>

                            {/* Action button */}
                            {!step.completed && (
                                <button
                                    onClick={step.action}
                                    className="mt-2 ml-6 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                                    style={{
                                        background: 'var(--pp-surface-2)',
                                        color: 'var(--agt-blue)',
                                        border: '1px solid var(--pp-border)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--pp-surface-3)';
                                        e.currentTarget.style.borderColor = 'var(--agt-blue)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--pp-surface-2)';
                                        e.currentTarget.style.borderColor = 'var(--pp-border)';
                                    }}
                                >
                                    {step.actionLabel} →
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-5 pb-4 pt-1">
                <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                    <span>Complete all steps to unlock full features</span>
                    <button
                        onClick={onDismiss}
                        className="hover:underline transition-colors"
                        style={{ color: 'var(--pp-text-muted)' }}
                    >
                        Skip guide
                    </button>
                </div>
            </div>

            {/* Celebration overlay */}
            {justCompleted && (
                <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 onboarding-celebrate" />
                </div>
            )}
        </div>
    );
}

export default React.memo(OnboardingChecklist);
