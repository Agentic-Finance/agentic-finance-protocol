'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CommandLineIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import NegotiationLog from './NegotiationLog';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAgentMarketplace } from '../hooks/useAgentMarketplace';

// Sub-components
import CsvUploadModal from './omni/CsvUploadModal';
import IntentCards from './omni/IntentCards';
import MarketplacePanel from './omni/MarketplacePanel';
import DealConfirmation from './omni/DealConfirmation';
import JobTracker from './omni/JobTracker';
import ReviewModal from './omni/ReviewModal';
import TerminalFooter from './omni/TerminalFooter';
import ConditionBuilder from './omni/ConditionBuilder';
import InvoiceUploadModal from './omni/InvoiceUploadModal';
import SuggestedPrompts from './omni/SuggestedPrompts';
import type { ParsedIntent } from './omni/types';
import type { Condition } from './omni/ConditionBuilder';

// ==========================================
// MAIN COMPONENT
// ==========================================
interface OmniTerminalProps {
    SUPPORTED_TOKENS: readonly any[];
    contacts: { name: string; wallet: string }[];
    showToast: (type: 'success' | 'error', msg: string) => void;
    fetchData: () => Promise<void>;
    boardroomRef: any;
    autopilotRef: any;
    history?: any[];
}

function OmniTerminal({ SUPPORTED_TOKENS, contacts, showToast, fetchData, boardroomRef, autopilotRef, history }: OmniTerminalProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [activeTab, setActiveTab] = useState<'payroll' | 'a2a'>('payroll');

    // Shared UI state
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiParsing, setIsAiParsing] = useState(false);
    const [globalMode, setGlobalMode] = useState<'standard' | 'autopilot' | 'shield'>('standard');
    const [liveIntents, setLiveIntents] = useState<ParsedIntent[]>([]);
    const [chatAnswer, setChatAnswer] = useState<string | null>(null);
    const [isDeployingAnimation, setIsDeployingAnimation] = useState(false);
    const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);

    // CSV modal state
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [dontShowCsvGuide, setDontShowCsvGuide] = useState(false);

    // Payroll-specific state
    const [walletAliases, setWalletAliases] = useState<Record<string, string>>({});
    const [lockedAliases, setLockedAliases] = useState<Set<string>>(new Set());
    const [cardNotes, setCardNotes] = useState<Record<number, string>>({});

    // Conditional Payroll state
    const [showConditionBuilder, setShowConditionBuilder] = useState(false);
    const [conditions, setConditions] = useState<Condition[]>([]);
    const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>('AND');

    // Invoice-to-Pay state
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    // Agent Marketplace hook
    const marketplace = useAgentMarketplace();
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isConfirmingDeal, setIsConfirmingDeal] = useState(false);

    // Refs
    const omniFileRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const confirmationRef = useRef<HTMLDivElement>(null);

    const latestDataRef = useRef({ SUPPORTED_TOKENS, contacts, history });
    useEffect(() => {
        latestDataRef.current = { SUPPORTED_TOKENS, contacts, history };
    }, [SUPPORTED_TOKENS, contacts, history]);

    // Auto-scroll to deal confirmation
    useEffect(() => {
        if (marketplace.phase === 'confirming' && confirmationRef.current) {
            setTimeout(() => confirmationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
    }, [marketplace.phase]);

    // Auto-trigger browse mode when switching to A2A tab
    useEffect(() => {
        if (activeTab === 'a2a' && marketplace.phase === 'idle') {
            marketplace.startBrowsing();
        }
    }, [activeTab, marketplace.phase, marketplace.startBrowsing]);

    // ==========================================
    // STABLE CALLBACKS
    // ==========================================
    const handleAliasChange = useCallback((wallet: string, newAlias: string) =>
        setWalletAliases(prev => ({ ...prev, [wallet]: newAlias })), []);

    const handleAliasLock = useCallback((wallet: string) =>
        setLockedAliases(prev => { const s = new Set(prev); s.add(wallet); return s; }), []);

    const handleAliasKeyDown = useCallback((wallet: string, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') setLockedAliases(prev => { const s = new Set(prev); s.add(wallet); return s; });
    }, []);

    const handleNoteChange = useCallback((indexId: number, newNote: string) =>
        setCardNotes(prev => ({ ...prev, [indexId]: newNote })), []);

    const resetTerminal = useCallback((preventFocus = false) => {
        marketplace.reset();
        setShowReviewModal(false);
        setIsDeployingAnimation(false);
        setAiPrompt(''); setLiveIntents([]); setChatAnswer(null);
        setWalletAliases({}); setLockedAliases(new Set()); setCardNotes({});
        setShowConditionBuilder(false); setConditions([]); setConditionLogic('AND');
        if (!preventFocus) setTimeout(() => inputRef.current?.focus(), 50);
    }, [marketplace]);

    // ==========================================
    // AI PARSING (Payroll tab only)
    // ==========================================
    const debouncedPrompt = useDebouncedValue(aiPrompt, 500);

    useEffect(() => {
        if (!debouncedPrompt.trim()) {
            setLiveIntents([]); setChatAnswer(null); setGlobalMode('standard'); setIsAiParsing(false); return;
        }
        if (debouncedPrompt.trim().startsWith('[')) return;

        // A2A tab: marketplace hook handles everything - skip AI parsing
        if (activeTab === 'a2a') return;

        let currentMode: 'standard' | 'autopilot' | 'shield' = 'standard';
        if (/\/(autopilot|recurring)/i.test(debouncedPrompt)) currentMode = 'autopilot';
        if (/\/(shield|zk|private)/i.test(debouncedPrompt)) currentMode = 'shield';
        setGlobalMode(currentMode);

        let cancelled = false;
        (async () => {
            setIsAiParsing(true);
            try {
                const { SUPPORTED_TOKENS: currentTokens, contacts: currentContacts, history: currentHistory } = latestDataRef.current;
                const safeContacts = currentContacts.length > 0 ? currentContacts : [{ name: 'Tony', wallet: '0xe89b...' }];

                const response = await fetch('/api/ai-parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: debouncedPrompt,
                        supportedTokens: currentTokens.map((t: any) => t.symbol),
                        addressBook: safeContacts.map(c => c.name),
                        systemData: currentHistory ? currentHistory.slice(0, 15).map(h => ({ date: h.date, amount: h.amount, token: h.token, recipient: h.breakdown[0]?.name })) : []
                    })
                });
                if (cancelled) return;

                const data = await response.json();

                if (data.actionType === 'CHAT') {
                    setChatAnswer(data.answer); setLiveIntents([]);
                } else {
                    setChatAnswer(null);
                    if (data.intents && data.intents.length > 0) {
                        let finalParsed: ParsedIntent[] = []; let indexCounter = 0;
                        const rawWalletsInPrompt = debouncedPrompt.match(/0x[a-fA-F0-9]{40}/gi) || [];

                        data.intents.forEach((intent: any, idx: number) => {
                            if (intent.name?.toLowerCase() === 'all' || intent.name?.toLowerCase() === 'everyone') {
                                safeContacts.forEach(contact => {
                                    finalParsed.push({ name: contact.name, wallet: contact.wallet, isRawWallet: false, amount: intent.amount || '0', token: intent.token || 'AlphaUSD', schedule: intent.schedule, timelock: intent.timelock, note: intent.note, indexId: indexCounter++ });
                                });
                            } else {
                                let resolvedWallet = '0x00...00'; let isRaw = false;
                                let finalName = intent.name || 'Unknown Entity';
                                if (rawWalletsInPrompt[idx]) { resolvedWallet = rawWalletsInPrompt[idx]; isRaw = true; }
                                else if (intent.wallet && /^0x[a-fA-F0-9]{40}$/i.test(intent.wallet.trim())) { resolvedWallet = intent.wallet.trim(); isRaw = true; }
                                else { const foundContact = safeContacts.find(c => c.name.toLowerCase() === finalName.toLowerCase()); if (foundContact) resolvedWallet = foundContact.wallet; }
                                if (finalName.toLowerCase().includes('unknown') || finalName.includes('0x')) finalName = 'Unknown Entity';
                                finalParsed.push({ name: finalName, wallet: resolvedWallet, isRawWallet: isRaw, amount: intent.amount || '0', token: intent.token || 'AlphaUSD', schedule: intent.schedule, timelock: intent.timelock, note: intent.note, indexId: indexCounter++ });
                            }
                        });
                        setLiveIntents(finalParsed);
                    } else { setLiveIntents([]); }
                }
            } catch (error) { console.error("AI Parsing Error:", error); } finally { if (!cancelled) setIsAiParsing(false); }
        })();

        return () => { cancelled = true; };
    }, [debouncedPrompt, activeTab]);

    // ==========================================
    // FILE HANDLING (Payroll)
    // ==========================================
    const handleUploadClick = useCallback(() => {
        const isHidden = localStorage.getItem('paypol_hide_csv_guide');
        if (isHidden === 'true') { omniFileRef.current?.click(); } else { setShowCsvModal(true); }
    }, []);

    const handleProceedUpload = useCallback(() => {
        if (dontShowCsvGuide) localStorage.setItem('paypol_hide_csv_guide', 'true');
        setShowCsvModal(false); setTimeout(() => omniFileRef.current?.click(), 100);
    }, [dontShowCsvGuide]);

    const resetFileUI = useCallback(() => {
        setAttachedFile(null); if (omniFileRef.current) omniFileRef.current.value = "";
    }, []);

    const processCSV = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvText = e.target?.result as string;
            if (!csvText || !csvText.trim()) { resetFileUI(); return showToast('error', "CSV file is empty."); }
            setIsAiParsing(true); setAiPrompt(`[AI is analyzing data file: ${file.name}...]`);
            try {
                const { SUPPORTED_TOKENS: currentTokens, contacts: currentContacts } = latestDataRef.current;
                const safeContacts = currentContacts.length > 0 ? currentContacts : [{ name: 'Tony', wallet: '0xe89b...' }];
                const response = await fetch('/api/ai-parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `Extract payroll intents.\nRaw Data:\n${csvText}`, supportedTokens: currentTokens.map((t: any) => t.symbol), addressBook: safeContacts.map(c => c.name) }) });
                const data = await response.json();
                if (data.intents && data.intents.length > 0) {
                    let finalParsed: ParsedIntent[] = []; let indexCounter = 0;
                    data.intents.forEach((intent: any) => {
                        let resolvedWallet = '0x00...00'; let isRaw = false;
                        if (intent.name && /^0x[a-fA-F0-9]{40}$/i.test(intent.name.trim())) { resolvedWallet = intent.name; isRaw = true; }
                        else if (intent.name) { const foundContact = safeContacts.find(c => c.name.toLowerCase() === intent.name.toLowerCase()); if (foundContact) resolvedWallet = foundContact.wallet; }
                        finalParsed.push({ name: intent.name || 'Unknown Entity', wallet: resolvedWallet, isRawWallet: isRaw, amount: intent.amount || '0', token: intent.token || 'AlphaUSD', indexId: indexCounter++ });
                    });
                    setLiveIntents(finalParsed);
                    setAiPrompt(`[Extracted ${finalParsed.length} intents from CSV. Please review and Deploy.]`);
                } else { showToast('error', "AI couldn't find valid data."); setAiPrompt(''); }
            } catch (error) { setAiPrompt(''); } finally { setIsAiParsing(false); resetFileUI(); }
        };
        reader.readAsText(file);
    }, [showToast, resetFileUI]);

    // ==========================================
    // INVOICE-TO-PAY: Handle parsed invoice data
    // ==========================================
    const handleInvoiceParsed = useCallback((intents: { name: string; wallet: string; amount: string; token: string; note: string }[]) => {
        let indexCounter = 0;
        const parsed: ParsedIntent[] = intents.map(intent => ({
            name: intent.name || 'Unknown Entity',
            wallet: intent.wallet || '0x00...00',
            isRawWallet: !!(intent.wallet && /^0x[a-fA-F0-9]{40}$/i.test(intent.wallet)),
            amount: intent.amount || '0',
            token: intent.token || 'AlphaUSD',
            note: intent.note,
            indexId: indexCounter++,
        }));
        setLiveIntents(parsed);
        setAiPrompt(`[Extracted ${parsed.length} payment${parsed.length > 1 ? 's' : ''} from invoice. Review and Deploy.]`);
    }, []);

    // ==========================================
    // EXECUTION - PAYROLL (handles both standard and conditional)
    // ==========================================
    const executePayroll = useCallback(async () => {
        if (liveIntents.length === 0) return;
        setIsDeployingAnimation(true);

        // Build recipients array (shared by both modes)
        const recipients = liveIntents.map(intent => {
            let finalName = intent.name;
            if (intent.isRawWallet) {
                const typedAlias = walletAliases[intent.wallet];
                finalName = (typedAlias && typedAlias.trim() !== '') ? typedAlias.trim() : 'Unknown Entity';
            }
            return {
                name: finalName,
                wallet: intent.wallet,
                amount: intent.amount,
                token: intent.token || 'AlphaUSD',
                note: cardNotes[intent.indexId] || intent.note || 'Neural Terminal Disbursal',
            };
        });

        try {
            // ⚡ CONDITIONAL MODE: If conditions are set, create a ConditionalRule
            if (conditions.length > 0) {
                const conditionLabel = conditions.map(c => {
                    const typeLabel = c.type.replace(/_/g, ' ');
                    return `${typeLabel} ${c.param} ${c.operator} ${c.value}`;
                }).join(` ${conditionLogic} `);

                await fetch('/api/conditional-payroll', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: `Conditional: ${conditionLabel}`,
                        recipients,
                        conditions: conditions.map(c => ({
                            type: c.type,
                            param: c.param,
                            operator: c.operator,
                            value: c.value,
                        })),
                        conditionLogic,
                    })
                });

                showToast('success', `⚡ Conditional rule deployed! Agent is monitoring ${conditions.length} condition${conditions.length > 1 ? 's' : ''}.`);
                resetTerminal(true);
                await fetchData();
            } else {
                // STANDARD MODE: Push directly to Boardroom
                for (const r of recipients) {
                    await fetch('/api/employees', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(r)
                    });
                }
                showToast('success', 'Payloads queued in Boardroom!');
                resetTerminal(true);
                await fetchData();
                setTimeout(() => boardroomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
        } catch (error) {
            showToast('error', conditions.length > 0 ? 'Failed to deploy conditional rule.' : 'Failed to push to queue.');
        }
        setIsDeployingAnimation(false);
    }, [liveIntents, walletAliases, cardNotes, conditions, conditionLogic, showToast, resetTerminal, fetchData, boardroomRef]);

    // ==========================================
    // EXECUTION - A2A MARKETPLACE
    // ==========================================
    const handleDiscoverAgents = useCallback(() => {
        if (!aiPrompt.trim() || aiPrompt.trim().length < 3) return;
        marketplace.discover(aiPrompt.trim());
    }, [aiPrompt, marketplace]);

    const handleConfirmDeal = useCallback(async () => {
        if (isConfirmingDeal) return;
        setIsConfirmingDeal(true);
        try {
            const demoWallet = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            await marketplace.confirmDeal(demoWallet, aiPrompt);
            await fetchData();
            showToast('success', 'Agent contract queued in Escrow!');
            setTimeout(() => boardroomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        } catch (err: any) {
            showToast('error', err.message || 'Failed to confirm deal');
        } finally {
            setIsConfirmingDeal(false);
        }
    }, [marketplace, aiPrompt, fetchData, showToast, boardroomRef, isConfirmingDeal]);

    const handleRejectDeal = useCallback(() => {
        marketplace.rejectDeal();
    }, [marketplace]);

    // ==========================================
    // KEYBOARD & DRAG/DROP
    // ==========================================
    const handleKeyDownToDeploy = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (activeTab === 'payroll') {
                if (liveIntents.length > 0 && !isDeployingAnimation) executePayroll();
            } else {
                // A2A tab: discover agents on Enter (from idle or browsing)
                if (aiPrompt.trim().length >= 3 && (marketplace.phase === 'idle' || marketplace.phase === 'browsing')) {
                    handleDiscoverAgents();
                }
            }
        }
    }, [activeTab, liveIntents, isDeployingAnimation, aiPrompt, marketplace.phase, executePayroll, handleDiscoverAgents]);

    const handleTerminalDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingTerminal(true); }, []);
    const handleTerminalDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingTerminal(false); }, []);
    const handleTerminalDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDraggingTerminal(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) processCSV(e.dataTransfer.files[0]);
    }, [processCSV]);

    // ==========================================
    // COMPUTED (memoized)
    // ==========================================
    const isPayroll = activeTab === 'payroll';
    const isA2aActive = marketplace.phase !== 'idle' && marketplace.phase !== 'browsing';

    const themeGlow = useMemo(() =>
        isDraggingTerminal ? 'from-indigo-500/80 via-blue-500/60 to-cyan-500/80 scale-[1.01]'
            : isPayroll ? (globalMode === 'autopilot' ? 'from-fuchsia-500/50 via-purple-500/30 to-fuchsia-500/50' : globalMode === 'shield' ? 'from-purple-500/50 via-indigo-500/30 to-purple-500/50' : 'from-emerald-500/50 via-teal-500/30 to-indigo-500/50')
            : 'from-indigo-500/50 via-purple-500/30 to-indigo-500/50',
        [isDraggingTerminal, isPayroll, globalMode]);

    const themeBorder = useMemo(() =>
        isPayroll ? (globalMode === 'autopilot' ? 'border-fuchsia-400/80' : globalMode === 'shield' ? 'border-purple-400/80' : 'border-emerald-400/80') : 'border-indigo-400/80',
        [isPayroll, globalMode]);

    const textTheme = isPayroll ? 'text-emerald-400' : 'text-indigo-400';
    const hasReadyIntents = liveIntents.length > 0 && liveIntents.every(i => (i.name !== '...' || i.isRawWallet) && i.amount !== '...');
    const hasConditions = conditions.length > 0;

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <>
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .shimmer-text {
                    background: linear-gradient(90deg, #6ee7b7 0%, #ffffff 50%, #6ee7b7 100%);
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: shimmer 3s linear infinite;
                }
            `}</style>

            {mounted && (
                <>
                    <CsvUploadModal
                        showCsvModal={showCsvModal}
                        setShowCsvModal={setShowCsvModal}
                        dontShowCsvGuide={dontShowCsvGuide}
                        setDontShowCsvGuide={setDontShowCsvGuide}
                        handleProceedUpload={handleProceedUpload}
                    />
                    <InvoiceUploadModal
                        isOpen={showInvoiceModal}
                        onClose={() => setShowInvoiceModal(false)}
                        onParsed={handleInvoiceParsed}
                        showToast={showToast}
                    />
                </>
            )}

            <div className="mb-10 relative z-[20] animate-in fade-in slide-in-from-top-4 duration-700">
                <div className={`bg-[#0A0D14]/90 rounded-3xl backdrop-blur-3xl relative overflow-visible group transition-all duration-700 ${isDeployingAnimation ? 'scale-[0.98] blur-[1px]' : ''}`} onDragOver={handleTerminalDragOver} onDragLeave={handleTerminalDragLeave} onDrop={handleTerminalDrop}>

                    <div className={`absolute -inset-[1px] bg-gradient-to-r ${themeGlow} rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none transition-all duration-700`}></div>
                    <div className={`absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 ${themeBorder} rounded-tl-xl z-10 pointer-events-none`}></div>
                    <div className={`absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 ${themeBorder} rounded-br-xl z-10 pointer-events-none`}></div>
                    <div className={`absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 ${themeBorder} rounded-tr-xl z-10 pointer-events-none`}></div>
                    <div className={`absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 ${themeBorder} rounded-bl-xl z-10 pointer-events-none`}></div>

                    <div className="p-6 md:p-8 flex flex-col border border-white/5 rounded-3xl relative z-10 bg-[#0B0F17]/90 shadow-inner">

                        {/* Header */}
                        <div className="flex flex-wrap justify-between items-center mb-6 gap-4 border-b border-white/[0.05] pb-4">
                            <div className="flex flex-col gap-1">
                                <span className={`text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 transition-colors duration-700 ${textTheme}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isPayroll ? 'bg-emerald-400' : 'bg-indigo-400'}`}></span>
                                    {isPayroll ? 'Neural Terminal Online' : 'Agent Marketplace Engine'}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">
                                    {isPayroll ? 'Type naturally or ask a question. We parse the intent.' : 'Describe your task. AI discovers the best agent.'}
                                </span>
                            </div>

                            <div className="flex bg-[#030407]/80 border border-white/10 rounded-2xl p-1.5 z-20 gap-1.5">
                                <button
                                    onClick={() => { setActiveTab('payroll'); resetTerminal(true); }}
                                    className={`relative px-5 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col items-start gap-0.5 min-w-[160px] ${
                                        isPayroll
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <CommandLineIcon className="w-4 h-4"/>
                                        <span>Mass Disbursal</span>
                                    </div>
                                    <span className={`text-[9px] font-normal pl-6 ${isPayroll ? 'text-emerald-500/50' : 'text-slate-600'}`}>
                                        AI-powered payments
                                    </span>
                                    {isPayroll && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                                </button>
                                <button
                                    onClick={() => { setActiveTab('a2a'); resetTerminal(true); }}
                                    className={`relative px-5 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col items-start gap-0.5 min-w-[160px] ${
                                        !isPayroll
                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_12px_rgba(79,70,229,0.1)]'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <CpuChipIcon className="w-4 h-4"/>
                                        <span>Agent Marketplace</span>
                                    </div>
                                    <span className={`text-[9px] font-normal pl-6 ${!isPayroll ? 'text-indigo-500/50' : 'text-slate-600'}`}>
                                        Hire AI agents (A2A)
                                    </span>
                                    {!isPayroll && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>}
                                </button>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="flex items-start gap-4 w-full relative">
                            <span className={`font-mono font-black text-2xl mt-0.5 shrink-0 transition-colors duration-700 ${chatAnswer ? 'text-indigo-500' : isPayroll ? 'text-emerald-500' : 'text-indigo-500'}`}>{'❯'}</span>
                            <div className="relative w-full min-h-[80px]">
                                {!aiPrompt && (
                                    <div className="absolute top-1 left-0 pointer-events-none opacity-40 flex flex-col gap-3">
                                        <span className="text-slate-300 font-sans text-xl font-medium tracking-wide">
                                            {isPayroll ? 'Command me, or ask: "Who got paid the most?"' : 'e.g. "Audit my Solidity contract for reentrancy bugs"'}
                                        </span>
                                    </div>
                                )}
                                <textarea
                                    ref={inputRef} autoFocus value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyDown={handleKeyDownToDeploy}
                                    disabled={isA2aActive && !isPayroll}
                                    className="relative z-10 text-white caret-emerald-400 font-sans text-lg font-medium leading-relaxed tracking-wide whitespace-pre-wrap break-all w-full h-full p-0 m-0 outline-none border-none bg-transparent resize-none scrollbar-hide"
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* Chat Answer (Payroll) */}
                        {chatAnswer && (
                            <div className="mt-4 p-5 rounded-2xl bg-indigo-900/10 border border-indigo-500/30 backdrop-blur-xl animate-in fade-in slide-in-from-top-4">
                                <div className="text-slate-200 font-sans text-lg leading-relaxed whitespace-pre-wrap">{chatAnswer}</div>
                            </div>
                        )}

                        {/* Condition Builder (Payroll only) */}
                        {isPayroll && showConditionBuilder && (
                            <ConditionBuilder
                                conditions={conditions}
                                setConditions={setConditions}
                                conditionLogic={conditionLogic}
                                setConditionLogic={setConditionLogic}
                                onClose={() => { setShowConditionBuilder(false); setConditions([]); setConditionLogic('AND'); }}
                            />
                        )}

                        {/* Intent Cards (Payroll only) */}
                        {isPayroll && (
                            <IntentCards
                                liveIntents={liveIntents}
                                chatAnswer={chatAnswer}
                                walletAliases={walletAliases}
                                lockedAliases={lockedAliases}
                                cardNotes={cardNotes}
                                handleAliasChange={handleAliasChange}
                                handleAliasLock={handleAliasLock}
                                handleAliasKeyDown={handleAliasKeyDown}
                                handleNoteChange={handleNoteChange}
                            />
                        )}

                        {/* A2A: Suggested Prompts (show when browsing + empty input) */}
                        {!isPayroll && marketplace.phase === 'browsing' && !aiPrompt.trim() && (
                            <SuggestedPrompts onSelect={(text) => setAiPrompt(text)} />
                        )}

                        {/* A2A: Marketplace Panel (Browse / Discovery / Results) */}
                        {!isPayroll && (
                            <MarketplacePanel
                                phase={marketplace.phase}
                                matchedAgents={marketplace.matchedAgents}
                                allAgents={marketplace.allAgents}
                                activeCategory={marketplace.activeCategory}
                                isBrowseLoading={marketplace.isBrowseLoading}
                                onHireAgent={marketplace.selectAgent}
                                onFilterCategory={marketplace.filterByCategory}
                                error={marketplace.error}
                            />
                        )}

                        {/* A2A: Negotiation Log */}
                        {!isPayroll && (marketplace.phase === 'negotiating' || marketplace.phase === 'confirming') && marketplace.negotiationLogs.length > 0 && (
                            <NegotiationLog
                                logs={marketplace.negotiationLogs}
                                budget={String(marketplace.suggestedBudget)}
                                finalPrice={marketplace.negotiation ? String(marketplace.negotiation.finalPrice.toFixed(2)) : undefined}
                                fee={marketplace.negotiation ? String(marketplace.negotiation.platformFee.toFixed(2)) : undefined}
                                token="AlphaUSD"
                            />
                        )}

                        {/* A2A: Deal Confirmation */}
                        {!isPayroll && marketplace.phase === 'confirming' && (
                            <DealConfirmation
                                negotiation={marketplace.negotiation}
                                selectedAgent={marketplace.selectedAgent}
                                onConfirm={handleConfirmDeal}
                                onReject={handleRejectDeal}
                                confirmationRef={confirmationRef}
                                isLoading={isConfirmingDeal}
                            />
                        )}

                        {/* A2A: Job Tracker (Executing / Completed / Failed) */}
                        {!isPayroll && (marketplace.phase === 'executing' || marketplace.phase === 'completed' || marketplace.phase === 'failed') && (
                            <JobTracker
                                phase={marketplace.phase}
                                job={marketplace.activeJob}
                                onExecute={marketplace.executeDeal}
                                onShowReview={() => setShowReviewModal(true)}
                                onReset={() => resetTerminal(false)}
                            />
                        )}

                        {/* Footer */}
                        <TerminalFooter
                            isPayroll={isPayroll}
                            isA2aActive={isA2aActive}
                            hasReadyIntents={hasReadyIntents}
                            handleUploadClick={handleUploadClick}
                            executePayroll={executePayroll}
                            handleDiscoverAgents={handleDiscoverAgents}
                            resetTerminal={() => resetTerminal(false)}
                            omniFileRef={omniFileRef}
                            processCSV={processCSV}
                            aiPrompt={aiPrompt}
                            onInvoiceClick={() => setShowInvoiceModal(true)}
                            showConditionBuilder={showConditionBuilder}
                            onToggleConditions={() => {
                                if (showConditionBuilder) {
                                    setShowConditionBuilder(false);
                                    setConditions([]);
                                    setConditionLogic('AND');
                                } else {
                                    setShowConditionBuilder(true);
                                    if (conditions.length === 0) {
                                        setConditions([{
                                            id: crypto.randomUUID(),
                                            type: 'price_feed',
                                            param: '',
                                            operator: '>=',
                                            value: '',
                                        }]);
                                    }
                                }
                            }}
                            hasConditions={hasConditions}
                        />
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {showReviewModal && marketplace.activeJob && marketplace.selectedAgent && (
                <ReviewModal
                    isOpen={showReviewModal}
                    agentName={marketplace.selectedAgent.agent.name}
                    jobId={marketplace.activeJob.id}
                    agentId={marketplace.selectedAgent.agent.id}
                    onClose={() => setShowReviewModal(false)}
                    onSubmitted={() => {
                        showToast('success', 'Review submitted successfully!');
                        setShowReviewModal(false);
                    }}
                />
            )}
        </>
    );
}

export default React.memo(OmniTerminal);
