'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, CheckBadgeIcon, XCircleIcon, LinkIcon, PaperClipIcon, ScaleIcon, ExclamationTriangleIcon, ArrowUturnLeftIcon, DocumentCheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { PAYPOL_NEXUS_V2_ADDRESS, NEXUS_V2_ABI } from '@/app/lib/constants';

interface EscrowPayload {
    id: string;
    name: string;
    recipientAddress: string;
    amount: string;
    token: string;
    note: string;
    status: string;
    // V2 on-chain fields
    onChainJobId: number | null;
    deadline: string | null;
    disputeReason: string | null;
    escrowTxHash: string | null;
    settleTxHash: string | null;
    agentJobId: string | null;
}

export default function JudgeDashboard({ isPaypolArbitrator = false }: { isPaypolArbitrator?: boolean }) {
    const [escrows, setEscrows] = useState<EscrowPayload[]>([]);

    // SMART TABS: Default tab depends on role
    const [activeTab, setActiveTab] = useState<string>('default');
    const currentTab = activeTab === 'default' ? (isPaypolArbitrator ? 'pending' : 'active') : activeTab;

    const [processingId, setProcessingId] = useState<string | null>(null);
    const [disputingId, setDisputingId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [cardMessage, setCardMessage] = useState<{id: string, type: 'success' | 'review' | 'error', text: string} | null>(null);

    const fetchEscrows = async () => {
        try {
            const res = await fetch('/api/escrow');
            if (!res.ok) return;
            const data = await res.json();
            if (data.success) setEscrows(data.escrows);
        } catch (error) {
            console.error("Polling error:", error);
        }
    };

    useEffect(() => {
        fetchEscrows();
        const interval = setInterval(fetchEscrows, 3000);
        return () => clearInterval(interval);
    }, []);

    // ═══════════════════════════════════════════════════════════
    // ON-CHAIN ACTION HANDLER - NexusV2 Contract Integration
    // ═══════════════════════════════════════════════════════════
    const handleAction = async (id: string, action: 'release' | 'dispute' | 'refund' | 'timeout') => {
        setProcessingId(id);
        const escrow = escrows.find(e => e.id === id);
        if (!escrow) { setProcessingId(null); return; }

        try {
            let txHash: string | undefined;

            // If we have an onChainJobId, do on-chain settlement first
            if (escrow.onChainJobId != null && action !== 'dispute') {
                const { ethers } = await import('ethers');

                if (typeof (window as any).ethereum === 'undefined') {
                    throw new Error("MetaMask is not installed.");
                }

                const provider = new ethers.BrowserProvider((window as any).ethereum);
                // Fetch accounts and normalize to EIP-55 checksum to prevent "bad address checksum" errors
                const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
                const checksummedAddress = accounts[0] ? ethers.getAddress(accounts[0]) : undefined;
                const signer = await provider.getSigner(checksummedAddress);
                const nexusV2 = new ethers.Contract(PAYPOL_NEXUS_V2_ADDRESS, NEXUS_V2_ABI, signer);

                if (action === 'release') {
                    // Judge settles - pay agent (minus 8% fee + 3% arbitration penalty if disputed)
                    setCardMessage({ id, type: 'success', text: 'Signing on-chain settlement...' });
                    const tx = await nexusV2.settleJob(escrow.onChainJobId, { gasLimit: 300000 });
                    txHash = tx.hash;
                    await tx.wait();
                } else if (action === 'refund') {
                    // Judge refunds - return amount to employer (minus 3% penalty if disputed)
                    setCardMessage({ id, type: 'success', text: 'Signing on-chain refund...' });
                    const tx = await nexusV2.refundJob(escrow.onChainJobId, { gasLimit: 300000 });
                    txHash = tx.hash;
                    await tx.wait();
                } else if (action === 'timeout') {
                    // Employer claims timeout refund
                    setCardMessage({ id, type: 'success', text: 'Claiming timeout refund...' });
                    const tx = await nexusV2.claimTimeout(escrow.onChainJobId, { gasLimit: 300000 });
                    txHash = tx.hash;
                    await tx.wait();
                }
            }

            // Sync to both APIs in parallel (settle + legacy escrow)
            const syncPromises: Promise<void>[] = [];

            // 1. Marketplace settle API (for actions with agentJobId)
            if (escrow.agentJobId) {
                const settleAction = action === 'release' ? 'settle'
                    : action === 'timeout' ? 'refund'
                    : action;
                syncPromises.push(
                    fetch('/api/marketplace/settle', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jobId: escrow.agentJobId,
                            action: settleAction,
                            txHash,
                            reason: action === 'dispute' ? disputeReason : undefined
                        })
                    }).then(res => { if (!res.ok) console.error('Failed to sync settle to DB'); }).catch(err => console.error('Settle sync error:', err))
                );
            }

            // 2. Legacy escrow API
            const legacyAction = action === 'timeout' ? 'refund' : action;
            const legacyPayload: any = { id, action: legacyAction, agentJobId: escrow.agentJobId, txHash };
            if (action === 'dispute') legacyPayload.reason = disputeReason;
            syncPromises.push(
                fetch('/api/escrow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(legacyPayload)
                }).then(res => { if (!res.ok) console.error('Failed to sync legacy escrow to DB'); }).catch(err => console.error('Legacy escrow sync error:', err))
            );

            await Promise.allSettled(syncPromises);

            // Show success message (Engine 3: Arbitration Monetization)
            if (action === 'dispute') {
                setCardMessage({ id, type: 'review', text: 'Dispute filed. Moving to Arbitration Queue. 3% penalty will apply to losing party (max $10).' });
            } else if (action === 'release') {
                const isDisputed = escrow.status === 'DISPUTED';
                setCardMessage({ id, type: 'success', text: isDisputed
                    ? 'Funds settled to Agent. 3% arbitration penalty applied to Company (max $10).'
                    : 'Funds settled on-chain to the Agent (minus 8% platform fee).'
                });
            } else if (action === 'refund') {
                const isDisputed = escrow.status === 'DISPUTED';
                setCardMessage({ id, type: 'success', text: isDisputed
                    ? 'Funds refunded to Company (minus 3% penalty). Agent penalized (max $10).'
                    : 'Funds refunded on-chain to the Company.'
                });
            } else if (action === 'timeout') {
                setCardMessage({ id, type: 'success', text: 'Funds refunded on-chain to the Company (timeout claim).' });
            }

            setTimeout(() => {
                setDisputingId(null);
                setDisputeReason('');
                setCardMessage(null);
                setProcessingId(null);
                fetchEscrows();
            }, 3000);

        } catch (error: any) {
            console.error("Action error:", error);
            const isRejection = error.code === 4001 || error.code === 'ACTION_REJECTED' || error.message?.includes('rejected');
            setCardMessage({
                id,
                type: 'error',
                text: isRejection ? 'Transaction rejected by user.' : `Error: ${error.message?.slice(0, 80) || 'Unknown'}`
            });
            setTimeout(() => {
                setCardMessage(null);
                setProcessingId(null);
            }, 4000);
        }
    };

    const submitDispute = (id: string) => {
        if (!disputeReason.trim()) {
            setCardMessage({ id, type: 'error', text: 'Reason is required.' });
            return;
        }
        handleAction(id, 'dispute');
    };

    // Check if an escrow's deadline has passed
    const isDeadlinePassed = (escrow: EscrowPayload): boolean => {
        if (!escrow.deadline) return false;
        return new Date(escrow.deadline).getTime() < Date.now();
    };

    // Format deadline countdown
    const formatDeadline = (deadline: string | null): string => {
        if (!deadline) return 'No deadline';
        const diff = new Date(deadline).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m remaining`;
    };

    // FILTER LOGIC BASED ON ROLE & TAB
    const displayedEscrows = escrows.filter(e => {
        if (currentTab === 'pending') return e.status === 'EscrowLocked';
        if (currentTab === 'disputed') return e.status === 'DISPUTED';
        if (currentTab === 'active') return e.status === 'EscrowLocked' || e.status === 'DISPUTED'; // For Company
        if (currentTab === 'resolved') return e.status === 'SETTLED' || e.status === 'REFUNDED'; // For Both
        return false;
    });

    const pendingCount = escrows.filter(e => e.status === 'EscrowLocked').length;
    const disputedCount = escrows.filter(e => e.status === 'DISPUTED').length;
    const activeCount = pendingCount + disputedCount;

    if (escrows.length === 0) return null;

    return (
        <div className="relative z-20 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-teal-500/40 via-cyan-500/20 to-teal-500/40 rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none"></div>

            <div className="p-4 sm:p-8 flex flex-col border border-white/5 rounded-3xl relative z-10 bg-[#061014]/90 shadow-inner backdrop-blur-3xl overflow-hidden max-w-4xl mx-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-teal-500/5 blur-[80px] pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 border-b border-white/[0.05] pb-6 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="p-2 bg-teal-500/10 text-teal-400 rounded-xl shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                                <ShieldCheckIcon className="w-6 h-6" />
                            </span>
                            {isPaypolArbitrator ? 'PayPol Arbitration Node' : 'Escrow Node'}
                        </h2>
                        <p className="text-sm text-teal-400/80 mt-2 ml-14">
                            {isPaypolArbitrator ? 'Resolve disputes and issue final verdicts on-chain.' : 'Manage payments and track dispute results.'}
                        </p>
                    </div>

                    {/* UNIFIED TABS FOR EVERYONE (Different Labels) */}
                    <div className="flex items-center gap-2 mt-4 md:mt-0 bg-black/40 p-1.5 rounded-xl border border-white/5">
                        {isPaypolArbitrator ? (
                            <>
                                <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentTab === 'pending' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-slate-400 hover:text-white'}`}>
                                    Pending Review {pendingCount > 0 && <span className="bg-teal-500 text-slate-900 px-2 py-0.5 rounded-full text-[10px]">{pendingCount}</span>}
                                </button>
                                <button onClick={() => setActiveTab('disputed')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentTab === 'disputed' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}>
                                    Disputed Cases {disputedCount > 0 && <span className="bg-amber-500 text-slate-900 px-2 py-0.5 rounded-full text-[10px]">{disputedCount}</span>}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentTab === 'active' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-slate-400 hover:text-white'}`}>
                                Active Escrows {activeCount > 0 && <span className="bg-teal-500 text-slate-900 px-2 py-0.5 rounded-full text-[10px]">{activeCount}</span>}
                            </button>
                        )}

                        <button onClick={() => setActiveTab('resolved')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentTab === 'resolved' ? 'bg-slate-500/20 text-slate-200 border border-slate-500/30' : 'text-slate-400 hover:text-white'}`}>
                            Resolution History
                        </button>
                    </div>
                </div>

                {displayedEscrows.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm font-mono border border-dashed border-white/10 rounded-2xl">
                        &gt; No records found in this view.
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 relative z-10">
                        {displayedEscrows.map((escrow) => {
                            const isDisputed = escrow.status === 'DISPUTED';
                            const isResolved = escrow.status === 'SETTLED' || escrow.status === 'REFUNDED';
                            const timedOut = isDeadlinePassed(escrow);

                            // Determine Border Color based on status
                            let borderClass = 'border-teal-500/30';
                            if (isDisputed) borderClass = isPaypolArbitrator ? 'border-amber-500/40' : 'border-amber-500/30';
                            if (isResolved) borderClass = 'border-slate-500/30 opacity-75';
                            if (timedOut && !isResolved) borderClass = 'border-orange-500/40';

                            return (
                            <div key={escrow.id} className={`bg-[#0A161A] border rounded-2xl p-6 flex flex-col hover:border-teal-500/50 hover:opacity-100 transition-all shadow-lg relative overflow-hidden ${borderClass}`}>

                                {cardMessage?.id === escrow.id && cardMessage.type !== 'error' && (
                                    <div className="absolute inset-0 z-50 bg-[#061014]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${cardMessage.type === 'review' ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {cardMessage.type === 'review' ? <ScaleIcon className="w-7 h-7" /> : <DocumentCheckIcon className="w-7 h-7" />}
                                        </div>
                                        <h3 className={`text-base font-bold mb-1.5 ${cardMessage.type === 'review' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {cardMessage.type === 'review' ? 'Moved to Arbitration' : 'On-Chain Verdict Issued'}
                                        </h3>
                                        <p className={`text-xs px-4 leading-relaxed ${cardMessage.type === 'review' ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>{cardMessage.text}</p>
                                    </div>
                                )}

                                {/* Error overlay */}
                                {cardMessage?.id === escrow.id && cardMessage.type === 'error' && (
                                    <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                                        <p className="text-sm text-rose-400">{cardMessage.text}</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🤖</span>
                                        <div>
                                            <h3 className={`font-bold text-lg ${isResolved ? 'text-slate-400' : 'text-white'}`}>{escrow.name || 'PayPol Neural Agent'}</h3>
                                            {escrow.onChainJobId != null && (
                                                <span className="text-[10px] text-teal-500/60 font-mono">Job #{escrow.onChainJobId}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[10px] px-3 py-1.5 rounded uppercase tracking-widest font-bold
                                            ${isResolved ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                            : isDisputed ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'}`}>
                                            {isResolved ? 'Case Closed' : isDisputed ? 'Under Arbitration' : 'Pending Review'}
                                        </span>
                                        {/* Deadline countdown */}
                                        {!isResolved && escrow.deadline && (
                                            <span className={`text-[10px] flex items-center gap-1 font-mono ${timedOut ? 'text-orange-400' : 'text-slate-500'}`}>
                                                <ClockIcon className="w-3 h-3" />
                                                {formatDeadline(escrow.deadline)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                        <span className="text-sm text-slate-400 uppercase tracking-wider">{isResolved ? 'Disputed Amount' : 'Locked Funds'}</span>
                                        <div className="text-right flex items-baseline gap-1.5">
                                            <span className={`font-mono font-black text-2xl ${isResolved ? 'text-slate-400' : 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.4)]'}`}>
                                                {parseFloat(escrow.amount).toFixed(4)}
                                            </span>
                                            <span className={`text-xs font-bold ${isResolved ? 'text-slate-500' : 'text-teal-500'}`}>{escrow.token}</span>
                                        </div>
                                    </div>

                                    {/* Dispute reason display */}
                                    {(isDisputed || isResolved) && ((escrow.note && escrow.note.includes('[DISPUTED]')) || escrow.disputeReason) && (
                                        <div className={`p-4 rounded-xl border ${isResolved ? 'bg-slate-500/5 border-slate-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                            <span className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${isResolved ? 'text-slate-400' : 'text-amber-400'}`}>
                                                <ExclamationTriangleIcon className="w-4 h-4" /> Dispute Reason
                                            </span>
                                            <p className={`text-sm italic border-l-2 pl-3 py-1 ${isResolved ? 'text-slate-400/80 border-slate-500/50' : 'text-amber-200/90 border-amber-500/50'}`}>
                                                "{escrow.disputeReason || escrow.note?.replace('[DISPUTED] Reason: ', '') || 'No reason provided'}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Settlement tx hash */}
                                    {isResolved && escrow.settleTxHash && (
                                        <div className="bg-slate-500/5 p-3 rounded-xl border border-slate-500/10">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <LinkIcon className="w-3 h-3" /> Settlement Tx
                                            </span>
                                            <p className="text-xs text-slate-400 font-mono mt-1 truncate">{escrow.settleTxHash}</p>
                                        </div>
                                    )}

                                    {!isResolved && (
                                        <div className="bg-teal-500/10 p-4 rounded-xl border border-teal-500/20">
                                            <span className="text-xs text-teal-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <LinkIcon className="w-4 h-4" /> Proof of Work Submitted
                                            </span>
                                            <a href="#" className="flex items-center gap-2 text-base font-medium text-slate-200 hover:text-white transition-colors mt-2">
                                                <span className="underline decoration-teal-500/50 underline-offset-4">github.com/paypol/agent-pr</span>
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto">
                                    {/* 1. RESOLVED STATE: SHOW THE VERDICT */}
                                    {isResolved ? (
                                        <div className={`p-4 rounded-xl border flex items-center justify-center gap-3 ${escrow.status === 'REFUNDED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                            {escrow.status === 'REFUNDED' ? (
                                                <><ArrowUturnLeftIcon className="w-6 h-6"/> <span className="font-bold tracking-wide uppercase text-sm">Verdict: Refunded to Company</span></>
                                            ) : (
                                                <><CheckBadgeIcon className="w-6 h-6"/> <span className="font-bold tracking-wide uppercase text-sm">Verdict: Released to Agent</span></>
                                            )}
                                        </div>
                                    )

                                    /* 2. TIMEOUT STATE: Employer can claim refund */
                                    : timedOut && !isPaypolArbitrator ? (
                                        <button
                                            onClick={() => handleAction(escrow.id, 'timeout')}
                                            disabled={processingId === escrow.id}
                                            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-slate-900 text-base font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                        >
                                            {processingId === escrow.id ? 'Processing...' : <><ClockIcon className="w-6 h-6" /> Claim Timeout Refund</>}
                                        </button>
                                    )

                                    /* 3. DISPUTED STATE: ARBITRATOR GETS DECISION BUTTONS, USER GETS "WAITING" */
                                    : isDisputed ? (
                                        isPaypolArbitrator ? (
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => handleAction(escrow.id, 'refund')}
                                                    disabled={processingId === escrow.id}
                                                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 disabled:opacity-50 text-rose-400 text-sm font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                                >
                                                    {processingId === escrow.id ? 'Wait...' : <><ArrowUturnLeftIcon className="w-5 h-5" /> Refund to Company</>}
                                                </button>

                                                <button
                                                    onClick={() => handleAction(escrow.id, 'release')}
                                                    disabled={processingId === escrow.id}
                                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 text-sm font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                                                >
                                                    {processingId === escrow.id ? 'Wait...' : <><CheckBadgeIcon className="w-5 h-5" /> Pay Agent</>}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-full bg-amber-500/10 border border-amber-500/20 py-4 rounded-xl flex items-center justify-center gap-2">
                                                <ScaleIcon className="w-5 h-5 text-amber-400" />
                                                <span className="text-amber-400 text-sm font-bold">Awaiting PayPol Arbitration</span>
                                            </div>
                                        )
                                    )

                                    /* 4. PENDING STATE: SUBMIT DISPUTE FORM OR NORMAL RELEASE */
                                    : disputingId === escrow.id ? (
                                        <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex flex-col gap-4">
                                            <span className="text-xs text-rose-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                                <XCircleIcon className="w-4 h-4" /> Initiate Arbitration
                                            </span>
                                            <textarea
                                                value={disputeReason}
                                                onChange={(e) => setDisputeReason(e.target.value)}
                                                placeholder="Explain why the proof of work is unacceptable..."
                                                aria-label="Dispute reason"
                                                className="w-full bg-black/60 border border-rose-500/30 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-rose-500 resize-none"
                                                rows={2}
                                            />
                                            <div className="flex items-center justify-end gap-3 mt-1">
                                                <button onClick={() => { setDisputingId(null); setDisputeReason(''); setCardMessage(null); }} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">Cancel</button>
                                                <button onClick={() => submitDispute(escrow.id)} disabled={processingId === escrow.id} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-lg shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all flex items-center gap-2">
                                                    {processingId === escrow.id ? 'Wait...' : <><ScaleIcon className="w-4 h-4"/> Submit</>}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => handleAction(escrow.id, 'release')}
                                                disabled={processingId === escrow.id}
                                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 text-base font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                            >
                                                {processingId === escrow.id ? 'Processing...' : <><CheckBadgeIcon className="w-6 h-6" /> Approve & Release</>}
                                            </button>

                                            <button
                                                onClick={() => { setDisputingId(escrow.id); setCardMessage(null); }}
                                                disabled={processingId === escrow.id}
                                                className="px-6 py-4 bg-rose-500/10 hover:bg-rose-500 disabled:opacity-50 text-rose-400 hover:text-white border border-rose-500/30 rounded-xl transition-all flex items-center justify-center"
                                                aria-label="Dispute & Escalate"
                                            >
                                                <XCircleIcon className="w-7 h-7" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
