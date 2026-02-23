import React from 'react';
import { CheckBadgeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { NegotiationResult } from '../../lib/negotiation-engine';
import type { DiscoveredAgent } from '../../hooks/useAgentMarketplace';

interface DealConfirmationProps {
    negotiation: NegotiationResult | null;
    selectedAgent: DiscoveredAgent | null;
    onConfirm: () => void;
    onReject: () => void;
    confirmationRef: React.RefObject<HTMLDivElement | null>;
    isLoading?: boolean;
}

function DealConfirmation({ negotiation, selectedAgent, onConfirm, onReject, confirmationRef, isLoading }: DealConfirmationProps) {
    if (!negotiation || !selectedAgent) return null;

    const agent = selectedAgent.agent;

    return (
        <div
            ref={confirmationRef}
            className="mt-8 max-w-2xl mx-auto w-full p-[1px] bg-gradient-to-br from-emerald-500/40 via-teal-500/10 to-emerald-900/40 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.15)] relative overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-700"
        >
            <div className="bg-[#0B1215] rounded-[1.4rem] p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)]"></div>
                <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-8 relative z-10">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <CheckBadgeIcon className="w-8 h-8" />
                    </div>
                    <h4 className="text-emerald-400 font-black text-2xl sm:text-3xl uppercase tracking-widest mb-2">Deal Secured</h4>
                    <p className="text-slate-400 text-sm">
                        Smart contract negotiated with <strong className="text-slate-200">{agent.name}</strong> {agent.avatarEmoji}
                    </p>
                </div>

                {/* Price Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 relative z-10">
                    {/* Final Price */}
                    <div className="bg-black/50 border border-white/5 rounded-2xl p-6 text-center flex flex-col items-center justify-center relative overflow-hidden">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Final Escrow Price</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-white font-mono font-black text-4xl sm:text-5xl tracking-tight">
                                {negotiation.finalPrice.toFixed(2)}
                            </span>
                        </div>
                        <span className="text-xs text-emerald-500 font-bold mt-1 uppercase tracking-widest">AlphaUSD</span>
                        <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
                            <span>Agent Pay: <span className="text-slate-300">{negotiation.agentPay.toFixed(2)}</span></span>
                            <span>Fee: <span className="text-slate-300">{negotiation.platformFee.toFixed(2)}</span></span>
                        </div>
                    </div>

                    {/* Savings */}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-2xl p-6 text-center flex flex-col items-center justify-center relative overflow-hidden group shadow-[0_0_25px_rgba(16,185,129,0.1)]">
                        <div className="absolute top-2 right-2 p-1 opacity-40"><SparklesIcon className="w-6 h-6 text-emerald-400" /></div>
                        <div className="absolute bottom-2 left-2 p-1 opacity-20"><SparklesIcon className="w-4 h-4 text-teal-300" /></div>

                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">{'\u2728'} Total Savings</span>
                        <div className="flex items-baseline gap-1 relative z-10">
                            <span className="shimmer-text font-mono font-black text-4xl sm:text-5xl tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                                {negotiation.savings.toFixed(2)}
                            </span>
                        </div>
                        <span className="text-xs text-emerald-400 font-bold mt-1 uppercase tracking-widest">AlphaUSD</span>
                    </div>
                </div>

                {/* Agent Summary */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{agent.avatarEmoji}</span>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold text-sm">{agent.name}</span>
                                {agent.isVerified && <CheckBadgeIcon className="w-4 h-4 text-indigo-400" />}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                                <span>{agent.totalJobs} jobs</span>
                                <span>{agent.successRate}% success</span>
                                <span>{'\u2B50'} {agent.avgRating}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                    <button
                        onClick={onReject}
                        className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
                    >
                        Reject Deal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-black text-sm uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:from-emerald-400 hover:to-teal-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:-translate-y-0.5'}`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                Confirming...
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="w-6 h-6" /> Accept & Escrow
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(DealConfirmation);
