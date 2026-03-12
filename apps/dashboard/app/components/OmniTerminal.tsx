'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CommandLineIcon, CpuChipIcon } from '@/app/components/icons';
import NegotiationLog from './NegotiationLog';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAgentMarketplace } from '../hooks/useAgentMarketplace';
import { useA2AOrchestration } from '../hooks/useA2AOrchestration';

// Sub-components
import CsvUploadModal from './omni/CsvUploadModal';
import IntentCards from './omni/IntentCards';
import MarketplacePanel from './omni/MarketplacePanel';
import DealConfirmation from './omni/DealConfirmation';
import TaskPromptPanel from './omni/TaskPromptPanel';
import JobTracker from './omni/JobTracker';
import ReviewModal from './omni/ReviewModal';
import TerminalFooter from './omni/TerminalFooter';
import ConditionBuilder from './omni/ConditionBuilder';
import InvoiceUploadModal from './omni/InvoiceUploadModal';
import SuggestedPrompts from './omni/SuggestedPrompts';
import AgentDetailModal from './omni/AgentDetailModal';
import A2AChainViewer from './omni/A2AChainViewer';
import type { ParsedIntent } from './omni/types';
import type { Condition } from './omni/ConditionBuilder';
import type { DiscoveredAgent } from '../hooks/useAgentMarketplace';

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
    walletAddress?: string | null;
    onOpenChat?: (jobId: string) => void;
}

