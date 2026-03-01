import React, { useState, useEffect, useCallback } from 'react';
import { CheckBadgeIcon, CreditCardIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { NegotiationResult } from '../../lib/negotiation-engine';
import type { DiscoveredAgent } from '../../hooks/useAgentMarketplace';
import FiatCheckout from '../FiatCheckout';

/** Shield ZK fee: 0.2% (max $5) — same as Payroll Phantom Shield */
const SHIELD_FEE_PERCENT = 0.2;
const SHIELD_FEE_MAX = 5;

interface DealConfirmationProps {
    negotiation: NegotiationResult | null;
    selectedAgent: DiscoveredAgent | null;
    onConfirm: () => void;
    onReject: () => void;
    confirmationRef: React.RefObject<HTMLDivElement | null>;
    isLoading?: boolean;
    walletAddress?: string | null;
}

function DealConfirmation({ negotiation, selectedAgent, onConfirm, onReject, confirmationRef, isLoading, walletAddress }: DealConfirmationProps) {
    const [payMethod, setPayMethod] = useState<'crypto' | 'card'>('crypto');
    const [shieldEnabled, setShieldEnabled] = useState(false);
    const [localWallet, setLocalWallet] = useState<string | null>(null);

    // Auto-detect wallet from MetaMask if not passed via props
    useEffect(() => {
        if (walletAddress) {
            setLocalWallet(walletAddress);
            return;
        }
        // Fallback: try to read from window.ethereum
        const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
        if (eth) {
            eth.request?.({ method: 'eth_accounts' })
                .then((accounts: string[]) => {
                    if (accounts?.[0]) setLocalWallet(accounts[0]);
                })
                .catch(() => {});
        }
    }, [walletAddress]);

    // Connect wallet handler
    const connectWallet = useCallback(async () => {
        const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
        if (!eth) return;
        try {
            const accounts = await eth.request({ method: 'eth_requestAccounts' });
            if (accounts?.[0]) setLocalWallet(accounts[0]);
        } catch { /* user rejected */ }
    }, []);

    if (!negotiation || !selectedAgent) return null;

    const agent = selectedAgent.agent;
    const effectiveWallet = walletAddress || localWallet;

    // Shield fee calculation
    const shieldFee = shieldEnabled
        ? Math.min(+(negotiation.finalPrice * SHIELD_FEE_PERCENT / 100).toFixed(2), SHIELD_FEE_MAX)
        : 0;

    return (
        <div
            ref={confirmationRef}
            className="mt-6 max-w-xl mx-auto w-full bg-[#0A0E17] border border-emerald-500/20 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500"
        >
            {/* Green accent line */}
            <div className="h-0.5 bg-emerald-500"></div>

            <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                        <CheckBadgeIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-base">Deal Secured</h4>
                        <p className="text-slate-500 text-xs">
                            with {agent.avatarEmoji} {agent.name}
                        </p>
                    </div>
                </div>

                {/* Price Row */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5"></div>
                        <span className="relative text-[9px] text-indigo-400/80 uppercase tracking-wider block mb-1 font-semibold">Escrow Price</span>
                        <span className="relative text-white font-mono font-bold text-2xl">{negotiation.finalPrice.toFixed(2)}</span>
                        <span className="relative text-[10px] text-indigo-300/60 block mt-0.5">AlphaUSD</span>
                    </div>
                    <div className="bg-black/20 border border-white/[0.04] rounded-xl p-4 text-center">
                        <span className="text-[9px] text-emerald-500/50 uppercase tracking-wider block mb-1">Savings</span>
                        <span className="text-emerald-400/70 font-mono font-bold text-lg">{negotiation.savings.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-600 block mt-0.5">AlphaUSD</span>
                    </div>
                </div>

                {/* Agent mini card */}
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 mb-5 flex items-center gap-3">
                    <span className="text-xl">{agent.avatarEmoji}</span>
                    <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-white font-semibold text-xs">{agent.name}</span>
                            {agent.isVerified && <CheckBadgeIcon className="w-3 h-3 text-indigo-400" />}
                        </div>
                        <div className="flex items-center gap-2.5 text-[10px] text-slate-500 mt-0.5">
                            <span>{agent.totalJobs} jobs</span>
                            <span>{agent.successRate}% success</span>
                            <span>⭐ {agent.avgRating}</span>
                        </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                        <div>Agent: <span className="text-slate-300">{negotiation.agentPay.toFixed(2)}</span></div>
                        <div>Fee: <span className="text-slate-300">{negotiation.platformFee.toFixed(2)}</span></div>
                    </div>
                </div>

                {/* Payment Toggle */}
                <div className="flex items-center gap-1.5 mb-4">
                    <button
                        onClick={() => setPayMethod('crypto')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                            payMethod === 'crypto'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                : 'bg-black/20 text-slate-500 border border-white/[0.04] hover:text-slate-300'
                        }`}
                    >
                        ⚡ Crypto
                    </button>
                    <button
                        onClick={() => setPayMethod('card')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                            payMethod === 'card'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25'
                                : 'bg-black/20 text-slate-500 border border-white/[0.04] hover:text-slate-300'
                        }`}
                    >
                        <CreditCardIcon className="w-3.5 h-3.5" /> Card
                    </button>
                </div>

                {/* Shield ZK Toggle */}
                <div
                    onClick={() => setShieldEnabled(!shieldEnabled)}
                    className={`w-full rounded-xl mb-4 cursor-pointer transition-all overflow-hidden ${
                        shieldEnabled
                            ? 'bg-gradient-to-r from-violet-500/15 to-purple-500/10 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                            : 'bg-black/20 border border-white/[0.06] hover:border-violet-500/20'
                    }`}
                >
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            shieldEnabled
                                ? 'bg-violet-500/20 text-violet-400'
                                : 'bg-white/5 text-slate-500'
                        }`}>
                            <ShieldCheckIcon className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${shieldEnabled ? 'text-violet-300' : 'text-slate-400'}`}>
                                    Shield ZK Privacy
                                </span>
                                {shieldEnabled && (
                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-violet-500/25 text-violet-300 font-bold uppercase tracking-wider">Active</span>
                                )}
                            </div>
                            <p className={`text-[10px] mt-0.5 ${shieldEnabled ? 'text-violet-300/60' : 'text-slate-600'}`}>
                                {shieldEnabled
                                    ? 'ZK-SNARK proof hides sender-recipient link on-chain'
                                    : 'Enable zero-knowledge privacy for this payment'}
                            </p>
                        </div>
                        <div className={`w-9 h-5 rounded-full relative transition-all ${
                            shieldEnabled ? 'bg-violet-500' : 'bg-white/10'
                        }`}>
                            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${
                                shieldEnabled ? 'right-[3px]' : 'left-[3px]'
                            }`} />
                        </div>
                    </div>
                    {shieldEnabled && (
                        <div className="px-4 pb-3 space-y-2">
                            {/* Fee info */}
                            <div className="flex items-center justify-between bg-violet-500/10 rounded-lg px-3 py-1.5">
                                <span className="text-[10px] text-violet-300/70">Shield fee ({SHIELD_FEE_PERCENT}%, max ${SHIELD_FEE_MAX})</span>
                                <span className="text-[11px] text-violet-300 font-mono font-semibold">+${shieldFee.toFixed(2)}</span>
                            </div>
                            {/* Feature pills */}
                            <div className="flex gap-3 text-[9px] text-violet-400/50">
                                <span className="flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-violet-400/50" />
                                    Poseidon commitment
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-violet-400/50" />
                                    ShieldVault V2
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-violet-400/50" />
                                    Nullifier anti-replay
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {payMethod === 'card' ? (
                    <div className="flex flex-col gap-3">
                        {effectiveWallet ? (
                            <FiatCheckout
                                amount={negotiation.finalPrice}
                                userWallet={effectiveWallet}
                                shieldEnabled={shieldEnabled}
                                compact
                            />
                        ) : (
                            <button
                                onClick={connectWallet}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all"
                            >
                                🔗 Connect Wallet to Pay
                            </button>
                        )}
                        <button
                            onClick={onReject}
                            className="w-full py-2.5 text-rose-400/70 hover:text-rose-400 text-xs font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={onReject}
                            className="flex-1 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-400 font-semibold text-xs rounded-xl transition-all"
                        >
                            Reject
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-[2] py-3 bg-emerald-500 text-slate-900 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                                isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-emerald-400'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                    Confirming...
                                </>
                            ) : (
                                <>
                                    <CheckBadgeIcon className="w-5 h-5" /> Accept & Escrow
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(DealConfirmation);
