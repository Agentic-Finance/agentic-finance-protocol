'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';

import { PAYPOL_NEXUS_ADDRESS, PAYPOL_MULTISEND_ADDRESS, PAYPOL_SHIELD_ADDRESS, PAYPOL_NEXUS_V2_ADDRESS, NEXUS_ABI, NEXUS_V2_ABI, ERC20_ABI, RPC_URL, SUPPORTED_TOKENS } from './lib/constants';

// Direct imports for critical above-the-fold components
import Navbar from './components/Navbar';
import TopStatsCards from './components/TopStatsCards';

// Lazy load heavy / conditionally-rendered components (Phase 3)
const LandingPage = lazy(() => import('./components/LandingPage'));
const GatewayScreen = lazy(() => import('./components/GatewayScreen'));
const OmniTerminal = lazy(() => import('./components/OmniTerminal'));
const NetworkChart = lazy(() => import('./components/NetworkChart'));
const Boardroom = lazy(() => import('./components/Boardroom'));
const ActiveAgents = lazy(() => import('./components/ActiveAgents'));
const LedgerHistory = lazy(() => import('./components/LedgerHistory'));
const TimeVault = lazy(() => import('./components/TimeVault'));
const JudgeDashboard = lazy(() => import('./components/JudgeDashboard'));
const EscrowTracker = lazy(() => import('./components/EscrowTracker'));
const SettlementReceipt = lazy(() => import('./components/SettlementReceipt'));

// Minimal loading fallback for lazy components
const LazyFallback = () => (
    <div className="animate-pulse bg-white/[0.02] rounded-3xl border border-white/5 min-h-[200px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
);

