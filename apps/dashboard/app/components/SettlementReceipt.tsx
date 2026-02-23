'use client';

import React, { useState } from 'react';

// ── Types ─────────────────────────────────────────────────

interface BreakdownItem {
    name: string;
    address: string;
    wallet_address?: string;
    amount: string | number;
    note: string;
    zkCommitment?: string;
    txHash?: string;
    isShielded?: boolean;
}

interface SettledBatch {
    hash: string;
    date: string;
    amount: string | number;
    token: string;
    isShielded: boolean;
    breakdown: BreakdownItem[];
    isJustSettled?: boolean;
    isLocalBatch?: boolean;
}

interface SettlementReceiptProps {
    settlements: SettledBatch[];
    settlementRef: React.RefObject<HTMLDivElement | null>;
}

// ── Helpers ───────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function truncHash(hash: string | null | undefined): string {
    if (!hash) return '-';
    if (hash.length <= 16) return hash;
    return hash.substring(0, 10) + '...' + hash.substring(hash.length - 6);
}

// ── Fund Flow Step ────────────────────────────────────────

const FLOW_STEPS = [
    { label: 'Wallet', icon: '👛', desc: 'User wallet' },
    { label: 'Vault', icon: '🏦', desc: 'PayPol Vault' },
    { label: 'Daemon', icon: '⚙️', desc: 'Processed by Daemon' },
    { label: 'Recipients', icon: '👥', desc: 'Delivered' },
];