function OmniTerminal({ SUPPORTED_TOKENS, contacts, showToast, fetchData, boardroomRef, autopilotRef, history, walletAddress, onOpenChat }: OmniTerminalProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [activeTab, setActiveTab] = useState<'payroll' | 'a2a'>('payroll');

    // Shared UI state
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiParsing, setIsAiParsing] = useState(false);
    const [globalMode, setGlobalMode] = useState<'standard' | 'autopilot' | 'shield'>('standard');
    const [liveIntents, setLiveIntents] = useState<ParsedIntent[]>([]);
    const [chatAnswer, setChatAnswer] = useState<string | null>(null);
    const [guideData, setGuideData] = useState<{ title: string; steps: { icon: string; text: string; action: { type: string; target: string } | null }[]; tip: string | null } | null>(null);
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
    const [recurringMode, setRecurringMode] = useState<'once' | 'weekly' | 'monthly'>('once');

    // Invoice-to-Pay state
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    // Agent Marketplace hook
    const marketplace = useAgentMarketplace();
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isConfirmingDeal, setIsConfirmingDeal] = useState(false);
    const [detailAgent, setDetailAgent] = useState<DiscoveredAgent | null>(null);

    // A2A Orchestration hook
    const orchestration = useA2AOrchestration();
    const isOrchestrationActive = orchestration.phase !== 'idle';

    // Complex task detection: auto-detect multi-agent tasks
    const isComplexTask = useMemo(() => {
        if (marketplace.phase !== 'results' || marketplace.matchedAgents.length < 2) return false;
        const prompt = aiPrompt.toLowerCase().trim();
        if (!prompt) return false;

        // Check 1: Multiple distinct agent categories matched
        const categories = new Set(marketplace.matchedAgents.map(a => a.agent.category));
        if (categories.size >= 2) return true;

        // Check 2: Compound task connectives in prompt
        const compoundPatterns = [
            /\b(?:and|with|then|plus|also)\b.*\b(?:audit|build|deploy|analyze|scan|check|create|generate|review|test|monitor|optimize)\b/i,
            /\b(?:audit|build|deploy|analyze|scan|check|create|generate|review|test|monitor|optimize)\b.*\b(?:and|with|then|plus|also)\b/i,
        ];
        if (compoundPatterns.some(p => p.test(prompt))) return true;

        // Check 3: Multiple explicit action verbs
        const actions = ['audit', 'build', 'deploy', 'analyze', 'scan', 'check', 'create', 'generate', 'review', 'test', 'monitor', 'optimize', 'detect', 'verify', 'assess', 'migrate', 'setup', 'configure'];
        const actionCount = actions.filter(a => prompt.includes(a)).length;
        if (actionCount >= 2) return true;

        return false;
    }, [marketplace.phase, marketplace.matchedAgents, aiPrompt]);

    // Refs
    const omniFileRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const confirmationRef = useRef<HTMLDivElement>(null);
    const orchestrationRef = useRef<HTMLDivElement>(null);

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

    // Auto-scroll to orchestration panel when plan is ready for review
    useEffect(() => {
        if ((orchestration.phase === 'reviewing' || orchestration.phase === 'decomposing') && orchestrationRef.current) {
            setTimeout(() => orchestrationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        }
    }, [orchestration.phase]);

    // Auto-trigger browse mode when switching to A2A tab
    useEffect(() => {
        if (activeTab === 'a2a' && marketplace.phase === 'idle') {
            marketplace.startBrowsing();
        }
    }, [activeTab, marketplace.phase, marketplace.startBrowsing]);

    // Clear stale errors when user types a new prompt in A2A mode
    useEffect(() => {
        if (activeTab !== 'a2a') return;
        // Clear marketplace errors so they don't persist while typing
        marketplace.clearError();
        // Reset failed orchestration state when user modifies their prompt
        if (orchestration.phase === 'failed') {
            orchestration.cancelPlan();
        }
    }, [aiPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

    // Listen for external "hire agent" events (e.g. from AgentEarnings)
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ agent: DiscoveredAgent; task: string }>).detail;
            if (detail?.agent && detail?.task) {
                setActiveTab('a2a');
                marketplace.selectAgent(detail.agent);
                // selectAgent sets phase='task_input', then submitTaskAndNegotiate starts negotiation
                setTimeout(() => marketplace.submitTaskAndNegotiate(detail.task), 50);
            }
        };
        window.addEventListener('paypol:hireAgent', handler);
        return () => window.removeEventListener('paypol:hireAgent', handler);
    }, [marketplace.selectAgent, marketplace.submitTaskAndNegotiate]);

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

    const handleWalletAssign = useCallback((indexId: number, wallet: string) =>
        setLiveIntents(prev => prev.map(i => i.indexId === indexId ? { ...i, wallet } : i)), []);

    const resetTerminal = useCallback((preventFocus = false) => {
        marketplace.reset();
        orchestration.cancelPlan();
        setShowReviewModal(false);
        setIsDeployingAnimation(false);
        setAiPrompt(''); setLiveIntents([]); setChatAnswer(null); setGuideData(null);
        setWalletAliases({}); setLockedAliases(new Set()); setCardNotes({});
        setShowConditionBuilder(false); setConditions([]); setConditionLogic('AND'); setRecurringMode('once');
        if (!preventFocus) setTimeout(() => inputRef.current?.focus(), 50);
    }, [marketplace, orchestration]);

    // ==========================================
    // AI PARSING (Payroll tab only)
    // ==========================================
    const debouncedPrompt = useDebouncedValue(aiPrompt, 500);

    useEffect(() => {
        if (!debouncedPrompt.trim()) {
            setLiveIntents([]); setChatAnswer(null); setGuideData(null); setGlobalMode('standard'); setIsAiParsing(false); return;
        }
        if (debouncedPrompt.trim().startsWith('[')) return;

        // A2A tab: only use Copilot for GUIDE/CHAT, skip ACTION parsing (marketplace handles tasks on Enter)
        const isA2aTab = activeTab === 'a2a';

        let currentMode: 'standard' | 'autopilot' | 'shield' = 'standard';
        if (!isA2aTab) {
            if (/\/(autopilot|recurring)/i.test(debouncedPrompt)) currentMode = 'autopilot';
            if (/\/(shield|zk|private)/i.test(debouncedPrompt)) currentMode = 'shield';
        }
        setGlobalMode(currentMode);

        let cancelled = false;
        const abortController = new AbortController();
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
                    }),
                    signal: abortController.signal,
                });
                if (cancelled) return;
                if (!response.ok) throw new Error('AI parsing failed');

                const data = await response.json();

                if (data.actionType === 'GUIDE') {
                    setChatAnswer(null); setLiveIntents([]); setGuideData(data);
                } else if (data.actionType === 'CHAT') {
                    setChatAnswer(data.answer); setLiveIntents([]); setGuideData(null);
                } else if (isA2aTab) {
                    // A2A tab: ACTION means it's a task for agents — clear copilot UI, let marketplace handle on Enter
                    setChatAnswer(null); setGuideData(null); setLiveIntents([]);
                } else {
                    setChatAnswer(null); setGuideData(null);
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
                                // Only mark as 'Unknown Entity' if the name is exactly 'Unknown' or is a raw hex address
                                if (finalName === 'Unknown' || /^0x[a-fA-F0-9]{6,}$/i.test(finalName)) finalName = 'Unknown Entity';
                                finalParsed.push({ name: finalName, wallet: resolvedWallet, isRawWallet: isRaw, amount: intent.amount || '0', token: intent.token || 'AlphaUSD', schedule: intent.schedule, timelock: intent.timelock, note: intent.note, indexId: indexCounter++ });
                            }
                        });
                        setLiveIntents(finalParsed);

                        // Auto-detect scheduling/conditional from AI response
                        if (data.scheduling && data.scheduling.conditions && data.scheduling.conditions.length > 0) {
                            const aiConditions: Condition[] = data.scheduling.conditions.map((c: any) => ({
                                id: crypto.randomUUID(),
                                type: c.type || 'date_time',
                                param: c.param || '',
                                operator: c.operator || '>=',
                                value: c.value || '',
                            }));
                            setConditions(aiConditions);
                            setConditionLogic(data.scheduling.conditionLogic || 'AND');
                            setShowConditionBuilder(true);

                            // Set recurring mode
                            const recur = data.scheduling.recurring;
                            if (recur === 'monthly') setRecurringMode('monthly');
                            else if (recur === 'weekly') setRecurringMode('weekly');
                            else setRecurringMode('once');

                            // Notify user about auto-detected scheduling
                            const freqLabel = recur === 'monthly' ? 'Monthly' : recur === 'weekly' ? 'Weekly' : 'Scheduled';
                            showToast('success', `⚡ ${freqLabel} payment detected! Review conditions below, then press Enter or click "Deploy Conditional".`);
                        }
                    } else { setLiveIntents([]); }
                }
            } catch (error) { console.error("AI Parsing Error:", error); if (!cancelled && !isA2aTab) showToast('error', 'Failed to parse intent. Try again.'); } finally { if (!cancelled) setIsAiParsing(false); }
        })();

        return () => { cancelled = true; abortController.abort(); };
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
        // Validate file type
        const validExtensions = ['.csv', '.txt', '.xls', '.xlsx'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!validExtensions.includes(ext)) {
            showToast('error', `Unsupported file format "${ext}". Please use CSV, TXT, XLS, or XLSX files.`);
            resetFileUI();
            return;
        }

        const isExcel = ext === '.xls' || ext === '.xlsx';

        // Helper: send text to AI parse and process results
        const parseAndProcess = async (csvText: string) => {
            if (!csvText || !csvText.trim()) { resetFileUI(); return showToast('error', "File is empty or could not be read."); }
            setIsAiParsing(true); setAiPrompt(`[AI is analyzing data file: ${file.name}...]`);
            try {
                const { SUPPORTED_TOKENS: currentTokens, contacts: currentContacts } = latestDataRef.current;
                const safeContacts = currentContacts.length > 0 ? currentContacts : [{ name: 'Tony', wallet: '0xe89b...' }];
                const response = await fetch('/api/ai-parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `Extract payroll intents. Each row should have: name, wallet (0x address), amount, token, note.\nRaw Data:\n${csvText}`, supportedTokens: currentTokens.map((t: any) => t.symbol), addressBook: safeContacts.map(c => c.name) }) });
                if (!response.ok) throw new Error('File parsing failed');
                const data = await response.json();
                if (data.intents && data.intents.length > 0) {
                    let finalParsed: ParsedIntent[] = []; let indexCounter = 0;
                    data.intents.forEach((intent: any) => {
                        let resolvedWallet = '0x00...00'; let isRaw = false;
                        let finalName = intent.name || 'Unknown Entity';
                        // Priority 1: AI extracted a valid wallet address
                        if (intent.wallet && /^0x[a-fA-F0-9]{40}$/i.test(intent.wallet.trim())) {
                            resolvedWallet = intent.wallet.trim(); isRaw = true;
                        }
                        // Priority 2: Name field is actually a wallet address
                        else if (finalName && /^0x[a-fA-F0-9]{40}$/i.test(finalName.trim())) {
                            resolvedWallet = finalName; isRaw = true;
                        }
                        // Priority 3: Match name to known contacts
                        else if (finalName) {
                            const foundContact = safeContacts.find(c => c.name.toLowerCase() === finalName.toLowerCase());
                            if (foundContact) resolvedWallet = foundContact.wallet;
                        }
                        if (finalName === 'Unknown' || /^0x[a-fA-F0-9]{6,}$/i.test(finalName)) finalName = 'Unknown Entity';
                        finalParsed.push({ name: finalName, wallet: resolvedWallet, isRawWallet: isRaw, amount: intent.amount || '0', token: intent.token || 'AlphaUSD', note: intent.note, indexId: indexCounter++ });
                    });
                    setLiveIntents(finalParsed);
                    const resolvedCount = finalParsed.filter(i => i.wallet !== '0x00...00').length;
                    setAiPrompt(`[Extracted ${finalParsed.length} recipients from ${file.name}. ${resolvedCount}/${finalParsed.length} wallets resolved. Review and Deploy.]`);
                } else { showToast('error', "Could not extract payment data from this file. Make sure it has Name, Wallet, Amount columns."); setAiPrompt(''); }
            } catch (error: any) {
                showToast('error', `Failed to parse ${file.name}: ${error.message || 'Unknown error'}`);
                setAiPrompt('');
            } finally { setIsAiParsing(false); resetFileUI(); }
        };

        if (isExcel) {
            // Excel files: read as ArrayBuffer → convert to CSV via xlsx library
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const XLSX = (await import('xlsx')).default;
                    const workbook = XLSX.read(e.target?.result, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const csvText = XLSX.utils.sheet_to_csv(firstSheet);
                    await parseAndProcess(csvText);
                } catch (err: any) {
                    showToast('error', `Failed to read Excel file: ${err.message || 'Unknown error'}`);
                    resetFileUI();
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            // CSV/TXT files: read as text directly
            const reader = new FileReader();
            reader.onload = async (e) => {
                await parseAndProcess(e.target?.result as string);
            };
            reader.readAsText(file);
        }
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
    // Delete individual intent
    const handleDeleteIntent = useCallback((indexId: number) => {
        setLiveIntents(prev => {
            const updated = prev.filter(i => i.indexId !== indexId);
            if (updated.length === 0) setAiPrompt('');
            return updated;
        });
    }, []);

    // Calculate total for display
    const totalPayrollAmount = liveIntents.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

    const executePayroll = useCallback(async () => {
        if (liveIntents.length === 0) return;

        // Validate wallet addresses
        const unresolvedIntents = liveIntents.filter(i => !i.wallet || i.wallet === '0x00...00' || !/^0x[a-fA-F0-9]{40}$/i.test(i.wallet));
        if (unresolvedIntents.length > 0) {
            const names = unresolvedIntents.map(i => i.name).join(', ');
            showToast('error', `Cannot deploy: ${names} ${unresolvedIntents.length === 1 ? 'has' : 'have'} no valid wallet address. Assign a wallet first.`);
            return;
        }

        // Validate amounts (must be > 0)
        const invalidAmounts = liveIntents.filter(i => !i.amount || parseFloat(i.amount) <= 0);
        if (invalidAmounts.length > 0) {
            const names = invalidAmounts.map(i => i.name).join(', ');
            showToast('error', `Invalid amount for: ${names}. Amount must be greater than 0.`);
            return;
        }

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
            // CONDITIONAL MODE: If conditions are set, create a ConditionalRule
            if (conditions.length > 0) {
                // Validate: all conditions must have param and value filled
                const incompleteConditions = conditions.filter(c => !c.param.trim() || (!c.value.trim() && c.type !== 'webhook'));
                if (incompleteConditions.length > 0) {
                    showToast('error', `Incomplete condition${incompleteConditions.length > 1 ? 's' : ''}: Please fill in all condition fields before deploying.`);
                    setIsDeployingAnimation(false);
                    return;
                }

                const conditionLabel = conditions.map(c => {
                    const typeLabel = c.type.replace(/_/g, ' ');
                    return `${typeLabel} ${c.param} ${c.operator} ${c.value}`;
                }).join(` ${conditionLogic} `);

                // Compute recurring parameters from recurringMode
                const recurringParams = recurringMode === 'weekly'
                    ? { maxTriggers: -1, cooldownMinutes: 10080 }   // 7 * 24 * 60
                    : recurringMode === 'monthly'
                        ? { maxTriggers: -1, cooldownMinutes: 43200 }  // 30 * 24 * 60
                        : { maxTriggers: 1, cooldownMinutes: 0 };      // one-time

                const condRes = await fetch('/api/conditional-payroll', {
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
                        maxTriggers: recurringParams.maxTriggers,
                        cooldownMinutes: recurringParams.cooldownMinutes,
                    })
                });
                if (!condRes.ok) throw new Error('Failed to deploy conditional rule.');

                const freqLabel = recurringMode === 'monthly' ? ' (Monthly)' : recurringMode === 'weekly' ? ' (Weekly)' : '';
                showToast('success', `Conditional rule deployed${freqLabel}! Agent is monitoring ${conditions.length} condition${conditions.length > 1 ? 's' : ''}.`);
                resetTerminal(true);
                await fetchData();
            } else {
                // STANDARD MODE: Send all intents as a batch to Boardroom
                const empRes = await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ intents: recipients })
                });
                if (!empRes.ok) {
                    const errData = await empRes.json().catch(() => ({}));
                    throw new Error(errData.error || 'Failed to queue payloads');
                }
                showToast('success', `${recipients.length} payload${recipients.length > 1 ? 's' : ''} queued in Boardroom! Total: ${totalPayrollAmount.toFixed(2)} AlphaUSD`);
                resetTerminal(true);
                await fetchData();
                setTimeout(() => boardroomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
        } catch (error: any) {
            showToast('error', error.message || (conditions.length > 0 ? 'Failed to deploy conditional rule.' : 'Failed to push to queue.'));
        }
        setIsDeployingAnimation(false);
    }, [liveIntents, walletAliases, cardNotes, conditions, conditionLogic, showToast, resetTerminal, fetchData, boardroomRef, totalPayrollAmount]);

    // ==========================================
    // EXECUTION - A2A MARKETPLACE
    // ==========================================
    const handleDiscoverAgents = useCallback(() => {
        if (!aiPrompt.trim() || aiPrompt.trim().length < 3) return;
        // Reset any previous orchestration state before new discover
        if (orchestration.phase !== 'idle') orchestration.cancelPlan();
        marketplace.discover(aiPrompt.trim());
    }, [aiPrompt, marketplace, orchestration]);

    // A2A Orchestration: multi-agent complex task
    const handleOrchestrate = useCallback(() => {
        if (!aiPrompt.trim() || aiPrompt.trim().length < 3) return;
        // Use connected wallet or fallback placeholder (wallet only needed at execution)
        const wallet = walletAddress || '0x0000000000000000000000000000000000000000';
        const defaultBudget = 500;
        orchestration.orchestrate(aiPrompt.trim(), defaultBudget, wallet);
    }, [aiPrompt, walletAddress, orchestration]);

    const handleConfirmOrchestration = useCallback(async () => {
        try {
            await orchestration.confirmExecution();
            showToast('success', 'Orchestration started — agents are executing your plan.');
        } catch (err: any) {
            showToast('error', err.message || 'Failed to start orchestration.');
        }
    }, [orchestration, showToast]);

    const handleConfirmDeal = useCallback(async (options?: { skipEscrow?: boolean }) => {
        if (isConfirmingDeal) return;
        if (!walletAddress) {
            showToast('error', 'Connect your wallet first.');
            return;
        }
        setIsConfirmingDeal(true);
        try {
            // Use real wallet address instead of random demo wallet
            // Priority: aiPrompt (discover flow) → marketplace.taskPrompt (browse hire flow) → agent description fallback
            const taskPrompt = aiPrompt.trim() || marketplace.taskPrompt || marketplace.selectedAgent?.agent.description || 'Agent task via marketplace';
            const result = await marketplace.confirmDeal(walletAddress, taskPrompt, options?.skipEscrow);
            await fetchData();

            if (options?.skipEscrow) {
                // Card payment: funds already handled, no Boardroom step needed
                showToast('success', 'Payment received — agent is starting your task!');
            } else if (result?.escrowQueued === false) {
                // Escrow queue failed — agent still executes but warn user
                showToast('error', 'Agent started but escrow queue failed. Check Boardroom manually or retry the payment.');
            } else {
                // Crypto: escrow queued in Boardroom, scroll to it
                showToast('success', 'Agent contract queued in Escrow!');
                setTimeout(() => boardroomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
        } catch (err: any) {
            showToast('error', err.message || 'Failed to confirm deal');
        } finally {
            setIsConfirmingDeal(false);
        }
    }, [marketplace, aiPrompt, walletAddress, fetchData, showToast, boardroomRef, isConfirmingDeal]);

    const handleRejectDeal = useCallback(() => {
        marketplace.rejectDeal();
    }, [marketplace]);

    // ==========================================
    // GUIDE ACTIONS (Copilot step buttons)
    // ==========================================
    const handleGuideAction = useCallback((action: { type: string; target: string }) => {
        switch (action.type) {
            case 'click':
                if (action.target === 'upload-ledger') handleUploadClick();
                if (action.target === 'upload-invoice') setShowInvoiceModal(true);
                break;
            case 'tab':
                setActiveTab(action.target as 'payroll' | 'a2a');
                resetTerminal(true);
                break;
            case 'type':
                setGuideData(null);
                setAiPrompt(action.target);
                setTimeout(() => inputRef.current?.focus(), 50);
                break;
            case 'scroll': {
                const sectionId = action.target === 'offramp' ? 'offramp-section'
                    : action.target === 'escrow' ? 'escrow-vault-section'
                    : action.target === 'settlement' ? 'settlement-section'
                    : action.target;
                const el = document.getElementById(sectionId);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                break;
            }
        }
    }, [handleUploadClick, resetTerminal]);

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
    const isA2aActive = (marketplace.phase !== 'idle' && marketplace.phase !== 'browsing') || isOrchestrationActive;

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

            <div className="mb-10 relative z-[20] animate-in fade-in slide-in-from-top-4 duration-700" data-section="omni-terminal">
                <div className={`rounded-2xl relative overflow-visible transition-all duration-500 ${isDeployingAnimation ? 'scale-[0.98] blur-[1px]' : ''} ${isDraggingTerminal ? 'ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-[#0C1017]' : ''}`} onDragOver={handleTerminalDragOver} onDragLeave={handleTerminalDragLeave} onDrop={handleTerminalDrop}>

                    <div className="p-4 sm:p-8 md:p-10 flex flex-col border border-white/[0.08] rounded-2xl bg-[#0C1017]">

                        {/* Header */}
                        <div className="flex flex-wrap justify-between items-center mb-6 sm:mb-8 gap-2 sm:gap-4 border-b border-white/[0.05] pb-5">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-white transition-colors duration-500">
                                    {isPayroll ? 'Mass Disbursal' : 'Agent Marketplace'}
                                </h2>
                                <span className="text-sm text-slate-500">
                                    {isPayroll ? 'Type naturally or ask a question — we parse the intent.' : 'Describe your task — AI discovers the best agent.'}
                                </span>
                            </div>

                            <div className="flex bg-white/[0.03] border border-white/[0.10] rounded-xl p-1 gap-1">
                                <button
                                    onClick={() => { setActiveTab('payroll'); resetTerminal(true); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                        isPayroll
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <CommandLineIcon className="w-4 h-4"/>
                                    Payroll
                                </button>
                                <button
                                    onClick={() => { setActiveTab('a2a'); resetTerminal(true); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                        !isPayroll
                                            ? 'bg-indigo-500/10 text-indigo-400'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <CpuChipIcon className="w-4 h-4"/>
                                    Agents
                                </button>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="flex items-start gap-4 w-full relative">
                            <span className={`font-mono font-black text-2xl sm:text-3xl mt-0.5 shrink-0 transition-colors duration-500 ${chatAnswer ? 'text-indigo-500' : isPayroll ? 'text-emerald-500' : 'text-indigo-500'}`}>{'❯'}</span>
                            <div className="relative w-full min-h-[120px]">
                                {!aiPrompt && (
                                    <div className="absolute top-1.5 left-0 pointer-events-none opacity-35">
                                        <span className="text-slate-300 font-sans text-xl font-medium tracking-wide">
                                            {isPayroll ? 'Try: "Pay Alice 500 AlphaUSD" or "Pay Alice 100 and Bob 200 AlphaUSD"' : 'e.g. "Audit my Solidity contract for reentrancy bugs"'}
                                        </span>
                                    </div>
                                )}
                                <textarea
                                    ref={inputRef} autoFocus value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyDown={handleKeyDownToDeploy}
                                    disabled={isA2aActive && !isPayroll}
                                    className={`relative z-10 text-white caret-emerald-400 font-sans text-xl font-medium leading-relaxed tracking-wide whitespace-pre-wrap break-words w-full h-full p-0 m-0 outline-none border-none bg-transparent resize-none scrollbar-hide ${isA2aActive && !isPayroll ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* Chat Answer (Payroll) */}
                        {chatAnswer && (
                            <div className="mt-4 p-5 rounded-2xl border border-indigo-500/30 animate-in fade-in slide-in-from-top-4" style={{ background: 'radial-gradient(ellipse at top, rgba(49,46,129,0.12) 0%, rgba(21,27,39,0.95) 100%)' }}>
                                <div className="text-slate-200 font-sans text-lg leading-relaxed whitespace-pre-wrap">{chatAnswer}</div>
                            </div>
                        )}

                        {/* Copilot Guide (structured step-by-step) */}
                        {guideData && (
                            <div className="mt-4 p-5 rounded-2xl border border-cyan-500/30 animate-in fade-in slide-in-from-top-4 duration-500" style={{ background: 'radial-gradient(ellipse at top, rgba(6,182,212,0.08) 0%, rgba(21,27,39,0.95) 100%)' }}>
                                <h3 className="text-cyan-400 font-bold text-sm mb-4 flex items-center gap-2 tracking-wide">
                                    <span className="w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[10px]">✦</span>
                                    {guideData.title}
                                </h3>
                                <div className="space-y-3">
                                    {guideData.steps.map((step, i) => (
                                        <div key={i} className="flex items-start gap-3 group/step">
                                            <span className="text-base shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">{step.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-300 text-sm leading-relaxed">{step.text}</p>
                                                {step.action && (
                                                    <button
                                                        onClick={() => handleGuideAction(step.action!)}
                                                        className="mt-1.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-400/50 px-3 py-1.5 rounded-lg transition-all duration-200 inline-flex items-center gap-1.5 tracking-wide"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                        {step.action.type === 'type' ? 'Try it' : step.action.type === 'click' ? 'Open' : step.action.type === 'tab' ? 'Switch' : 'Go'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {guideData.tip && (
                                    <div className="mt-4 pt-3 border-t border-cyan-500/10">
                                        <p className="text-[11px] text-slate-500 leading-relaxed"><span className="text-cyan-500/60 font-bold">TIP</span> — {guideData.tip}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Condition Builder (Payroll only) */}
                        {isPayroll && showConditionBuilder && (
                            <ConditionBuilder
                                conditions={conditions}
                                setConditions={setConditions}
                                conditionLogic={conditionLogic}
                                setConditionLogic={setConditionLogic}
                                recurringMode={recurringMode}
                                setRecurringMode={setRecurringMode}
                                onClose={() => { setShowConditionBuilder(false); setConditions([]); setConditionLogic('AND'); setRecurringMode('once'); }}
                            />
                        )}

                        {/* Intent Cards (Payroll only) */}
                        {isPayroll && (
                            <>
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
                                    handleWalletAssign={handleWalletAssign}
                                    handleDeleteIntent={handleDeleteIntent}
                                />

                                {/* Total Preview (shown when intents exist) */}
                                {liveIntents.length > 0 && !chatAnswer && (
                                    <div className="mt-1 flex items-center justify-between p-3 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl animate-in fade-in duration-300">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                                {liveIntents.length} recipient{liveIntents.length > 1 ? 's' : ''}
                                            </span>
                                            {liveIntents.some(i => !i.wallet || i.wallet === '0x00...00') && (
                                                <span className="text-[9px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                    {liveIntents.filter(i => !i.wallet || i.wallet === '0x00...00').length} wallet{liveIntents.filter(i => !i.wallet || i.wallet === '0x00...00').length > 1 ? 's' : ''} missing
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-bold font-mono text-emerald-400">
                                            {totalPayrollAmount.toFixed(2)} <span className="text-emerald-400/60 text-xs">AlphaUSD</span>
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Payroll: Suggested Prompts (show when empty input, no intents, no answer) */}
                        {isPayroll && !aiPrompt.trim() && liveIntents.length === 0 && !chatAnswer && !guideData && (
                            <SuggestedPrompts variant="payroll" onSelect={(text) => setAiPrompt(text)} />
                        )}

                        {/* A2A: Suggested Prompts (show when browsing + empty input) */}
                        {!isPayroll && marketplace.phase === 'browsing' && !aiPrompt.trim() && (
                            <SuggestedPrompts variant="agent" onSelect={(text) => setAiPrompt(text)} />
                        )}

                        {/* A2A: Marketplace Panel (Browse / Discovery / Results) */}
                        {!isPayroll && (
                            <MarketplacePanel
                                phase={marketplace.phase}
                                matchedAgents={marketplace.matchedAgents}
                                allAgents={marketplace.allAgents}
                                activeCategory={marketplace.activeCategory}
                                isBrowseLoading={marketplace.isBrowseLoading}
                                onHireAgent={setDetailAgent}
                                onFilterCategory={marketplace.filterByCategory}
                                error={marketplace.error}
                                isKeywordFallback={marketplace.isKeywordFallback}
                                onShowAgentDetail={setDetailAgent}
                                isComplexTask={isComplexTask}
                                onOrchestrate={handleOrchestrate}
                                isOrchestrating={orchestration.isLoading}
                            />
                        )}

                        {/* A2A: Task Prompt (Hire from browse → describe task first) */}
                        {!isPayroll && marketplace.phase === 'task_input' && marketplace.selectedAgent && (
                            <TaskPromptPanel
                                agent={marketplace.selectedAgent}
                                onSubmit={marketplace.submitTaskAndNegotiate}
                                onBack={marketplace.backToBrowse}
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
                                walletAddress={walletAddress}
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
                                onCancel={marketplace.cancelExecution}
                                onRetry={marketplace.executeDeal}
                                onOpenChat={onOpenChat}
                            />
                        )}

                        {/* A2A: Orchestration Chain Viewer (multi-agent tasks) */}
                        {!isPayroll && isOrchestrationActive && (
                            <div ref={orchestrationRef}>
                            <A2AChainViewer
                                plan={orchestration.plan}
                                chainStatus={orchestration.chainStatus}
                                phase={orchestration.phase}
                                stepLogs={orchestration.stepLogs}
                                onConfirm={orchestration.phase === 'reviewing' ? handleConfirmOrchestration : undefined}
                                onCancel={orchestration.cancelPlan}
                                onCancelExecution={orchestration.cancelExecution}
                                onRemoveStep={orchestration.removeStep}
                                onUpdateBudget={orchestration.updateStepBudget}
                                onUpdatePrompt={orchestration.updateStepPrompt}
                            />
                            </div>
                        )}

                        {/* A2A: Orchestrate Button (shown in browsing when prompt exists, no complex task banner) */}
                        {!isPayroll && !isOrchestrationActive && marketplace.phase === 'browsing' && aiPrompt.trim().length >= 3 && (
                            <div className="mt-3 flex items-center justify-end">
                                <button
                                    onClick={handleOrchestrate}
                                    disabled={orchestration.isLoading}
                                    className="px-4 py-2 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 hover:from-violet-500/20 hover:to-indigo-500/20 border border-violet-500/20 hover:border-violet-500/30 text-violet-400 text-[11px] font-bold rounded-xl transition-all duration-200 flex items-center gap-2"
                                >
                                    <CpuChipIcon className="w-3.5 h-3.5" />
                                    Orchestrate (Multi-Agent)
                                </button>
                            </div>
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
                                    setRecurringMode('once');
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
                            totalAmount={totalPayrollAmount}
                            intentCount={liveIntents.length}
                        />
                    </div>
                </div>
            </div>

            {/* Agent Detail Modal — unified with task input */}
            {detailAgent && (
                <AgentDetailModal
                    agent={detailAgent}
                    isOpen={!!detailAgent}
                    onClose={() => setDetailAgent(null)}
                    onSubmitTask={(agent, task) => {
                        setDetailAgent(null);
                        marketplace.selectAgent(agent);
                        // selectAgent sets phase='task_input', then submit starts negotiation
                        setTimeout(() => marketplace.submitTaskAndNegotiate(task), 50);
                    }}
                />
            )}

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
