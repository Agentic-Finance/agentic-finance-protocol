'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PollingState {
    history: any[];
    awaitingTxs: any[];
    pendingTxs: any[];
    autopilotRules: any[];
    localEscrow: any[];
    sysStats: any;
    agentStatus: string;
}

interface UsePollingEngineOpts {
    walletAddress: string | null;
    isBatchProcessing: boolean;
    fetchOnChainBalances: (wallet?: string | null, token?: any) => Promise<void>;
    activeVaultToken: any;
    showToast: (type: 'success' | 'error', msg: string) => void;
    /** Interval in ms. Default 15000 */
    intervalMs?: number;
}

/**
 * Polling Engine Hook — manages all periodic data fetching.
 *
 * Extracted from page.tsx to reduce its complexity.
 * Features:
 * - Promise.allSettled (resilient to individual endpoint failures)
 * - Visibility-aware (pauses when tab is hidden)
 * - Deduplication via ref-based lock
 */
export function usePollingEngine({
    walletAddress,
    isBatchProcessing,
    fetchOnChainBalances,
    activeVaultToken,
    showToast,
    intervalMs = 15000,
}: UsePollingEngineOpts) {
    const [history, setHistory] = useState<any[]>([]);
    const [awaitingTxs, setAwaitingTxs] = useState<any[]>([]);
    const [pendingTxs, setPendingTxs] = useState<any[]>([]);
    const [autopilotRules, setAutopilotRules] = useState<any[]>([]);
    const [localEscrow, setLocalEscrow] = useState<any[]>([]);
    const [sysStats, setSysStats] = useState<any>(null);
    const [agentStatus, setAgentStatus] = useState('OFFLINE');

    const isFetchingRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            // Promise.allSettled — each endpoint independent, no cascade failures
            const results = await Promise.allSettled([
                fetch('/api/payout-history'),
                fetch('/api/employees'),
                fetch('/api/autopilot'),
                fetch('/api/stats'),
                walletAddress ? fetch(`/api/daemon-status?wallet=${walletAddress}`) : Promise.resolve(null),
            ]);

            // [0] History
            const histResult = results[0];
            if (histResult.status === 'fulfilled' && histResult.value?.ok) {
                const histData = await histResult.value.json();
                const rawHistory = histData.data || histData;
                const groupedMap: Record<string, any> = {};

                rawHistory.forEach((row: any) => {
                    if (row.breakdown) { groupedMap[row.hash] = row; return; }
                    const hashKey = row.hash || row.txHash;
                    if (!groupedMap[hashKey]) {
                        groupedMap[hashKey] = { hash: hashKey, date: row.date || new Date().toLocaleString(), amount: 0, token: row.token || "AlphaUSD", isJustSettled: false, breakdown: [], isLocalBatch: row.isLocalBatch || false, isShielded: row.isShielded, txHash: row.txHash };
                    }
                    groupedMap[hashKey].amount += parseFloat(row.amount || 0);
                    groupedMap[hashKey].breakdown.push({ name: row.name || 'Unknown Entity', address: row.address || row.wallet_address || row.recipient, amount: row.amount, note: row.note || 'Public Transfer', zkCommitment: row.zkCommitment, txHash: row.txHash, depositTxHash: row.depositTxHash, payoutTxHash: row.payoutTxHash });
                });

                let mergedHistory = Object.values(groupedMap).map(h => ({ ...h, amount: typeof h.amount === 'number' ? h.amount.toFixed(3) : h.amount }));

                setHistory(prev => {
                    const glowingHashes = prev.filter(p => p.isJustSettled).map(g => g.hash);
                    const localBatches = prev.filter(p => p.isLocalBatch && !mergedHistory.some(m => m.hash === p.hash));
                    return [...localBatches, ...mergedHistory].map(m => ({ ...m, isJustSettled: glowingHashes.includes(m.hash) }));
                });
            }

            // [1] Employees
            const empResult = results[1];
            if (empResult.status === 'fulfilled' && empResult.value?.ok) {
                const data = await empResult.value.json();
                setAwaitingTxs(data.awaiting || []);
                setPendingTxs(data.pending || []);

                const realPendingJobs = (data.vaulted || []).filter((tx: any) => tx.status === 'PENDING' || tx.status === 'PROCESSING');
                const queueMap: Record<string, any> = {};
                realPendingJobs.forEach((tx: any) => {
                    // Extract depositTxHash from zkProof JSON for display
                    let depositTxHash: string | null = null;
                    if (tx.zkProof) {
                        try {
                            const parsed = JSON.parse(tx.zkProof);
                            depositTxHash = parsed.depositTxHash || null;
                        } catch {
                            // Not JSON — might be a raw tx hash (legacy flow)
                            depositTxHash = tx.zkProof;
                        }
                    }

                    // Group by createdAt (rounded to minute) — all employees approved together = 1 batch
                    const createdMinute = tx.createdAt ? new Date(tx.createdAt).toISOString().slice(0, 16) : 'unknown';
                    const batchId = createdMinute;
                    // Display: prefer zkCommitment (actual commitment hash), then depositTxHash
                    const displayHash = tx.zkCommitment || depositTxHash || 'Awaiting Sync...';

                    if (!queueMap[batchId]) {
                        const shortId = depositTxHash
                            ? depositTxHash.substring(0, 10) + '...'
                            : (tx.zkCommitment ? tx.zkCommitment.substring(0, 10) + '...' : tx.id.substring(0, 10) + '...');
                        queueMap[batchId] = {
                            id: shortId,
                            amount: 0,
                            count: 0,
                            isShielded: tx.isShielded,
                            status: tx.status === 'PROCESSING' ? 'Daemon Generating ZK...' : 'Awaiting Daemon...',
                            zkCommitment: displayHash,
                        };
                    }
                    queueMap[batchId].amount += parseFloat(tx.amount || 0);
                    queueMap[batchId].count += 1;
                });
                setLocalEscrow(Object.values(queueMap).map(q => ({ ...q, amount: typeof q.amount === 'number' ? q.amount.toFixed(2) : q.amount })));
            }

            // [2] Autopilot
            const autopilotResult = results[2];
            if (autopilotResult.status === 'fulfilled' && autopilotResult.value?.ok) {
                const autopilotData = await autopilotResult.value.json();
                setAutopilotRules(autopilotData.data || autopilotData);
            }

            // [3] Stats
            const statsResult = results[3];
            if (statsResult.status === 'fulfilled' && statsResult.value?.ok) {
                setSysStats((await statsResult.value.json()).stats);
            }

            // [4] Daemon Status
            const daemonResult = results[4];
            if (daemonResult.status === 'fulfilled' && daemonResult.value && daemonResult.value.ok) {
                const daemonData = await daemonResult.value.json();
                setAgentStatus(daemonData.daemonStatus || 'OFFLINE');
            }

            await fetchOnChainBalances(walletAddress, activeVaultToken);
        } catch (error) {
            console.error("[PollingEngine] Fatal error", error);
            if (error instanceof TypeError) {
                showToast('error', 'Network error — retrying...');
            }
        } finally {
            isFetchingRef.current = false;
        }
    }, [walletAddress, activeVaultToken, fetchOnChainBalances, showToast]);

    // Smart polling: pause when tab hidden, resume on visibility
    useEffect(() => {
        if (!walletAddress || isBatchProcessing) return;

        fetchData();

        let interval: ReturnType<typeof setInterval>;
        let isVisible = true;

        const startPolling = () => {
            interval = setInterval(() => {
                if (isVisible && walletAddress && !isBatchProcessing) fetchData();
            }, intervalMs);
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
    }, [walletAddress, isBatchProcessing, fetchData, intervalMs]);

    return {
        history, setHistory,
        awaitingTxs, setAwaitingTxs,
        pendingTxs,
        autopilotRules,
        localEscrow,
        sysStats,
        agentStatus, setAgentStatus,
        fetchData,
    };
}
