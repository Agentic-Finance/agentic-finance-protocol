'use client';

import React, { useEffect, useRef } from 'react';
import type { NegotiationRound } from '../lib/negotiation-engine';

interface NegotiationLogProps {
    logs: NegotiationRound[];
    budget: string;
    finalPrice?: string;
    fee?: string;
    token?: string;
}

export default function NegotiationLog({ logs, budget, finalPrice, fee, token }: NegotiationLogProps) {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const totalRounds = 7; // Expected rounds from negotiation engine
    const progress = Math.min((logs.length / totalRounds) * 100, 100);

    return (
        <div className="bg-[#06080C] border border-fuchsia-500/30 rounded-2xl p-5 font-mono text-xs overflow-hidden w-full relative animate-in fade-in zoom-in-95 duration-300 shadow-[0_0_40px_rgba(217,70,239,0.1)] mt-4">

            <style jsx>{`
                @keyframes slideRight {
                    0% { left: 0%; opacity: 0; transform: scale(0.5); }
                    10% { opacity: 1; transform: scale(1); }
                    90% { opacity: 1; transform: scale(1); }
                    100% { left: calc(100% - 10px); opacity: 0; transform: scale(0.5); }
                }
                .animate-energy-flow {
                    animation: slideRight 2s ease-in-out infinite;
                }
                @keyframes typing {
                    0% { opacity: 0; transform: translateX(-8px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                .animate-typing {
                    animation: typing 0.3s ease-out forwards;
                }
            `}</style>

            {/* Header */}
            <div className="flex justify-between items-center mb-4 border-b border-fuchsia-500/20 pb-3">
                <span className="text-fuchsia-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="text-lg">{'\uD83E\uDDE0'}</span> A2A Negotiation Matrix
                </span>
                <span className="animate-pulse flex items-center gap-2 text-[10px] bg-fuchsia-500/10 px-2 py-1 rounded border border-fuchsia-500/20 text-fuchsia-300">
                    <span className="h-1.5 w-1.5 bg-fuchsia-500 rounded-full"></span>
                    LIVE PROCESSING
                </span>
            </div>

            {/* Negotiation Progress Bar */}
            <div className="mb-3 relative">
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-slate-600">
                    <span>Opening</span>
                    <span>Countering</span>
                    <span>Closing</span>
                </div>
            </div>

            {/* Logs Container */}
            <div
                ref={logContainerRef}
                className="space-y-3 h-52 overflow-y-auto scrollbar-hide pr-2 scroll-smooth"
            >
                {logs.map((log, index) => (
                    <div key={index} className="flex gap-3 text-[11px] leading-relaxed animate-typing" style={{ animationDelay: `${index * 50}ms` }}>
                        <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                        <span className={`font-bold w-20 shrink-0 ${
                            log.type === 'STRATEGY' ? 'text-purple-400' :
                            log.type === 'SENT' ? 'text-sky-400' :
                            log.type === 'RECEIVED' ? 'text-amber-400' :
                            log.type === 'SUCCESS' ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                            {log.type}
                        </span>
                        <span className={`${
                            log.type === 'STRATEGY' ? 'italic text-slate-400' :
                            log.type === 'SUCCESS' ? 'text-emerald-300 font-bold' : 'text-slate-300'
                        }`}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>

            {/* Summary Footer */}
            {finalPrice && fee && (
                <div className="mt-5 pt-5 border-t border-fuchsia-500/20 bg-gradient-to-r from-transparent via-fuchsia-500/5 to-emerald-500/5 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between relative overflow-hidden gap-4">

                    {/* Left: Original Budget */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left z-10 w-full md:w-auto">
                        <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Original Budget</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-slate-400 line-through font-mono text-xl">{budget}</span>
                            <span className="text-[10px] text-slate-500 uppercase">{token || 'AlphaUSD'}</span>
                        </div>
                    </div>

                    {/* Middle: Energy Flow Bridge */}
                    <div className="hidden md:flex flex-1 mx-8 items-center justify-center relative z-10 h-8">
                        <div className="w-full h-[2px] bg-gradient-to-r from-fuchsia-500/30 via-emerald-400/50 to-emerald-500 relative rounded-full">
                            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white] animate-energy-flow"></div>
                            <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-500 rotate-45"></div>
                        </div>
                        <span className="absolute bg-[#06080C] px-3 py-1 text-[9px] text-emerald-400 font-bold tracking-widest border border-emerald-500/30 rounded-full uppercase shadow-[0_0_10px_rgba(16,185,129,0.15)] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            AI Optimized
                        </span>
                    </div>

                    {/* Right: Secured Price */}
                    <div className="flex flex-col items-center md:items-end text-center md:text-right z-10 w-full md:w-auto">
                        <span className="text-emerald-400 text-[10px] uppercase tracking-widest mb-1 font-bold">Secured Price</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-white font-mono font-black text-2xl drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">{finalPrice}</span>
                            <span className="text-[10px] text-emerald-500 uppercase">{token || 'AlphaUSD'}</span>
                        </div>
                        <p className="text-[9px] text-emerald-500/70 font-mono mt-1">
                            (Includes {fee} Platform Fee)
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
