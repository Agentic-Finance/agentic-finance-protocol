import React, { useState } from 'react';
import { CheckBadgeIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import type { NegotiationResult } from '../../lib/negotiation-engine';
import type { DiscoveredAgent } from '../../hooks/useAgentMarketplace';
import FiatCheckout from '../FiatCheckout';

interface DealConfirmationProps {
    negotiation: NegotiationResult | null;
    selectedAgent: DiscoveredAgent | null;
    onConfirm: () => void;
    onReject: () => void;
    confirmationRef: React.RefObject<HTMLDivElement | null>;
    isLoading?: boolean;
}

function DealConfirmation({ negotiation, selectedAgent, onConfirm, onReject, confirmationRef, isLoading }: DealConfirmationProps) {
    const [payMethod, setPayMethod] = useState<'crypto' | 'card'>('crypto');

    if (!negotiation || !selectedAgent) return null;

    const agent = selectedAgent.agent;

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
                    <div className="bg-black/30 border border-white/[0.04] rounded-xl p-4 text-center">
                        <span className="text-[9px] text-slate-600 uppercase tracking-wider block mb-1">Escrow Price</span>
                        <span className="text-white font-mono font-bold text-2xl">{negotiation.finalPrice.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">AlphaUSD</span>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-center">
                        <span className="text-[9px] text-emerald-400/60 uppercase tracking-wider block mb-1">Savings</span>
                        <span className="text-emerald-400 font-mono font-bold text-2xl">{negotiation.savings.toFixed(2)}</span>
                        <span className="text-[10px] text-emerald-500/60 block mt-0.5">AlphaUSD</span>
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

                {/* Actions */}
                {payMethod === 'card' ? (
                    <div className="flex flex-col gap-3">
                        <FiatCheckout
                            amount={negotiation.finalPrice}
                            userWallet="0x0000000000000000000000000000000000000000"
                            compact
                        />
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
