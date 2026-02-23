'use client';

import React, { useState, useEffect } from 'react';

interface TimeVaultProps {
    localEscrow: any[];
}

function TimeVault({ localEscrow }: TimeVaultProps) {
    // Timer lives here now - only TimeVault re-renders every second, NOT the entire page
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));

    useEffect(() => {
        const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative z-20">
            {/* Background ambient glows */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-cyan-500/20 rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none"></div>

            <div className="p-8 flex flex-col border border-white/5 rounded-3xl relative z-10 bg-[#0B0F17]/95 shadow-inner backdrop-blur-3xl overflow-hidden min-h-[400px]">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-5 mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]">⚙️</span>
                        Daemon Queue
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className={`${localEscrow.length > 0 ? 'animate-ping bg-emerald-400' : 'bg-slate-500'} absolute inline-flex h-full w-full rounded-full opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${localEscrow.length > 0 ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                            {localEscrow.length > 0 ? 'Processing' : 'Idle'}
                        </span>
                    </div>
                </div>

                {localEscrow.length > 0 ? (
                    <div className="space-y-5 relative max-h-[600px] overflow-y-auto scrollbar-hide pr-2">
                        {localEscrow.map((batch, idx) => {
                            const timeMatch = batch.status?.match(/\((\d+)s\)/);
                            const timeLeft = timeMatch ? parseInt(timeMatch[1]) : 0;
                            const totalTime = 15;
                            const progressPercent = timeMatch ? Math.max(5, Math.min(100, ((totalTime - timeLeft) / totalTime) * 100)) : 100;
                            const isComplete = progressPercent >= 100;

                            const isZK = batch.isShielded;

                            return (
                                <div key={batch.id || idx} className={`p-5 rounded-2xl border backdrop-blur-md relative overflow-hidden transition-all duration-500 ${isZK ? 'bg-[#1a0b1f]/80 border-fuchsia-500/30 shadow-[0_0_30px_rgba(217,70,239,0.05)]' : 'bg-[#0b131f]/80 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.05)]'}`}>

                                    {/* Top Progress Bar */}
                                    <div className="absolute top-0 left-0 h-1.5 w-full bg-black/50">
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out relative ${isZK ? 'bg-gradient-to-r from-purple-600 to-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.8)]' : 'bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]'}`}
                                            style={{ width: `${progressPercent}%` }}
                                        >
                                            <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/30 blur-[2px] -skew-x-12 animate-pulse"></div>
                                        </div>
                                    </div>

                                    {/* Radar Scanner Effect */}
                                    {!isComplete && (
                                        <div className={`absolute -inset-full h-full w-[200%] opacity-20 z-0 pointer-events-none animate-[spin_4s_linear_infinite] ${isZK ? 'bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,rgba(217,70,239,0.4)_50%,transparent_100%)]' : 'bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,rgba(59,130,246,0.4)_50%,transparent_100%)]'}`}></div>
                                    )}

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-2 border ${isZK ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                    {isZK ? '🛡️ ZK-SNARK SHIELD' : '🌐 PUBLIC MULTISEND'}
                                                </div>
                                                <h4 className="text-white font-bold text-lg">Batch {batch.id}</h4>
                                                <p className="text-xs text-slate-400 mt-1">{isZK ? 'Generating cryptographic proofs...' : 'Broadcasting array to L2...'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-white bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                                    {batch.amount} <span className="text-slate-400 text-xs">AlphaUSD</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col gap-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-medium uppercase">System Status</span>
                                                <span className={`${isZK ? 'text-fuchsia-400' : 'text-cyan-400'} font-bold font-mono`}>
                                                    {isComplete ? 'FINALIZING...' : batch.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-slate-600">TX HASH (COMMITMENT)</span>
                                                <span className="text-slate-400 font-mono truncate max-w-[150px]">{batch.zkCommitment}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-20 h-20 mb-4 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center bg-cyan-500/5 relative">
                            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-20"></div>
                            <span className="text-3xl filter grayscale opacity-50">🤖</span>
                        </div>
                        <h4 className="text-white font-bold mb-1">Daemon is standing by</h4>
                        <p className="text-xs text-slate-500 max-w-[200px]">Awaiting new batches. Network connection stable.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(TimeVault);