function FundFlowBar({ isShielded }: { isShielded: boolean }) {
    const accentColor = isShielded ? 'fuchsia' : 'amber';
    return (
        <div className="flex items-center gap-0 w-full my-4">
            {FLOW_STEPS.map((step, idx) => {
                const isLast = idx === FLOW_STEPS.length - 1;
                return (
                    <React.Fragment key={step.label}>
                        <div className="flex flex-col items-center min-w-0 flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 bg-${accentColor}-500/10 border-${accentColor}-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]`}>
                                {step.icon}
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">{step.label}</span>
                        </div>
                        {!isLast && (
                            <div className="flex-1 flex items-center mx-1 -mt-4">
                                <div className={`h-0.5 w-full bg-gradient-to-r ${isShielded ? 'from-fuchsia-500/60 to-fuchsia-400/30' : 'from-amber-500/60 to-amber-400/30'} relative`}>
                                    <div className={`absolute top-1/2 right-0 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ${isShielded ? 'border-l-[6px] border-l-fuchsia-500/60' : 'border-l-[6px] border-l-amber-500/60'}`} />
                                    <div className={`absolute inset-0 ${isShielded ? 'bg-fuchsia-400/30' : 'bg-amber-400/30'} animate-pulse`} />
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ── Single Batch Card ─────────────────────────────────────

function BatchCard({ batch, isExpanded, onToggle }: {
    batch: SettledBatch;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const recipientCount = batch.breakdown?.length || 1;
    const totalAmount = typeof batch.amount === 'number' ? batch.amount : parseFloat(batch.amount) || 0;
    const isShielded = batch.isShielded;

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
            batch.isJustSettled
                ? `animate-[pulse_2s_ease-in-out_3] ${isShielded ? 'border-fuchsia-500/40 bg-fuchsia-500/[0.03]' : 'border-amber-500/40 bg-amber-500/[0.03]'}`
                : 'border-white/5 bg-[#0f1522]/80'
        }`}>
            {/* ── Summary Row (clickable) ────────────── */}
            <button
                onClick={onToggle}
                className="w-full p-5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-4 min-w-[240px]">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner flex-shrink-0 ${
                        isShielded
                            ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                        {isShielded ? '🛡️' : '🌐'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-bold text-base">
                                {recipientCount > 1 ? `${recipientCount} Recipients` : 'Single Transfer'}
                            </h4>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                isShielded
                                    ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                                {isShielded ? 'ZK-SHIELDED' : 'PUBLIC'}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                SETTLED
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500">{timeAgo(batch.date)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 flex-1 justify-end">
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Batch Hash</p>
                        <p className="text-[10px] font-mono text-slate-400">{truncHash(batch.hash)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Total Disbursed</p>
                        <p className="text-lg font-black text-white">{totalAmount.toFixed(3)} <span className="text-xs text-slate-400">{batch.token || 'AlphaUSD'}</span></p>
                    </div>
                    <div className={`p-2 rounded-full transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'bg-amber-500/20 text-amber-400 rotate-180' : 'bg-white/5 text-slate-400'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </button>

            {/* ── Expanded Detail Panel ────────────── */}
            <div className={`transition-all duration-500 ease-in-out border-t border-white/5 bg-[#070a0f] ${isExpanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden border-transparent'}`}>
                <div className="p-6">

                    {/* Fund Flow Timeline */}
                    <div className="mb-6">
                        <h5 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Fund Flow</h5>
                        <FundFlowBar isShielded={isShielded} />
                    </div>

                    {/* Recipient Breakdown Table */}
                    <div className="mb-5">
                        <h5 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Recipient Breakdown</h5>

                        <div className="grid grid-cols-12 gap-3 px-4 pb-3 border-b border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            <div className="col-span-3">Identity</div>
                            <div className="col-span-4">Wallet</div>
                            <div className="col-span-2 text-right">Amount</div>
                            <div className="col-span-1 text-center">Status</div>
                            <div className="col-span-2 text-right">Proof</div>
                        </div>

                        {batch.breakdown?.map((b, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-white/[0.02] items-center hover:bg-white/[0.01] transition-colors">
                                <div className="col-span-3 flex flex-col min-w-0">
                                    <span className="text-sm font-bold text-slate-200 truncate">{b.name || 'Unknown'}</span>
                                    <span className="text-[9px] text-slate-500 truncate mt-0.5">{b.note || 'Standard Transfer'}</span>
                                </div>
                                <div className="col-span-4">
                                    <span className="text-[10px] font-mono text-slate-400 bg-black/50 px-2 py-1 rounded border border-white/5 inline-block max-w-full truncate">
                                        {b.address || b.wallet_address || '-'}
                                    </span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-sm font-bold text-emerald-400">{b.amount}</span>
                                    <span className="text-[9px] text-slate-500 ml-1">{batch.token || 'AlphaUSD'}</span>
                                </div>
                                <div className="col-span-1 text-center">
                                    <span className="text-emerald-400 text-xs" title="Delivered">{'✅'}</span>
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <a
                                        href={`https://explore.moderato.tempo.xyz/tx/${b.zkCommitment || b.txHash || batch.hash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`text-[9px] font-bold transition-all flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                                            isShielded
                                                ? 'bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500/20 border-fuchsia-500/30'
                                                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30'
                                        }`}
                                    >
                                        {isShielded ? 'ZK Proof' : 'L1 TX'}
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Footer */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Total Volume</p>
                                <p className="text-sm font-bold text-white">{totalAmount.toFixed(3)} <span className="text-[10px] text-slate-400">{batch.token || 'AlphaUSD'}</span></p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Recipients</p>
                                <p className="text-sm font-bold text-white">{recipientCount}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Method</p>
                                <p className={`text-sm font-bold ${isShielded ? 'text-fuchsia-400' : 'text-amber-400'}`}>{isShielded ? 'ZK-Shielded' : 'Public L1'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Network</p>
                                <p className="text-sm font-bold text-slate-300">Tempo L1</p>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500">
                            <span>Batch TX: <span className="font-mono text-slate-400">{truncHash(batch.hash)}</span></span>
                            <a
                                href={`https://explore.moderato.tempo.xyz/tx/${batch.hash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                            >
                                View on Explorer
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────

function SettlementReceipt({ settlements, settlementRef }: SettlementReceiptProps) {
    const [expandedHash, setExpandedHash] = useState<string | null>(
        settlements.length > 0 ? settlements[0]?.hash : null
    );

    // Auto-expand newly settled batch
    React.useEffect(() => {
        const justSettled = settlements.find(s => s.isJustSettled);
        if (justSettled) {
            setExpandedHash(justSettled.hash);
        }
    }, [settlements]);

    if (settlements.length === 0) return null;

    return (
        <div ref={settlementRef} className="relative z-20 scroll-mt-20">
            {/* Ambient Border Glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none"></div>

            <div className="p-8 flex flex-col border border-white/5 rounded-3xl relative z-10 bg-[#0B0F17]/95 shadow-inner backdrop-blur-3xl overflow-hidden">

                {/* Header */}
                <div className="flex flex-wrap md:flex-nowrap justify-between items-center border-b border-white/10 pb-6 mb-6 gap-4">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">{'📋'}</span>
                            Settlement Receipt
                        </h3>
                        <p className="text-sm text-slate-400 mt-2 ml-14">Real-time transparency for recent settlements (24h).</p>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20">
                        {settlements.length} {settlements.length === 1 ? 'batch' : 'batches'}
                    </span>
                </div>

                {/* Batch Cards */}
                <div className="space-y-4">
                    {settlements.map((batch) => (
                        <BatchCard
                            key={batch.hash}
                            batch={batch}
                            isExpanded={expandedHash === batch.hash}
                            onToggle={() => setExpandedHash(prev => prev === batch.hash ? null : batch.hash)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default React.memo(SettlementReceipt);
