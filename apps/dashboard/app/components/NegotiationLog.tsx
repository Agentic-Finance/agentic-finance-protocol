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

    const totalRounds = 7;
    const progress = Math.min((logs.length / totalRounds) * 100, 100);

    return (
        <div className="bg-[#06080C] border border-white/[0.06] rounded-2xl overflow-hidden font-mono text-xs w-full animate-in fade-in duration-300 mt-4">

            {/* Header */}
            <div className="flex justify-between items-center px-5 py-3 border-b border-white/[0.04]">
                <span className="text-slate-300 font-semibold text-xs flex items-center gap-2">
                    🧠 Negotiation
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-fuchsia-400/70">
                    <span className="h-1.5 w-1.5 bg-fuchsia-500 rounded-full animate-pulse"></span>
                    Live
                </span>
            </div>

            {/* Progress Bar */}
            <div className="px-5 pt-3">
                <div className="h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Logs */}
            <div
                ref={logContainerRef}
                className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-hide px-5 py-3 scroll-smooth"
            >
                {logs.map((log, index) => (
                    <div key={index} className="flex gap-2.5 text-[11px] leading-relaxed">
                        <span className="text-slate-700 shrink-0 w-12">{log.timestamp}</span>
                        <span className={`font-semibold w-16 shrink-0 ${
                            log.type === 'STRATEGY' ? 'text-purple-400' :
                            log.type === 'SENT' ? 'text-sky-400' :
                            log.type === 'RECEIVED' ? 'text-amber-400' :
                            log.type === 'SUCCESS' ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                            {log.type}
                        </span>
                        <span className={`${
                            log.type === 'STRATEGY' ? 'italic text-slate-500' :
                            log.type === 'SUCCESS' ? 'text-emerald-300 font-semibold' : 'text-slate-400'
                        }`}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>

            {/* Summary Footer */}
            {finalPrice && fee && (
                <div className="px-5 py-4 border-t border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-600 uppercase tracking-wider">Budget</span>
                        <span className="text-slate-400 line-through text-sm font-mono">{budget} <span className="text-[9px] text-slate-600 no-underline">{token || 'AlphaUSD'}</span></span>
                    </div>
                    <div className="hidden md:block text-slate-700">→</div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-emerald-400/60 uppercase tracking-wider font-semibold">Secured</span>
                        <span className="text-white font-bold text-lg font-mono">{finalPrice} <span className="text-[10px] text-emerald-500">ALPHA</span></span>
                        <span className="text-[9px] text-slate-600">incl. {fee} fee</span>
                    </div>
                </div>
            )}
        </div>
    );
}
