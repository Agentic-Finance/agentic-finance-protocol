'use client';

import React from 'react';

interface FeatureErrorBoundaryProps {
    children: React.ReactNode;
    /** Feature name displayed in error UI */
    feature: string;
    /** Optional compact mode for sidebar widgets */
    compact?: boolean;
}

interface FeatureErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Per-feature Error Boundary — prevents one component crash from taking down the entire dashboard.
 *
 * Usage:
 *   <FeatureErrorBoundary feature="OmniTerminal">
 *     <OmniTerminal {...props} />
 *   </FeatureErrorBoundary>
 */
export class FeatureErrorBoundary extends React.Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
    constructor(props: FeatureErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`[FeatureErrorBoundary:${this.props.feature}]`, error, errorInfo);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const { feature, compact } = this.props;

        if (compact) {
            return (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-rose-400 text-sm">⚠️</span>
                        <span className="text-xs font-semibold text-rose-400">{feature} Error</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">This component encountered an error.</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="text-[10px] px-3 py-1 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors border border-rose-500/20"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        return (
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.03] p-6 sm:p-8">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xl shrink-0">
                        ⚠️
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white mb-1">{feature} — Error</h3>
                        <p className="text-xs text-slate-400 mb-3">
                            This section encountered an unexpected error. Other dashboard features are unaffected.
                        </p>
                        {this.state.error && (
                            <details className="mb-3">
                                <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                                    Technical details
                                </summary>
                                <pre className="mt-1.5 p-2 bg-black/30 rounded-lg text-[10px] text-rose-300/80 overflow-x-auto font-mono">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="text-xs px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all border border-rose-500/20 font-medium"
                        >
                            ↻ Retry {feature}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
