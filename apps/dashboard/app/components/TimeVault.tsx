'use client';

import React, { useState, useEffect } from 'react';
import { CpuChipIcon, ShieldCheckIcon, GlobeAltIcon } from './icons';

interface TimeVaultProps {
    localEscrow: any[];
}

function TimeVault({ localEscrow }: TimeVaultProps) {
    // Timer lives here now - only TimeVault re-renders every second, NOT the entire page
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));

    useEffect(() => {
        if (localEscrow.length === 0) return;
        let raf: number;
        let lastUpdate = 0;
        const tick = (time: number) => {
            if (time - lastUpdate >= 1000) {
                if (!document.hidden) setNow(Math.floor(Date.now() / 1000));
                lastUpdate = time;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [localEscrow.length]);

    return (
        <div className="agt-card p-5 sm:p-6 flex flex-col min-h-[300px]" style={{ '--agt-accent': 'var(--agt-blue)' } as React.CSSProperties}>

            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-4 mb-5">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="agt-icon-box" style={{ color: 'var(--agt-blue)' }}>
                        <CpuChipIcon className="w-5 h-5" />
                    </span>
                    Daemon Queue
                </h3>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className={`${localEscrow.length > 0 ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full opacity-75`} style={{ backgroundColor: localEscrow.length > 0 ? 'var(--agt-mint)' : undefined, ...(localEscrow.length === 0 ? { backgroundColor: 'rgb(100,116,139)' } : {}) }}></span>
                        <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: localEscrow.length > 0 ? 'var(--agt-mint)' : 'rgb(100,116,139)' }}></span>
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                        {localEscrow.length > 0 ? 'Processing' : 'Idle'}
                    </span>
                </div>
            </div>

            {localEscrow.length > 0 ? (
                <div className="space-y-5 relative max-h-[400px] sm:max-h-[600px] overflow-y-auto scrollbar-hide pr-2">
                    {localEscrow.map((batch, idx) => {
                        const timeMatch = batch.status?.match(/\((\d+)s\)/);
                        const timeLeft = timeMatch ? parseInt(timeMatch[1]) : 0;
                        const totalTime = 15;
                        // If no timer in status, show indeterminate progress (not 100%)
                        const progressPercent = timeMatch
                            ? Math.max(5, Math.min(100, ((totalTime - timeLeft) / totalTime) * 100))
                            : (batch.status?.includes('Generating') ? 60 : 30);
                        const isComplete = timeMatch ? progressPercent >= 100 : false;

                        const isZK = batch.isShielded;

                        return (
                            <div key={batch.id || idx} className={`p-5 rounded-2xl border relative overflow-hidden transition-all duration-500`} style={{
                                borderColor: isZK ? 'color-mix(in srgb, var(--agt-pink) 30%, transparent)' : 'color-mix(in srgb, var(--agt-blue) 30%, transparent)',
                                background: isZK ? 'radial-gradient(ellipse at top, rgba(26,11,31,0.85) 0%, rgba(26,11,31,0.80) 100%)' : 'radial-gradient(ellipse at top, rgba(11,19,31,0.85) 0%, rgba(11,19,31,0.80) 100%)'
                            }}>

                                {/* Top Progress Bar */}
                                <div className="absolute top-0 left-0 h-1.5 w-full bg-black/50">
                                    <div
                                        className="h-full transition-all duration-1000 ease-out relative"
                                        style={{
                                            width: `${progressPercent}%`,
                                            background: isZK
                                                ? 'linear-gradient(to right, var(--agt-pink), var(--agt-pink))'
                                                : 'linear-gradient(to right, var(--agt-blue), var(--agt-blue))'
                                        }}
                                    >
                                        <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/30 blur-[2px] -skew-x-12 animate-pulse"></div>
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="agt-badge" style={{
                                                backgroundColor: isZK ? 'color-mix(in srgb, var(--agt-pink) 10%, transparent)' : 'color-mix(in srgb, var(--agt-blue) 10%, transparent)',
                                                color: isZK ? 'var(--agt-pink)' : 'var(--agt-blue)',
                                                borderColor: isZK ? 'color-mix(in srgb, var(--agt-pink) 20%, transparent)' : 'color-mix(in srgb, var(--agt-blue) 20%, transparent)',
                                            }}>
                                                {isZK ? <><ShieldCheckIcon className="w-3.5 h-3.5" /> ZK-SNARK SHIELD</> : <><GlobeAltIcon className="w-3.5 h-3.5" /> PUBLIC MULTISEND</>}
                                            </div>
                                            <h4 className="text-white font-bold text-lg mt-2">Batch {batch.id}</h4>
                                            <p className="text-xs text-slate-400 mt-1">{isZK ? `Generating cryptographic proofs${batch.count > 1 ? ` for ${batch.count} recipients` : ''}...` : `Broadcasting${batch.count > 1 ? ` ${batch.count} transfers` : ''} to L1...`}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                                {batch.amount} <span className="text-slate-400 text-xs">AlphaUSD</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-black/40 rounded-xl p-3 border border-white/[0.08] flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-medium uppercase">System Status</span>
                                            <span className="font-bold font-mono" style={{ color: isZK ? 'var(--agt-pink)' : 'var(--agt-blue)' }}>
                                                {isComplete ? 'FINALIZING...' : batch.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
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
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-16 h-16 mb-4 rounded-full border border-dashed flex items-center justify-center" style={{ borderColor: 'color-mix(in srgb, var(--agt-blue) 25%, transparent)', backgroundColor: 'color-mix(in srgb, var(--agt-blue) 5%, transparent)' }}>
                        <CpuChipIcon className="w-7 h-7" style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }} />
                    </div>
                    <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--pp-text-secondary)' }}>Daemon is standing by</h4>
                    <p className="text-[11px] max-w-[200px]" style={{ color: 'var(--pp-text-muted)' }}>Awaiting new batches. Network connection stable.</p>
                </div>
            )}
        </div>
    );
}

export default React.memo(TimeVault);
