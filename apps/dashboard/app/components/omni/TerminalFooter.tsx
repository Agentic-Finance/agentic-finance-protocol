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
    // Pay Tools v2
    onPaymentLinkClick?: () => void;
    onSplitPayClick?: () => void;
    onInvoiceGenClick?: () => void;
    onBatchTemplateClick?: () => void;
    onScheduledSendClick?: () => void;
    // Conditional Payroll
    showConditionBuilder: boolean;
    onToggleConditions: () => void;
    hasConditions: boolean;
    // Total amount preview
    totalAmount?: number;
    intentCount?: number;
    isDeploying?: boolean;
}

function TerminalFooter({
    isPayroll, isA2aActive, hasReadyIntents,
    handleUploadClick, executePayroll, handleDiscoverAgents, resetTerminal,
    omniFileRef, processCSV, aiPrompt,
    onPaymentLinkClick, onSplitPayClick, onInvoiceGenClick, onBatchTemplateClick, onScheduledSendClick,
    showConditionBuilder, onToggleConditions, hasConditions,
    totalAmount, intentCount, isDeploying,
}: TerminalFooterProps) {
    const [showPayTools, setShowPayTools] = useState(false);
    const payToolsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (payToolsRef.current && !payToolsRef.current.contains(e.target as Node)) {
                setShowPayTools(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const payTools = [
        {
            id: 'payment-link',
            label: 'Payment Link + QR',
            desc: 'Shareable link with QR code',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75zM6.75 16.5h.75v.75h-.75zM16.5 6.75h.75v.75h-.75zM13.5 13.5h.75v.75h-.75zM13.5 19.5h.75v.75h-.75zM19.5 13.5h.75v.75h-.75zM19.5 19.5h.75v.75h-.75zM16.5 16.5h.75v.75h-.75z" /></svg>,
            color: 'var(--agt-mint)',
            bg: 'rgba(62,221,185,0.1)',
            onClick: onPaymentLinkClick,
        },
        {
            id: 'split-pay',
            label: 'Split Bill',
            desc: 'Divide payment equally',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
            color: 'var(--agt-pink)',
            bg: 'rgba(255,45,135,0.1)',
            onClick: onSplitPayClick,
        },
        {
            id: 'invoice-gen',
            label: 'Invoice',
            desc: 'Create & send pro invoice',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
            color: 'var(--agt-blue)',
            bg: 'rgba(27,191,236,0.1)',
            onClick: onInvoiceGenClick,
        },
        {
            id: 'batch-template',
            label: 'Batch Template',
            desc: '1-click re-run saved payroll',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" /></svg>,
            color: 'var(--agt-orange)',
            bg: 'rgba(255,125,44,0.1)',
            onClick: onBatchTemplateClick,
        },
        {
            id: 'scheduled-send',
            label: 'Schedule Send',
            desc: 'Send at a specific time',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
            color: '#a78bfa',
            bg: 'rgba(167,139,250,0.1)',
            onClick: onScheduledSendClick,
        },
    ];

    return (
        <div className="mt-6 pt-5 border-t flex flex-wrap justify-between items-center gap-4" style={{ borderColor: 'var(--pp-border)' }}>
            <div className="flex gap-2.5 items-center flex-wrap">
                {isPayroll && (
                    <>
                        {/* Upload Ledger */}
                        <button type="button" onClick={handleUploadClick}
                            className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 border"
                            style={{ background: 'var(--pp-surface-1)', borderColor: 'var(--pp-border)', color: 'var(--pp-text-secondary)' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--agt-mint)'; e.currentTarget.style.color = 'var(--agt-mint)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--pp-border)'; e.currentTarget.style.color = 'var(--pp-text-secondary)'; }}
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" /> Upload Ledger
                        </button>
                        <input type="file" accept=".csv,.txt,.xls,.xlsx" className="hidden" ref={omniFileRef}
                            onChange={(e) => { if (e.target.files?.[0]) processCSV(e.target.files[0]); e.target.value = ''; }} />

                        {/* Pay Tools v2 */}
                        <div className="relative" ref={payToolsRef}>
                            <button type="button" onClick={() => setShowPayTools(!showPayTools)}
                                className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 border ${showPayTools ? '' : ''}`}
                                style={{
                                    background: showPayTools ? 'rgba(27,191,236,0.08)' : 'var(--pp-surface-1)',
                                    borderColor: showPayTools ? 'var(--agt-blue)' : 'var(--pp-border)',
                                    color: showPayTools ? 'var(--agt-blue)' : 'var(--pp-text-secondary)',
                                }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.384 3.076A1.5 1.5 0 014.5 17.037V6.963a1.5 1.5 0 011.536-1.209l5.384 3.076m0 0l5.384-3.076A1.5 1.5 0 0118 6.963v10.074a1.5 1.5 0 01-1.536 1.209l-5.384-3.076" /></svg>
                                Pay Tools
                                <svg className={`w-3 h-3 transition-transform duration-200 ${showPayTools ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {showPayTools && (
                                <div className="absolute bottom-full left-0 mb-2 w-[280px] rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200"
                                    style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
                                    <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--pp-border)' }}>
                                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--pp-text-muted)' }}>Payment Tools</p>
                                    </div>
                                    <div className="p-1.5">
                                        {payTools.map(tool => (
                                            <button key={tool.id} onClick={() => { tool.onClick?.(); setShowPayTools(false); }}
                                                className="w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 group"
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--pp-surface-1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: tool.bg, color: tool.color }}>
                                                    {tool.icon}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{tool.label}</p>
                                                    <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{tool.desc}</p>
                                                </div>
                                                <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: tool.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Conditional */}
                        <button type="button" onClick={onToggleConditions}
                            className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 border"
                            style={{
                                background: showConditionBuilder || hasConditions ? 'rgba(245,158,11,0.08)' : 'var(--pp-surface-1)',
                                borderColor: showConditionBuilder || hasConditions ? 'rgba(245,158,11,0.25)' : 'var(--pp-border)',
                                color: showConditionBuilder || hasConditions ? 'rgb(245,158,11)' : 'var(--pp-text-secondary)',
                            }}
                        >
                            <BoltIcon className="w-4 h-4" />
                            {hasConditions ? 'Conditional ✓' : 'Conditional'}
                        </button>
                    </>
                )}

                {!isPayroll && isA2aActive && (
                    <button type="button" onClick={resetTerminal}
                        className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 border"
                        style={{ background: 'var(--pp-surface-1)', borderColor: 'var(--pp-border)', color: 'var(--pp-text-secondary)' }}>
                        <ArrowPathIcon className="w-4 h-4" /> New Search
                    </button>
                )}
            </div>

            <div className="flex gap-3 items-center">
                {isPayroll && hasReadyIntents && (
                    <span className="text-xs font-mono opacity-50" style={{ color: 'var(--pp-text-muted)' }}>Press ↵ Enter to</span>
                )}
                {isPayroll && (
                    <button type="button" disabled={!hasReadyIntents || isDeploying} onClick={executePayroll}
                        className={`px-8 py-4 font-bold rounded-xl text-sm transition-all ${
                            isDeploying ? 'cursor-wait animate-pulse' : hasReadyIntents ? 'hover:scale-[1.02]' : 'cursor-not-allowed'
                        }`}
                        style={{
                            background: isDeploying
                                ? 'linear-gradient(135deg, rgba(62,221,185,0.6), rgba(20,184,166,0.6))'
                                : hasReadyIntents
                                    ? hasConditions
                                        ? 'linear-gradient(135deg, rgb(245,158,11), rgb(249,115,22))'
                                        : 'linear-gradient(135deg, rgb(16,185,129), rgb(20,184,166))'
                                    : 'var(--pp-surface-1)',
                            color: hasReadyIntents ? '#0f172a' : 'var(--pp-text-muted)',
                            border: hasReadyIntents ? 'none' : '1px solid var(--pp-border)',
                            boxShadow: hasReadyIntents
                                ? hasConditions ? '0 0 20px rgba(245,158,11,0.3)' : '0 0 20px rgba(16,185,129,0.3)'
                                : 'none',
                        }}
                    >
                        {isDeploying ? 'Deploying...'
                            : hasConditions ? `Deploy Conditional${totalAmount ? ` ($${totalAmount.toFixed(0)})` : ''}`
                            : `Deploy Protocol${totalAmount ? ` ($${totalAmount.toFixed(0)})` : ''}`}
                    </button>
                )}
                {!isPayroll && !isA2aActive && (
                    <>
                        {aiPrompt.trim().length > 3 && (
                            <span className="text-xs font-mono opacity-50" style={{ color: 'var(--pp-text-muted)' }}>Press ↵ Enter to</span>
                        )}
                        <button type="button" disabled={aiPrompt.trim().length < 3} onClick={handleDiscoverAgents}
                            className={`px-8 py-4 font-bold rounded-xl text-sm transition-all ${aiPrompt.trim().length >= 3 ? 'hover:scale-[1.02]' : 'cursor-not-allowed'}`}
                            style={{
                                background: aiPrompt.trim().length >= 3 ? 'rgb(79,70,229)' : 'var(--pp-surface-1)',
                                color: aiPrompt.trim().length >= 3 ? '#fff' : 'var(--pp-text-muted)',
                                border: aiPrompt.trim().length >= 3 ? 'none' : '1px solid var(--pp-border)',
                                boxShadow: aiPrompt.trim().length >= 3 ? '0 0 20px rgba(79,70,229,0.3)' : 'none',
                            }}
                        >Discover Agents</button>
                    </>
                )}
            </div>
        </div>
    );
}

export default React.memo(TerminalFooter);
