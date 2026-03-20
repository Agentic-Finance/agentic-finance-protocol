'use client';

import React, { useState } from 'react';
import Pagination, { usePagination } from './Pagination';
import { WalletIcon, BankIcon, CpuChipIcon, UsersIcon, ShieldCheckIcon, GlobeAltIcon, ClipboardIcon, CheckCircleIcon } from './icons';

// ── Types ─────────────────────────────────────────────────

interface BreakdownItem {
    name: string;
    address: string;
    wallet_address?: string;
    amount: string | number;
    note: string;
    zkCommitment?: string;
    txHash?: string;
    depositTxHash?: string;
    payoutTxHash?: string;
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
    { label: 'Wallet', icon: WalletIcon, desc: 'User wallet' },
    { label: 'Vault', icon: BankIcon, desc: 'Agentic Finance Vault' },
    { label: 'Daemon', icon: CpuChipIcon, desc: 'Processed by Daemon' },
    { label: 'Recipients', icon: UsersIcon, desc: 'Delivered' },
];

function FundFlowBar({ isShielded }: { isShielded: boolean }) {
    const accentVar = isShielded ? 'var(--agt-pink)' : 'var(--agt-blue)';
    return (
        <div className="flex items-center gap-0 w-full my-4">
            {FLOW_STEPS.map((step, idx) => {
                const isLast = idx === FLOW_STEPS.length - 1;
                const IconComponent = step.icon;
                return (
                    <React.Fragment key={step.label}>
                        <div className="flex flex-col items-center min-w-0 flex-shrink-0">
                            <div className="agt-icon-box w-10 h-10 rounded-full flex items-center justify-center border-2" style={{
                                backgroundColor: `color-mix(in srgb, ${accentVar} 10%, transparent)`,
                                borderColor: `color-mix(in srgb, ${accentVar} 40%, transparent)`,
                                color: accentVar,
                            }}>
                                <IconComponent className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">{step.label}</span>
                        </div>
                        {!isLast && (
                            <div className="flex-1 flex items-center mx-1 -mt-4">
                                <div className="h-0.5 w-full relative" style={{
                                    background: `linear-gradient(to right, color-mix(in srgb, ${accentVar} 60%, transparent), color-mix(in srgb, ${accentVar} 30%, transparent))`,
                                }}>
                                    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px]" style={{
                                        borderLeftColor: `color-mix(in srgb, ${accentVar} 60%, transparent)`,
                                    }} />
                                    <div className="absolute inset-0 animate-pulse" style={{
                                        backgroundColor: `color-mix(in srgb, ${accentVar} 30%, transparent)`,
                                    }} />
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
    const accentVar = isShielded ? 'var(--agt-pink)' : 'var(--agt-blue)';

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
            batch.isJustSettled
                ? 'animate-[pulse_2s_ease-in-out_3]'
                : 'border-white/5 bg-[var(--pp-bg-elevated)]/80'
        }`} style={batch.isJustSettled ? {
            borderColor: `color-mix(in srgb, ${accentVar} 40%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${accentVar} 3%, transparent)`,
        } : undefined}>
            {/* ── Summary Row (clickable) ────────────── */}
            <button
                onClick={onToggle}
                className="w-full p-5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-4 min-w-[240px]">
                    <div className="agt-icon-box w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0" style={{
                        backgroundColor: `color-mix(in srgb, ${accentVar} 10%, transparent)`,
                        borderColor: `color-mix(in srgb, ${accentVar} 20%, transparent)`,
                        color: accentVar,
                    }}>
                        {isShielded ? <ShieldCheckIcon className="w-6 h-6" /> : <GlobeAltIcon className="w-6 h-6" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-bold text-base">
                                {recipientCount > 1 ? `${recipientCount} Recipients` : 'Single Transfer'}
                            </h4>
                            <span className="agt-badge" style={{
                                backgroundColor: `color-mix(in srgb, ${accentVar} 10%, transparent)`,
                                color: accentVar,
                                borderColor: `color-mix(in srgb, ${accentVar} 20%, transparent)`,
                            }}>
                                {isShielded ? 'ZK-SHIELDED' : 'PUBLIC'}
                            </span>
                            <span className="agt-badge" style={{
                                backgroundColor: 'color-mix(in srgb, var(--agt-mint) 10%, transparent)',
                                color: 'var(--agt-mint)',
                                borderColor: 'color-mix(in srgb, var(--agt-mint) 20%, transparent)',
                            }}>
                                SETTLED
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{timeAgo(batch.date)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 flex-1 justify-end">
                    <div className="text-right hidden sm:block">
                        <p className="text-[11px] text-slate-500 font-bold uppercase mb-0.5">Batch Hash</p>
                        <p className="text-[11px] font-mono text-slate-400">{truncHash(batch.hash)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] text-slate-500 font-bold uppercase mb-0.5">Total Disbursed</p>
                        <p className="text-lg font-black text-white">{totalAmount.toFixed(3)} <span className="text-xs text-slate-400">{batch.token || 'AlphaUSD'}</span></p>
                    </div>
                    <div className={`p-2 rounded-full transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} style={{
                        backgroundColor: isExpanded ? 'color-mix(in srgb, var(--agt-orange) 20%, transparent)' : 'rgba(255,255,255,0.05)',
                        color: isExpanded ? 'var(--agt-orange)' : 'rgb(148,163,184)',
                    }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </button>

            {/* ── Expanded Detail Panel ────────────── */}
            <div className={`transition-all duration-500 ease-in-out bg-[var(--pp-bg-primary)] ${isExpanded ? 'max-h-[1200px] opacity-100 border-t border-white/5' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-6">

                    {/* Fund Flow Timeline */}
                    <div className="mb-6">
                        <h5 className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1">Fund Flow</h5>
                        <FundFlowBar isShielded={isShielded} />
                    </div>

                    {/* Recipient Breakdown Table */}
                    <div className="mb-5">
                        <h5 className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-3">Recipient Breakdown</h5>

                        <div className="overflow-x-auto -mx-2 px-2">
                        <div className="min-w-[600px]">
                        <div className="grid grid-cols-12 gap-3 px-4 pb-3 border-b border-white/5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                                    <span className="text-[11px] text-slate-500 truncate mt-0.5">{b.note || 'Standard Transfer'}</span>
                                </div>
                                <div className="col-span-4">
                                    <span className="text-[11px] font-mono text-slate-400 bg-black/50 px-2 py-1 rounded border border-white/5 inline-block max-w-full truncate">
                                        {b.address || b.wallet_address || '-'}
                                    </span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-sm font-bold" style={{ color: 'var(--agt-mint)' }}>{b.amount}</span>
                                    <span className="text-[11px] text-slate-500 ml-1">{batch.token || 'AlphaUSD'}</span>
                                </div>
                                <div className="col-span-1 text-center">
                                    <CheckCircleIcon className="w-4 h-4 inline-block" style={{ color: 'var(--agt-mint)' }} />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <a
                                        href={`https://explore.moderato.tempo.xyz/tx/${b.txHash || b.payoutTxHash || b.depositTxHash || batch.hash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] font-bold transition-all flex items-center gap-1 px-2.5 py-1.5 rounded-lg border"
                                        style={{
                                            backgroundColor: `color-mix(in srgb, ${accentVar} 10%, transparent)`,
                                            color: accentVar,
                                            borderColor: `color-mix(in srgb, ${accentVar} 30%, transparent)`,
                                        }}
                                    >
                                        {isShielded ? 'ZK Proof' : 'L1 TX'}
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                </div>
                            </div>
                        ))}
                        </div>
                        </div>
                    </div>

                    {/* Summary Footer */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-[11px] text-slate-500 font-bold uppercase mb-1">Total Volume</p>
                                <p className="text-sm font-bold text-white">{totalAmount.toFixed(3)} <span className="text-[11px] text-slate-400">{batch.token || 'AlphaUSD'}</span></p>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-bold uppercase mb-1">Recipients</p>
                                <p className="text-sm font-bold text-white">{recipientCount}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-bold uppercase mb-1">Method</p>
                                <p className="text-sm font-bold" style={{ color: accentVar }}>{isShielded ? 'ZK-Shielded' : 'Public L1'}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-bold uppercase mb-1">Network</p>
                                <p className="text-sm font-bold text-slate-300">Tempo L1</p>
                            </div>
                        </div>

                        {/* Agent execution hint for A2A batches */}
                        {batch.breakdown?.some(b => b.note?.includes('A2A')) && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--agt-pink)' }} />
                                <span className="font-semibold" style={{ color: 'color-mix(in srgb, var(--agt-pink) 80%, transparent)' }}>
                                    Escrow locked — agent is executing your task. Check the Agent tab for live status.
                                </span>
                            </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[11px] text-slate-500">
                            <span>Batch TX: <span className="font-mono text-slate-400">{truncHash(batch.hash)}</span></span>
                            <a
                                href={`https://explore.moderato.tempo.xyz/tx/${batch.hash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold flex items-center gap-1"
                                style={{ color: 'var(--agt-orange)' }}
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
    const { paginatedItems: paginatedSettlements, currentPage, totalPages, setCurrentPage, totalItems, itemsPerPage } = usePagination(settlements, 10);

    // Auto-expand newly settled batch
    React.useEffect(() => {
        const justSettled = settlements.find(s => s.isJustSettled);
        if (justSettled) {
            setExpandedHash(justSettled.hash);
        }
    }, [settlements]);

    return (
        <div ref={settlementRef} className="agt-card agt-card-accent-orange p-5 sm:p-6 scroll-mt-20" style={{ '--agt-accent': 'var(--agt-orange)' } as React.CSSProperties}>

            {/* Header */}
            <div className="flex flex-wrap md:flex-nowrap justify-between items-center border-b border-white/[0.06] pb-5 mb-5 gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="agt-icon-box" style={{ color: 'var(--agt-orange)' }}>
                            <ClipboardIcon className="w-5 h-5" />
                        </span>
                        Settled Batches
                    </h3>
                    <p className="text-sm text-slate-400 mt-2 ml-14">On-chain settlement history (24h).</p>
                </div>
                <span className="agt-badge" style={{
                    backgroundColor: 'color-mix(in srgb, var(--agt-orange) 15%, transparent)',
                    color: 'var(--agt-orange)',
                    borderColor: 'color-mix(in srgb, var(--agt-orange) 20%, transparent)',
                }}>
                    {settlements.length} {settlements.length === 1 ? 'batch' : 'batches'}
                </span>
            </div>

            {/* Batch Cards or Empty State */}
            {settlements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                    <div className="w-16 h-16 mb-4 rounded-full border border-dashed flex items-center justify-center" style={{ borderColor: 'color-mix(in srgb, var(--agt-orange) 30%, transparent)', backgroundColor: 'color-mix(in srgb, var(--agt-orange) 5%, transparent)' }}>
                        <ClipboardIcon className="w-7 h-7 text-slate-500" />
                    </div>
                    <h4 className="text-white font-bold mb-1">No settlements yet</h4>
                    <p className="text-xs text-slate-500 max-w-[280px]">Completed batches will appear here after daemon processes your payroll.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {paginatedSettlements.map((batch) => (
                        <BatchCard
                            key={batch.hash}
                            batch={batch}
                            isExpanded={expandedHash === batch.hash}
                            onToggle={() => setExpandedHash(prev => prev === batch.hash ? null : batch.hash)}
                        />
                    ))}
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} />
                </div>
            )}
        </div>
    );
}

export default React.memo(SettlementReceipt);
