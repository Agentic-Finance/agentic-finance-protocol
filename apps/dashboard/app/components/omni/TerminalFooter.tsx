import React from 'react';
import { DocumentArrowDownIcon, ArrowPathIcon, DocumentTextIcon, BoltIcon } from '@heroicons/react/24/outline';

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
    // New: Invoice-to-Pay
    onInvoiceClick: () => void;
    // New: Conditional Payroll
    showConditionBuilder: boolean;
    onToggleConditions: () => void;
    hasConditions: boolean;
}

function TerminalFooter({
    isPayroll, isA2aActive, hasReadyIntents,
    handleUploadClick, executePayroll, handleDiscoverAgents, resetTerminal,
    omniFileRef, processCSV, aiPrompt,
    onInvoiceClick, showConditionBuilder, onToggleConditions, hasConditions
}: TerminalFooterProps) {
    return (
        <div className="mt-4 pt-5 border-t border-white/[0.05] flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-2 items-center flex-wrap">
                {isPayroll && (
                    <>
                        {/* Upload Ledger (CSV) */}
                        <button
                            type="button"
                            onClick={handleUploadClick}
                            className="px-4 py-2.5 bg-[#111621] hover:bg-[#1A2230] border border-white/5 hover:border-emerald-500/30 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" /> Upload Ledger
                        </button>
                        <input
                            type="file"
                            accept=".csv, .xls, .xlsx"
                            className="hidden"
                            ref={omniFileRef}
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) processCSV(e.target.files[0]);
                                e.target.value = '';
                            }}
                        />

                        {/* Invoice-to-Pay */}
                        <button
                            type="button"
                            onClick={onInvoiceClick}
                            className="px-4 py-2.5 bg-[#111621] hover:bg-[#1A2230] border border-white/5 hover:border-cyan-500/30 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                        >
                            <DocumentTextIcon className="w-4 h-4 text-cyan-400/70" /> Invoice
                        </button>

                        {/* Conditional Toggle */}
                        <button
                            type="button"
                            onClick={onToggleConditions}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                                showConditionBuilder || hasConditions
                                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/15'
                                    : 'bg-[#111621] hover:bg-[#1A2230] border border-white/5 hover:border-amber-500/30 text-slate-300'
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
                        className="px-5 py-3 bg-[#111621] hover:bg-[#1A2230] border border-white/5 hover:border-indigo-500/30 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                        <ArrowPathIcon className="w-4 h-4" /> New Search
                    </button>
                )}
            </div>

            <div className="flex gap-3 items-center">
                {/* Payroll mode */}
                {isPayroll && hasReadyIntents && (
                    <span className="text-[10px] font-mono text-slate-500 mr-2 opacity-50">Press {'\u21B5'} Enter to</span>
                )}

                {isPayroll && (
                    <button
                        type="button"
                        disabled={!hasReadyIntents}
                        onClick={executePayroll}
                        className={`px-8 py-3.5 font-bold rounded-xl transition-all ${
                            hasReadyIntents
                                ? hasConditions
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02]'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-[1.02]'
                                : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                        }`}
                    >
                        {hasConditions ? '⚡ Deploy Conditional' : 'Deploy Protocol'}
                    </button>
                )}

                {/* A2A mode - Discover button */}
                {!isPayroll && !isA2aActive && (
                    <>
                        {aiPrompt.trim().length > 3 && (
                            <span className="text-[10px] font-mono text-slate-500 mr-2 opacity-50">Press {'\u21B5'} Enter to</span>
                        )}
                        <button
                            type="button"
                            disabled={aiPrompt.trim().length < 3}
                            onClick={handleDiscoverAgents}
                            className={`px-8 py-3.5 font-bold rounded-xl transition-all ${
                                aiPrompt.trim().length >= 3
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-[1.02]'
                                    : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
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
