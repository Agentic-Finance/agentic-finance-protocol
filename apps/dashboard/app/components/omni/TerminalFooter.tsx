import React, { useState, useRef, useEffect } from 'react';
import { DocumentArrowDownIcon, ArrowPathIcon, BoltIcon } from '@/app/components/icons';

interface TerminalFooterProps {
    isPayroll: boolean;
    isA2aActive: boolean;
    hasReadyIntents: boolean;
    handleUploadClick: () => void;
    executePayroll: () => void;
    handleDiscoverAgents: () => void;
    resetTerminal: () => void;
    omniFileRef: React.RefObject<HTMLInputElement | null>;
    processCSV: (file: File) => void;
    aiPrompt: string;
    // Payment Tools (replaces Invoice)
    onPaymentLinkClick?: () => void;
    onRequestPayClick?: () => void;
    onSplitPayClick?: () => void;
    onSubscriptionClick?: () => void;
    // Conditional Payroll
    showConditionBuilder: boolean;
    onToggleConditions: () => void;
    hasConditions: boolean;
    // Total amount preview
    totalAmount?: number;
    intentCount?: number;
    // Loading state
    isDeploying?: boolean;
}

function TerminalFooter({
    isPayroll, isA2aActive, hasReadyIntents,
    handleUploadClick, executePayroll, handleDiscoverAgents, resetTerminal,
    omniFileRef, processCSV, aiPrompt,
    onPaymentLinkClick, onRequestPayClick, onSplitPayClick, onSubscriptionClick,
    showConditionBuilder, onToggleConditions, hasConditions,
    totalAmount, intentCount, isDeploying,
}: TerminalFooterProps) {
    const [showPayTools, setShowPayTools] = useState(false);
    const payToolsRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (payToolsRef.current && !payToolsRef.current.contains(e.target as Node)) {
                setShowPayTools(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    return (
        <div className="mt-6 pt-5 border-t border-white/[0.05] flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-2.5 items-center flex-wrap">
                {isPayroll && (
                    <>
                        {/* Upload Ledger (CSV) */}
                        <button
                            type="button"
                            onClick={handleUploadClick}
                            className="px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-emerald-500/25 text-slate-300 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" /> Upload Ledger
                        </button>
                        <input
                            type="file"
                            accept=".csv,.txt,.xls,.xlsx"
                            className="hidden"
                            ref={omniFileRef}
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) processCSV(e.target.files[0]);
                                e.target.value = '';
                            }}
                        />

                        {/* Payment Tools Dropdown */}
                        <div className="relative" ref={payToolsRef}>
                            <button
                                type="button"
                                onClick={() => setShowPayTools(!showPayTools)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${showPayTools ? 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-400' : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-cyan-500/25 text-slate-300'}`}
                            >
                                <svg className="w-4 h-4 text-cyan-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                                Pay Tools
                                <svg className={`w-3 h-3 transition-transform ${showPayTools ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {showPayTools && (
                                <div className="absolute bottom-full left-0 mb-2 w-[260px] rounded-xl border shadow-2xl z-50 overflow-hidden" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
                                    <div className="p-1.5">
                                        <button onClick={() => { onPaymentLinkClick?.(); setShowPayTools(false); }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors flex items-center gap-3 group">
                                            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(62,221,185,0.1)' }}>
                                                <svg className="w-4 h-4" style={{ color: 'var(--agt-mint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                                            </span>
                                            <div>
                                                <p className="text-[12px] font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Payment Link</p>
                                                <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Generate shareable pay link</p>
                                            </div>
                                        </button>
                                        <button onClick={() => { onRequestPayClick?.(); setShowPayTools(false); }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors flex items-center gap-3 group">
                                            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(27,191,236,0.1)' }}>
                                                <svg className="w-4 h-4" style={{ color: 'var(--agt-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                                            </span>
                                            <div>
                                                <p className="text-[12px] font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Request Payment</p>
                                                <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Send payment request to a wallet</p>
                                            </div>
                                        </button>
                                        <button onClick={() => { onSplitPayClick?.(); setShowPayTools(false); }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors flex items-center gap-3 group">
                                            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,45,135,0.1)' }}>
                                                <svg className="w-4 h-4" style={{ color: 'var(--agt-pink)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                                            </span>
                                            <div>
                                                <p className="text-[12px] font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Split Payment</p>
                                                <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Split bill among multiple wallets</p>
                                            </div>
                                        </button>
                                        <button onClick={() => { onSubscriptionClick?.(); setShowPayTools(false); }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors flex items-center gap-3 group">
                                            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,125,44,0.1)' }}>
                                                <svg className="w-4 h-4" style={{ color: 'var(--agt-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                                            </span>
                                            <div>
                                                <p className="text-[12px] font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Subscription</p>
                                                <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Recurring auto-payment plan</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Conditional Toggle */}
                        <button
                            type="button"
                            onClick={onToggleConditions}
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                                showConditionBuilder || hasConditions
                                    ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/15'
                                    : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-amber-500/25 text-slate-300'
                            }`}
                        >
                            <BoltIcon className="w-4 h-4 text-amber-400/70" />
                            {hasConditions ? 'Conditional ✓' : 'Conditional'}
                        </button>
                    </>
                )}

                {/* A2A Reset button when flow is active */}
                {!isPayroll && isA2aActive && (
                    <button
                        type="button"
                        onClick={resetTerminal}
                        className="px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-indigo-500/25 text-slate-300 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                    >
                        <ArrowPathIcon className="w-4 h-4" /> New Search
                    </button>
                )}
            </div>

            <div className="flex gap-3 items-center">
                {/* Payroll mode */}
                {isPayroll && hasReadyIntents && (
                    <span className="text-xs font-mono text-slate-500 mr-2 opacity-50">Press ↵ Enter to</span>
                )}

                {isPayroll && (
                    <button
                        type="button"
                        disabled={!hasReadyIntents || isDeploying}
                        onClick={executePayroll}
                        className={`px-8 py-4 font-bold rounded-xl text-sm transition-all ${
                            isDeploying
                                ? 'bg-gradient-to-r from-emerald-500/60 to-teal-500/60 text-slate-900 cursor-wait animate-pulse'
                                : hasReadyIntents
                                    ? hasConditions
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02]'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02]'
                                    : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] cursor-not-allowed'
                        }`}
                    >
                        {isDeploying
                            ? 'Deploying...'
                            : hasConditions
                                ? `Deploy Conditional${totalAmount ? ` ($${totalAmount.toFixed(0)})` : ''}`
                                : `Deploy Protocol${totalAmount ? ` ($${totalAmount.toFixed(0)})` : ''}`
                        }
                    </button>
                )}

                {/* A2A mode - Discover button */}
                {!isPayroll && !isA2aActive && (
                    <>
                        {aiPrompt.trim().length > 3 && (
                            <span className="text-xs font-mono text-slate-500 mr-2 opacity-50">Press ↵ Enter to</span>
                        )}
                        <button
                            type="button"
                            disabled={aiPrompt.trim().length < 3}
                            onClick={handleDiscoverAgents}
                            className={`px-8 py-4 font-bold rounded-xl text-sm transition-all ${
                                aiPrompt.trim().length >= 3
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-[1.02]'
                                    : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] cursor-not-allowed'
                            }`}
                        >
                            Discover Agents
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default React.memo(TerminalFooter);