export default function Dashboard() {
    const [showLanding, setShowLanding] = useState(true);
    const [isReady, setIsReady] = useState(false); // Prevent flash while checking sessionStorage

    // After hydration, check sessionStorage to skip landing if user already launched app
    useEffect(() => {
        if (sessionStorage.getItem('paypol_app_launched')) {
            setShowLanding(false);
        }
        setIsReady(true);
    }, []);

    const [currentWorkspace, setCurrentWorkspace] = useState<{ name: string, type: string, admin_wallet: string, id: string } | null | undefined>(undefined);
    const [gatewayMode, setGatewayMode] = useState<'Select' | 'Create' | 'Join'>('Select');
    const [setupStep, setSetupStep] = useState(1);
    const [setupType, setSetupType] = useState<'Organization' | 'Personal'>('Organization');
    const [setupName, setSetupName] = useState('');
    const [joinAdminWallet, setJoinAdminWallet] = useState('');
    const [ack1, setAck1] = useState(false); const [ack2, setAck2] = useState(false); const [ack3, setAck3] = useState(false);
    const [isDeployingWorkspace, setIsDeployingWorkspace] = useState(false);

    const [history, setHistory] = useState<any[]>([]);
    const [awaitingTxs, setAwaitingTxs] = useState<any[]>([]);
    const [pendingTxs, setPendingTxs] = useState<any[]>([]);
    const [autopilotRules, setAutopilotRules] = useState<any[]>([]);
    const [localEscrow, setLocalEscrow] = useState<any[]>([]);
    const [sysStats, setSysStats] = useState<any>(null);

    const [isSystemLocked, setIsSystemLocked] = useState(false);
    const [toast, setToast] = useState({ show: false, type: 'success', msg: '', id: 0 });
    // REMOVED: `now` state and 1-second timer - moved into TimeVault component
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [activeVaultToken, setActiveVaultToken] = useState(SUPPORTED_TOKENS[0]);
    const [vaultBalance, setVaultBalance] = useState("0.00");
    const [userBalance, setUserBalance] = useState("0.00");
    const [showFundInput, setShowFundInput] = useState(false);
    const [fundAmount, setFundAmount] = useState("");
    const [isFunding, setIsFunding] = useState(false);

    const [agentStatus, setAgentStatus] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('daemon_status') || 'OFFLINE' : 'OFFLINE');
    const [isTogglingAgent, setIsTogglingAgent] = useState(false);
    const [showAbortModal, setShowAbortModal] = useState(false);

    const [usePhantomShield, setUsePhantomShield] = useState(true);
    const [isEncrypting, setIsEncrypting] = useState<boolean>(false);
    const [expandedTx, setExpandedTx] = useState<string | null>(null);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    const boardroomRef = useRef<HTMLDivElement>(null);
    const autopilotRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const settlementRef = useRef<HTMLDivElement>(null);
    const isExecutionLocked = useRef<boolean>(false);
    const prevLocalEscrowRef = useRef<string[]>([]);

    // ==========================================
    // MEMOIZED COMPUTED VALUES (Phase 2.5)
    // Previously recalculated on every render - now only when dependencies change
    // ==========================================
    const isAdmin = useMemo(() =>
        !!(walletAddress && currentWorkspace && walletAddress.toLowerCase() === currentWorkspace.admin_wallet.toLowerCase()),
        [walletAddress, currentWorkspace]
    );

    const calculatedDisbursed = useMemo(() =>
        history.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0),
        [history]
    );

    const totalDisbursed = useMemo(() =>
        sysStats ? sysStats.totalShieldedVolume : calculatedDisbursed.toFixed(3),
        [sysStats, calculatedDisbursed]
    );

    const activeBotsCount = useMemo(() =>
        (agentStatus === 'ACTIVE' ? 1 : 0) + autopilotRules.filter(r => r.status === 'Active').length,
        [agentStatus, autopilotRules]
    );

    const awaitingTotalAmountNum = useMemo(() =>
        awaitingTxs.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0),
        [awaitingTxs]
    );

    const protocolFeeNum = useMemo(() =>
        Math.min(awaitingTotalAmountNum * 0.002, 5.00),
        [awaitingTotalAmountNum]
    );

    const shieldFeeNum = useMemo(() =>
        usePhantomShield ? Math.min(awaitingTotalAmountNum * 0.002, 5.00) : 0,
        [usePhantomShield, awaitingTotalAmountNum]
    );

    const totalWithFee = useMemo(() =>
        (awaitingTotalAmountNum + protocolFeeNum + shieldFeeNum).toFixed(2),
        [awaitingTotalAmountNum, protocolFeeNum, shieldFeeNum]
    );

    // Recent settlements (last 24h) for SettlementReceipt panel
    const recentSettlements = useMemo(() => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return history.filter(h => {
            if (!h.date) return false;
            const txTime = new Date(h.date).getTime();
            return txTime > cutoff;
        });
    }, [history]);

    // ==========================================
    // MEMOIZED CONTACTS (Phase 2.7) - was useEffect+setState, now useMemo
    // ==========================================
    const contacts = useMemo(() => {
        const addressMap = new Map<string, string>();
        autopilotRules.forEach(r => { if (r.wallet_address && r.name) addressMap.set(r.wallet_address.toLowerCase(), r.name); });
        pendingTxs.forEach(t => { const w = t.wallet_address || t.address; if (w && t.name) addressMap.set(w.toLowerCase(), t.name); });
        history.forEach(h => { if (h.breakdown) { h.breakdown.forEach((b: any) => { const w = b.wallet_address || b.address; if (w && b.name && b.name !== 'Unknown Entity' && b.name !== '🤖 Agent') addressMap.set(w.toLowerCase(), b.name); }); } });
        return Array.from(addressMap.entries()).map(([wallet, name]) => ({ name, wallet })).filter(c => c.wallet && c.wallet.startsWith('0x'));
    }, [autopilotRules, pendingTxs, history]);

    // ==========================================
    // STABLE CALLBACKS (Phase 2.6)
    // ==========================================
    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ show: false, type, msg, id: Date.now() });
        setTimeout(() => setToast({ show: true, type, msg, id: Date.now() }), 50);
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 6000);
    }, []);

    // ==========================================
    // EFFECTS
    // ==========================================

    // Ethereum account change listener
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length > 0) { showToast('success', 'Wallet switch detected. Re-authenticating...'); initializeSession(accounts[0]); }
                else disconnectWallet();
            };
            (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
            return () => { (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged); };
        }
    }, []);

    // Glow effect timeout
    useEffect(() => {
        const hasGlowingItems = history.some(h => h.isJustSettled);
        if (hasGlowingItems) {
            const timeout = setTimeout(() => setHistory(prev => prev.map(h => ({ ...h, isJustSettled: false }))), 5000);
            return () => clearTimeout(timeout);
        }
    }, [history]);

    // Auto-scroll to Settlement Receipt when batch finishes processing in Daemon Queue
    useEffect(() => {
        const prevIds = prevLocalEscrowRef.current;
        const currentIds = localEscrow.map(b => b.id);

        // Detect batches that just left the Daemon Queue (were processing, now gone)
        const justSettledIds = prevIds.filter(id => !currentIds.includes(id));

        if (justSettledIds.length > 0 && history.length > 0) {
            // Mark settled batches with glow effect
            setHistory(prev => prev.map(h => ({
                ...h,
                isJustSettled: h.isJustSettled || justSettledIds.some(id => h.hash?.includes(id.replace('...', '')))
            })));

            // Auto-scroll to Settlement Receipt panel (not history)
            setTimeout(() => {
                settlementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 400);
        }

        // Update ref for next comparison
        prevLocalEscrowRef.current = currentIds;
    }, [localEscrow, history]);

    // ==========================================
    // WALLET & SESSION FUNCTIONS
    // ==========================================
    const fetchOnChainBalances = useCallback(async (currentUserAddress: string | null = walletAddress, currentToken = activeVaultToken) => { try { const cleanVaultAddress = PAYPOL_SHIELD_ADDRESS.toLowerCase().replace('0x', '').padStart(64, '0'); const vaultPayload = `0x70a08231${cleanVaultAddress}`; const vaultRes = await fetch(RPC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: currentToken.address, data: vaultPayload }, "latest"] }) }); const vaultJson = await vaultRes.json(); if (vaultJson.result && vaultJson.result !== "0x") setVaultBalance((parseInt(vaultJson.result, 16) / (10 ** currentToken.decimals)).toFixed(2)); if (currentUserAddress && !currentUserAddress.includes('...')) { const cleanUserAddress = currentUserAddress.toLowerCase().replace('0x', '').padStart(64, '0'); const userPayload = `0x70a08231${cleanUserAddress}`; const userRes = await fetch(RPC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: currentToken.address, data: userPayload }, "latest"] }) }); const userJson = await userRes.json(); if (userJson.result && userJson.result !== "0x") setUserBalance((parseInt(userJson.result, 16) / (10 ** currentToken.decimals)).toFixed(2)); } } catch (e) { console.error("RPC sync failed"); } }, [walletAddress, activeVaultToken]);

    const initializeSession = async (wallet: string) => { setWalletAddress(wallet); try { const res = await fetch(`/api/workspace?wallet=${wallet}`); const data = await res.json(); if (data.workspace) { setCurrentWorkspace(data.workspace); localStorage.removeItem('paypol_joined_workspace'); showToast('success', `Authenticated as Administrator for ${data.workspace.name}.`); fetchOnChainBalances(wallet, activeVaultToken); } else { const joinedAdminWallet = localStorage.getItem('paypol_joined_workspace'); if (joinedAdminWallet) { const joinRes = await fetch(`/api/workspace?wallet=${joinedAdminWallet}`); const joinData = await joinRes.json(); if (joinData.workspace) { setCurrentWorkspace(joinData.workspace); showToast('success', `Authenticated as Contributor for ${joinData.workspace.name}.`); fetchOnChainBalances(wallet, activeVaultToken); } else { localStorage.removeItem('paypol_joined_workspace'); setCurrentWorkspace(null); } } else setCurrentWorkspace(null); } } catch (e) { showToast('error', 'Gateway connection failed.'); } };
    const connectWallet = useCallback(async () => { try { const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' }); await initializeSession(accounts[0]); } catch (error) { showToast('error', 'Connection request declined.'); } }, [showToast]);
    const disconnectWallet = useCallback(() => { setWalletAddress(null); setCurrentWorkspace(undefined); setUserBalance("0.00"); sessionStorage.removeItem('paypol_app_launched'); setShowLanding(true); showToast('success', 'Session disconnected.'); }, [showToast]);
    const deployWorkspace = useCallback(async (e: React.FormEvent) => { e.preventDefault(); if (!walletAddress || !ack1 || !ack2 || !ack3) return showToast('error', 'Complete security checks first.'); setIsDeployingWorkspace(true); try { const signMessage = `PAYPOL GENESIS INITIALIZATION\n\nEstablishing Workspace: "${setupName}".\n\nI acknowledge this wallet (${walletAddress}) will become the permanent Master Administrator.`; const signPromise = (window as any).ethereum.request({ method: 'personal_sign', params: [signMessage, walletAddress] }); const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Wallet signature timed out. Please try again.')), 60000)); await Promise.race([signPromise, timeoutPromise]); const res = await fetch('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminWallet: walletAddress, name: setupName, type: setupType }) }); const data = await res.json(); if (res.ok) { setCurrentWorkspace(data.workspace); showToast('success', 'Smart Vault deployed successfully.'); fetchOnChainBalances(walletAddress, activeVaultToken); } else showToast('error', data.error || 'Deployment failed.'); } catch (error: any) { console.error('Deploy workspace error:', error); showToast('error', error.code === 4001 || error.message?.includes('rejected') ? 'Signature rejected by wallet.' : error.message || 'Deployment failed.'); } finally { setIsDeployingWorkspace(false); } }, [walletAddress, ack1, ack2, ack3, setupName, setupType, showToast, fetchOnChainBalances, activeVaultToken]);
    const joinWorkspace = useCallback(async (e: React.FormEvent) => { e.preventDefault(); if (!joinAdminWallet.trim() || !joinAdminWallet.startsWith('0x')) return showToast('error', 'Invalid address format.'); try { const res = await fetch(`/api/workspace?wallet=${joinAdminWallet}`); const data = await res.json(); if (data.workspace) { localStorage.setItem('paypol_joined_workspace', data.workspace.admin_wallet); setCurrentWorkspace(data.workspace); showToast('success', `Joined ${data.workspace.name} as Contributor.`); fetchOnChainBalances(walletAddress, activeVaultToken); } else showToast('error', 'Workspace not found.'); } catch (e) { showToast('error', 'Network error.'); } }, [joinAdminWallet, showToast, fetchOnChainBalances, walletAddress, activeVaultToken]);
    const executeFund = useCallback(async () => { if (!walletAddress || walletAddress.includes('...')) return showToast('error', 'Connect valid wallet first.'); if (!fundAmount || isNaN(Number(fundAmount)) || Number(fundAmount) <= 0) return showToast('error', 'Invalid amount.'); if (Number(fundAmount) > Number(userBalance)) return showToast('error', `Insufficient balance.`); setIsFunding(true); try { const amountHex = BigInt(Math.floor(parseFloat(fundAmount) * (10 ** activeVaultToken.decimals))).toString(16).padStart(64, '0'); const targetVault = usePhantomShield ? PAYPOL_SHIELD_ADDRESS : PAYPOL_MULTISEND_ADDRESS; const dataPayload = `0xa9059cbb${targetVault.toLowerCase().replace('0x', '').padStart(64, '0')}${amountHex}`; const txHash = await (window as any).ethereum.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: activeVaultToken.address, data: dataPayload }] }); showToast('success', `Funding broadcasted: ${txHash.slice(0, 10)}...`); setShowFundInput(false); setFundAmount(""); } catch (error: any) { showToast('error', error.message || 'Transaction rejected.'); } setIsFunding(false); }, [walletAddress, fundAmount, userBalance, activeVaultToken, usePhantomShield, showToast]);
    const toggleAgent = useCallback(async () => { if (!isAdmin) return; setIsTogglingAgent(true); const action = agentStatus === 'ACTIVE' ? 'stop' : 'start'; setTimeout(() => { const newState = action === 'start' ? 'ACTIVE' : 'OFFLINE'; setAgentStatus(newState); localStorage.setItem('daemon_status', newState); showToast('success', `Master Daemon ${action === 'start' ? 'Engaged' : 'Halted'}.`); setIsTogglingAgent(false); }, 800); }, [isAdmin, agentStatus, showToast]);

    // ==========================================
    // REAL-TIME POLLING ENGINE (Phase 4 - Smart Polling)
    // Removed cache-busting timestamps & no-store
    // ==========================================
    const fetchData = useCallback(async () => {
        try {
            const [histRes, empRes, autopilotRes, statsRes] = await Promise.all([
                fetch('/api/payout-history'),
                fetch('/api/employees'),
                fetch('/api/autopilot'),
                fetch('/api/stats')
            ]);

            if (histRes.ok) {
                const rawHistory = await histRes.json();
                const groupedMap: Record<string, any> = {};

                rawHistory.forEach((row: any) => {
                    if (row.breakdown) { groupedMap[row.hash] = row; return; }
                    const hashKey = row.hash || row.txHash;
                    if (!groupedMap[hashKey]) {
                        groupedMap[hashKey] = { hash: hashKey, date: row.date || new Date().toLocaleString(), amount: 0, token: row.token || "AlphaUSD", isJustSettled: false, breakdown: [], isLocalBatch: row.isLocalBatch || false, isShielded: row.isShielded };
                    }
                    groupedMap[hashKey].amount += parseFloat(row.amount || 0);
                    groupedMap[hashKey].breakdown.push({ name: row.name || 'Unknown Entity', address: row.address || row.wallet_address || row.recipient, amount: row.amount, note: row.note || 'Public Transfer', zkCommitment: row.zkCommitment });
                });

                let mergedHistory = Object.values(groupedMap).map(h => ({ ...h, amount: typeof h.amount === 'number' ? h.amount.toFixed(3) : h.amount }));

                setHistory(prev => {
                    const glowingHashes = prev.filter(p => p.isJustSettled).map(g => g.hash);
                    const localBatches = prev.filter(p => p.isLocalBatch && !mergedHistory.some(m => m.hash === p.hash));
                    return [...localBatches, ...mergedHistory].map(m => ({ ...m, isJustSettled: glowingHashes.includes(m.hash) }));
                });
            }

            if (empRes.ok) {
                const data = await empRes.json();
                setAwaitingTxs(data.awaiting || []);
                setPendingTxs(data.pending || []);

                const realPendingJobs = (data.vaulted || []).filter((tx: any) => tx.status === 'PENDING' || tx.status === 'PROCESSING');
                const queueMap: Record<string, any> = {};
                realPendingJobs.forEach((tx: any) => {
                    const batchId = tx.zkProof || tx.id;
                    if (!queueMap[batchId]) {
                        queueMap[batchId] = {
                            id: batchId.substring(0, 10) + '...',
                            amount: 0,
                            isShielded: tx.isShielded,
                            status: tx.status === 'PROCESSING' ? 'Daemon Generating ZK...' : 'Awaiting Daemon...',
                            zkCommitment: tx.zkProof || 'Awaiting Sync...'
                        };
                    }
                    queueMap[batchId].amount += parseFloat(tx.amount || 0);
                });
                setLocalEscrow(Object.values(queueMap).map(q => ({...q, amount: typeof q.amount === 'number' ? q.amount.toFixed(2) : q.amount})));
            }
            if (autopilotRes.ok) setAutopilotRules(await autopilotRes.json());
            if (statsRes.ok) setSysStats((await statsRes.json()).stats);
            await fetchOnChainBalances(walletAddress, activeVaultToken);
        } catch (error) { console.error("Hydration Error"); }
    }, [walletAddress, activeVaultToken, fetchOnChainBalances]);

    // Smart polling: 5s interval, pause when tab hidden (Phase 4.3)
    useEffect(() => {
        if (!walletAddress || isBatchProcessing) return;

        fetchData();

        let interval: ReturnType<typeof setInterval>;
        let isVisible = true;

        const startPolling = () => {
            interval = setInterval(() => {
                if (isVisible && walletAddress && !isBatchProcessing) fetchData();
            }, 15000); // Poll every 15s to reduce server load (was 5s)
        };

        const handleVisibility = () => {
            isVisible = !document.hidden;
            if (isVisible) fetchData();
        };

        document.addEventListener('visibilitychange', handleVisibility);
        startPolling();

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [walletAddress, currentWorkspace, activeVaultToken, isBatchProcessing, fetchData]);

    // ==========================================
    // ACTION HANDLERS (wrapped in useCallback)
    // ==========================================
    const removeAwaitingTx = useCallback(async (id: number | string) => { setAwaitingTxs(prev => prev.filter(tx => tx.id !== id)); showToast('success', 'Payload purged.'); try { await fetch('/api/employees', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchData(); } catch (error) { fetchData(); } }, [showToast, fetchData]);
    const executeAbort = useCallback(async () => { if (!isAdmin) return; setShowAbortModal(false); await fetch('/api/employees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel_vault' }) }); showToast('success', 'Override signal transmitted.'); await fetchData(); }, [isAdmin, showToast, fetchData]);
    const toggleAutopilotState = useCallback(async (id: number, currentStatus: string) => { if (!isAdmin) return showToast('error', 'Admin privileges required.'); const action = currentStatus === 'Active' ? 'pause' : 'resume'; await fetch('/api/autopilot', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) }); showToast('success', `Agent ${action === 'pause' ? 'paused' : 'resumed'}.`); await fetchData(); }, [isAdmin, showToast, fetchData]);
    const triggerAutopilotAgent = useCallback(async (id: number, ruleName: string) => { if (!isAdmin) return; try { const res = await fetch('/api/autopilot', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'trigger' }) }); if (res.ok) { showToast('success', `Agent [${ruleName}] executed! Payload sent to Boardroom.`); await fetchData(); setTimeout(() => boardroomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); } } catch (error) { showToast('error', 'Failed to trigger agent.'); } }, [isAdmin, showToast, fetchData]);
    const deleteAutopilotAgent = useCallback(async (id: number) => { if (!isAdmin) return; if (!confirm("Terminate this Autopilot Agent?")) return; try { const res = await fetch('/api/autopilot', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); if (res.ok) { showToast('success', 'Agent wiped from memory.'); await fetchData(); } } catch (error) { } }, [isAdmin, showToast, fetchData]);

    const exportLedgerToCSV = useCallback(() => {
        if (!history || history.length === 0) {
            showToast('error', 'No ledger history available to export.');
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,Date,Transaction Hash,Token,Total Amount,Recipient Name,Recipient Wallet,Settled Amount,Note\n";
        history.forEach(tx => {
            if (tx.breakdown && tx.breakdown.length > 0) {
                tx.breakdown.forEach((b: any) => {
                    csvContent += `"${tx.date}","${tx.hash}","${tx.token}","${tx.amount}","${b.name ? b.name.replace(/"/g, '""') : ''}","${b.address}","${b.amount}","${b.note ? b.note.replace(/"/g, '""') : ''}"\n`;
                });
            } else {
                csvContent += `"${tx.date}","${tx.hash}","${tx.token}","${tx.amount}","-","-","-","-"\n`;
            }
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `PayPol_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('success', 'Ledger successfully exported as CSV!');
    }, [history, showToast]);

    // =========================================================================
    // SIGN & APPROVE BATCH - Dynamic import ethers.js (Phase 3.3)
    // ethers.js (472KB) only loaded when user actually clicks approve
    // =========================================================================
    const signAndApproveBatch = useCallback(async () => {
        if (isExecutionLocked.current) return;
        if (!isAdmin || !walletAddress) { showToast('error', 'Admin wallet required.'); return; }

        isExecutionLocked.current = true;
        setIsEncrypting(true);
        setIsBatchProcessing(true);

        try {
            if (typeof (window as any).ethereum === 'undefined') throw new Error("MetaMask is not installed.");

            // Dynamic import - ethers.js (472KB) only loaded when actually needed
            const { ethers } = await import('ethers');

            // Normalize sender wallet to EIP-55 checksum format
            const checksummedWallet = ethers.getAddress(walletAddress);

            const provider = new ethers.BrowserProvider((window as any).ethereum);
            // Pass checksummed address directly to avoid BrowserProvider re-fetching accounts with bad checksum
            const signer = await provider.getSigner(checksummedWallet);
            const isAgentMode = awaitingTxs.some(tx => tx.isDiscovery === true || (tx.note && tx.note.includes('A2A')));

            const tokenAddress = activeVaultToken.address || "0x20c0000000000000000000000000000000000001";
            const tokenDecimals = activeVaultToken.decimals || 6;

            const totalRequiredAmount = awaitingTotalAmountNum;
            const amountInUnits = ethers.parseUnits(totalRequiredAmount.toFixed(tokenDecimals), tokenDecimals);
            const targetVault = usePhantomShield ? PAYPOL_SHIELD_ADDRESS : PAYPOL_MULTISEND_ADDRESS;

            let activeTxHash = "";

            if (isAgentMode && !usePhantomShield) {
                // ═══ NexusV2: 2-step ERC20 Escrow Flow ═══
                // Step 1: Approve NexusV2 contract to spend employer's ERC20 tokens
                showToast('success', 'Step 1/2: Approving token spend...');
                const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
                const approveTx = await tokenContract.approve(PAYPOL_NEXUS_V2_ADDRESS, amountInUnits);
                await approveTx.wait();

                // Step 2: Create escrow job on NexusV2 (48h deadline = 172800 seconds)
                showToast('success', 'Step 2/2: Locking funds in Escrow Vault...');
                const nexusV2 = new ethers.Contract(PAYPOL_NEXUS_V2_ADDRESS, NEXUS_V2_ABI, signer);
                const rawRecipient = awaitingTxs[0].wallet_address || awaitingTxs[0].address || awaitingTxs[0].recipientWallet || awaitingTxs[0].wallet;
                // Validate address format - REJECT invalid addresses instead of silently sending to ZeroAddress
                if (!rawRecipient || !/^0x[a-fA-F0-9]{40}$/.test(rawRecipient)) {
                    throw new Error(`Invalid recipient address: ${rawRecipient || 'none'}. Cannot create escrow with invalid wallet.`);
                }
                // Normalize to EIP-55 checksum format to prevent "bad address checksum" errors
                const recipientWalletStr = ethers.getAddress(rawRecipient);
                const DEADLINE_48H = BigInt(172800); // 48 hours in seconds
                const createTx = await nexusV2.createJob(recipientWalletStr, checksummedWallet, tokenAddress, amountInUnits, DEADLINE_48H, { gasLimit: 500000 });
                activeTxHash = createTx.hash;
                const receipt = await createTx.wait();

                // Step 3: Extract onChainJobId from JobCreated event (MANDATORY)
                let onChainJobId: number | null = null;
                for (const log of receipt.logs) {
                    try {
                        const parsed = nexusV2.interface.parseLog({ topics: log.topics as string[], data: log.data });
                        if (parsed && parsed.name === 'JobCreated') {
                            onChainJobId = Number(parsed.args.jobId);
                            break;
                        }
                    } catch { /* skip non-matching logs */ }
                }
                if (onChainJobId == null) {
                    console.error('JobCreated event not found in transaction receipt. Logs:', receipt.logs);
                    showToast('error', 'Warning: Escrow created but job ID could not be extracted. Contact support.');
                }

                // Step 4: Sync onChainJobId + deadline to DB via Settlement API
                const currentAgentJobId = awaitingTxs[0].agentJobId || awaitingTxs[0].jobId;
                if (currentAgentJobId) {
                    const deadlineMs = Date.now() + (Number(DEADLINE_48H) * 1000);
                    await fetch('/api/marketplace/settle', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jobId: currentAgentJobId,
                            action: 'escrow_locked',
                            txHash: activeTxHash,
                            onChainJobId,
                            deadline: new Date(deadlineMs).toISOString()
                        })
                    });
                }
                showToast('success', 'Escrow locked on-chain! Agent will begin work.');
            } else {
                showToast('success', `Depositing ${totalRequiredAmount} AlphaUSD to Vault...`);
                const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
                const txResponse = await tokenContract.transfer(targetVault, amountInUnits);
                activeTxHash = txResponse.hash;
                await txResponse.wait();
                showToast('success', 'Deposit confirmed! Waking up Daemon...');
            }

            await fetch('/api/employees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', isShielded: usePhantomShield, batchTxHash: activeTxHash })
            });

            setAwaitingTxs([]);
            await fetchData();
            setTimeout(() => document.getElementById('escrow-vault-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);

        } catch (error: any) {
            console.error("Transaction Error:", error);
            if (error.code === 4001 || error.code === 'ACTION_REJECTED' || (error.message && error.message.includes('rejected'))) {
                showToast('error', 'User rejected the transaction signature.');
            } else {
                showToast('error', `Transaction Failed: ${error.message || 'Unknown Error'}`);
            }
        } finally {
            isExecutionLocked.current = false;
            setIsEncrypting(false);
            setIsBatchProcessing(false);
        }
    }, [isAdmin, walletAddress, awaitingTxs, awaitingTotalAmountNum, activeVaultToken, usePhantomShield, showToast, fetchData]);

    // =========================================================================
    // ROUTING LOGIC
    // =========================================================================
    if (!isReady) { return <LazyFallback />; } // Wait for sessionStorage check before routing
    if (showLanding) { return <Suspense fallback={<LazyFallback />}><LandingPage onLaunchApp={() => { sessionStorage.setItem('paypol_app_launched', '1'); setShowLanding(false); }} /></Suspense>; }
    if (!currentWorkspace) { return (<Suspense fallback={<LazyFallback />}><GatewayScreen walletAddress={walletAddress} currentWorkspace={currentWorkspace} gatewayMode={gatewayMode} setGatewayMode={(val: any) => setGatewayMode(val)} setupStep={setupStep} setSetupStep={(val: any) => setSetupStep(val)} setupType={setupType} setSetupType={(val: any) => setSetupType(val)} setupName={setupName} setSetupName={(val: any) => setSetupName(val)} joinAdminWallet={joinAdminWallet} setJoinAdminWallet={(val: any) => setJoinAdminWallet(val)} ack1={ack1} setAck1={(val: any) => setAck1(val)} ack2={ack2} setAck2={(val: any) => setAck2(val)} ack3={ack3} setAck3={(val: any) => setAck3(val)} isDeployingWorkspace={isDeployingWorkspace} deployWorkspace={deployWorkspace} joinWorkspace={joinWorkspace} connectWallet={connectWallet} disconnectWallet={disconnectWallet} /></Suspense>); }

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans selection:bg-indigo-500/30 relative overflow-x-hidden pb-32">
            {/* Global styles moved to globals.css */}

            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle,_rgba(79,70,229,0.25)_0%,_transparent_70%)] pointer-events-none mix-blend-screen will-change-transform"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[50%] rounded-full bg-[radial-gradient(circle,_rgba(192,38,211,0.15)_0%,_transparent_70%)] pointer-events-none mix-blend-screen will-change-transform"></div>
            <div className="fixed top-[20%] right-[-5%] w-[30%] h-[40%] rounded-full bg-[radial-gradient(circle,_rgba(6,182,212,0.10)_0%,_transparent_70%)] pointer-events-none mix-blend-screen will-change-transform"></div>

            <div className={`fixed bottom-10 right-0 left-0 md:left-auto md:right-10 z-[500] transition-all duration-500 ease-out transform flex justify-center md:justify-end pointer-events-none ${toast.show ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}`}>
                <div className={`relative overflow-hidden flex items-start gap-4 p-5 pr-12 rounded-2xl border shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] pointer-events-auto max-w-sm w-11/12 md:w-[400px] will-change-transform ${toast.type === 'success' ? 'bg-[#061A11]/95 border-emerald-500/40' : 'bg-[#1A060A]/95 border-rose-500/40'}`}>
                    <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] opacity-40 pointer-events-none ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shadow-inner ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>{toast.type === 'success' ? '✨' : '🚨'}</div>
                    <div className="flex-1 pt-1 relative z-10">
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${toast.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{toast.type === 'success' ? 'System Confirmed' : 'Action Halted'}</p>
                        <p className="text-sm font-medium text-slate-200 whitespace-pre-line leading-relaxed">{toast.msg}</p>
                    </div>
                    <button onClick={() => setToast({ ...toast, show: false })} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20">✕</button>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50"><div key={toast.id} className={`h-full origin-left ${toast.show ? 'animate-shrink' : ''} ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div></div>
                </div>
            </div>

            <Navbar currentWorkspace={currentWorkspace} isAdmin={isAdmin} isSystemLocked={isSystemLocked} setIsSystemLocked={setIsSystemLocked} userBalance={userBalance} activeVaultToken={activeVaultToken} walletAddress={walletAddress} connectWallet={connectWallet} disconnectWallet={disconnectWallet} />

            <main className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-10">

                <TopStatsCards totalDisbursed={totalDisbursed} agentStatus={agentStatus} activeBotsCount={activeBotsCount} isAdmin={isAdmin} toggleAgent={toggleAgent} isTogglingAgent={isTogglingAgent} activeVaultToken={activeVaultToken} setActiveVaultToken={setActiveVaultToken} SUPPORTED_TOKENS={SUPPORTED_TOKENS} vaultBalance={vaultBalance} showFundInput={showFundInput} setShowFundInput={setShowFundInput} fundAmount={fundAmount} setFundAmount={setFundAmount} executeFund={executeFund} isFunding={isFunding} />

                <Suspense fallback={<LazyFallback />}>
                    <OmniTerminal SUPPORTED_TOKENS={SUPPORTED_TOKENS} contacts={contacts} showToast={showToast} fetchData={fetchData} boardroomRef={boardroomRef} autopilotRef={autopilotRef} history={history} walletAddress={walletAddress} />
                </Suspense>

                <div className="relative z-20 mb-10">
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/40 via-purple-500/20 to-fuchsia-500/40 rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none"></div>
                    <div className="absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 border-indigo-400/80 rounded-tl-xl z-10 pointer-events-none"></div><div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 border-fuchsia-400/80 rounded-br-xl z-10 pointer-events-none"></div><div className="absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 border-fuchsia-400/80 rounded-tr-xl z-10 pointer-events-none"></div><div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 border-indigo-400/80 rounded-bl-xl z-10 pointer-events-none"></div>
                    <div className="p-4 sm:p-8 flex flex-col border border-white/[0.08] rounded-3xl relative z-10 bg-[#151B27]/95 shadow-inner overflow-hidden">
                        <div className="absolute top-0 right-0 w-[60%] h-32 bg-fuchsia-500/10 blur-[80px] pointer-events-none"></div>
                        <div className="flex flex-wrap md:flex-nowrap justify-between items-center relative z-10 border-b border-white/[0.05] pb-6 mb-6 gap-4">
                            <div><h3 className="text-2xl font-bold text-white flex items-center gap-3"><span className="p-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl">📈</span> Protocol Volume</h3></div>
                        </div>
                        <div className="relative z-10 w-full">
                            <Suspense fallback={<LazyFallback />}>
                                <NetworkChart />
                            </Suspense>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
                    <div className="lg:col-span-8 space-y-6 sm:space-y-10">
                        <Suspense fallback={<LazyFallback />}>
                            {/* @ts-ignore */}
                            <Boardroom boardroomRef={boardroomRef} awaitingTxs={awaitingTxs} isAdmin={isAdmin} usePhantomShield={usePhantomShield} setUsePhantomShield={setUsePhantomShield} awaitingTotalAmountNum={awaitingTotalAmountNum} protocolFeeNum={protocolFeeNum} shieldFeeNum={shieldFeeNum} totalWithFee={totalWithFee} activeVaultToken={activeVaultToken} signAndApproveBatch={signAndApproveBatch} isEncrypting={isEncrypting} removeAwaitingTx={removeAwaitingTx} showToast={showToast} />
                        </Suspense>

                        {recentSettlements.length > 0 && (
                            <Suspense fallback={<LazyFallback />}>
                                <SettlementReceipt settlements={recentSettlements} settlementRef={settlementRef} />
                            </Suspense>
                        )}

                        <Suspense fallback={<LazyFallback />}>
                            <JudgeDashboard />
                        </Suspense>

                        <Suspense fallback={<LazyFallback />}>
                            {/* @ts-ignore */}
                            <ActiveAgents autopilotRef={autopilotRef} autopilotRules={autopilotRules} isAdmin={isAdmin} triggerAutopilotAgent={triggerAutopilotAgent} toggleAutopilotState={toggleAutopilotState} deleteAutopilotAgent={deleteAutopilotAgent} />
                        </Suspense>

                        <div ref={historyRef}>
                            <Suspense fallback={<LazyFallback />}>
                                {/* @ts-ignore */}
                                <LedgerHistory pendingTxs={pendingTxs} history={history} exportLedgerToCSV={exportLedgerToCSV} expandedTx={expandedTx} setExpandedTx={setExpandedTx} historyRef={historyRef} />
                            </Suspense>
                        </div>
                    </div>

                    <div id="escrow-vault-section" className="lg:col-span-4 space-y-8 scroll-mt-20">
                        <Suspense fallback={<LazyFallback />}>
                            {/* @ts-ignore */}
                            <TimeVault localEscrow={localEscrow} />
                        </Suspense>
                        <Suspense fallback={<LazyFallback />}>
                            <EscrowTracker walletAddress={walletAddress} />
                        </Suspense>
                    </div>
                </div>
            </main>
        </div>
    );
}
