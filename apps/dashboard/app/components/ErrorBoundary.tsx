'use client';

import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Root-level Error Boundary for the Agentic Finance Dashboard.
 * Catches React rendering errors and shows a styled fallback UI.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen bg-[var(--pp-bg-card)] flex items-center justify-center p-6">
                    <div className="pp-card p-8 max-w-lg w-full text-center space-y-6">
                        {/* Icon */}
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-3xl">
                            ⚠️
                        </div>

                        {/* Title */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                The dashboard encountered an unexpected error. This has been logged automatically.
                            </p>
                        </div>

                        {/* Error detail (collapsed) */}
                        {this.state.error && (
                            <details className="text-left">
                                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                                    Technical details
                                </summary>
                                <pre className="mt-2 p-3 bg-black/40 rounded-lg text-[10px] text-rose-300 overflow-x-auto font-mono whitespace-pre-wrap break-all">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}

                        {/* Action */}
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-indigo-400 hover:to-purple-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.35)]"
                        >
                            Reload Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
