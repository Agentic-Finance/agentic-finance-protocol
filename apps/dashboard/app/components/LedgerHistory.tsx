import React from 'react';

interface LedgerHistoryProps { 
    pendingTxs: any[]; 
    history: any[]; 
    exportLedgerToCSV: () => void; 
    expandedTx: string | null;
    setExpandedTx: (hash: string | null) => void;
    historyRef: any;
}

function LedgerHistory({ pendingTxs, history, exportLedgerToCSV, expandedTx, setExpandedTx, historyRef }: LedgerHistoryProps) {
    const toggleExpand = (hash: string) => setExpandedTx(expandedTx === hash ? null : hash);

    return (
        <div ref={historyRef} className="relative z-20 mb-10">
            {/* Ambient Background Glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-indigo-500/20 rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none"></div>
            
            <div className="p-8 flex flex-col border border-white/5 rounded-3xl relative z-10 bg-[#0B0F17]/95 shadow-inner backdrop-blur-3xl overflow-hidden min-h-[500px]">
                
                {/* Header Section */}
                <div className="flex flex-wrap md:flex-nowrap justify-between items-center border-b border-white/10 pb-6 mb-6 gap-4">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">🗄️</span> 
                            Settled Batches & History
                        </h3>
                        <p className="text-sm text-slate-400 mt-2 ml-14">Comprehensive ledger of all executed protocol payloads.</p>
                    </div>
                    <button 
                        onClick={exportLedgerToCSV} 
                        className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-sm font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export CSV
                    </button>
                </div>

                {/* Ledger List */}
                <div className="space-y-4 relative">
                    {history.map((tx, i) => {
                        const isExpanded = expandedTx === tx.hash;
                        const recipientCount = tx.breakdown ? tx.breakdown.length : 1;
                        const isShieldedBatch = tx.isShielded || (tx.breakdown && tx.breakdown.some((b: any) => b.isShielded || (b.note && b.note.includes('Shielded'))));

                        return (
                            <div key={tx.hash || i} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'bg-black/60 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.05)]' : 'bg-[#0f1522] border-white/5 hover:border-white/10'}`}>
                                
                                {/* 🌟 BATCH SUMMARY ROW */}
                                <div 
                                    onClick={() => toggleExpand(tx.hash)}
                                    className={`p-5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 cursor-pointer hover:bg-white/[0.02] transition-colors ${tx.isJustSettled ? 'animate-[pulse_2s_ease-in-out_3] bg-indigo-500/10' : ''}`}
                                >
                                    <div className="flex items-center gap-5 min-w-[300px]">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${isShieldedBatch ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                            {isShieldedBatch ? '🛡️' : '🌐'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-white font-bold text-lg">
                                                    {recipientCount > 1 ? `Batch Transfer (${recipientCount} Recipients)` : 'Single Disbursal'}
                                                </h4>
                                                {/* CHANGED L2 to L1 */}
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${isShieldedBatch ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                    {isShieldedBatch ? 'ZK-SHIELDED' : 'PUBLIC L1'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-mono">{tx.date}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 flex-1 justify-end">
                                        <div className="text-right hidden md:block">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Source Hash</p>
                                            <p className="text-xs font-mono text-slate-400 max-w-[120px] truncate">{tx.hash}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Volume</p>
                                            <p className="text-lg font-bold text-white">
                                                {tx.amount} <span className="text-xs text-slate-400">{tx.token || 'AlphaUSD'}</span>
                                            </p>
                                        </div>
                                        <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-indigo-500/20 text-indigo-400 rotate-180' : 'bg-white/5 text-slate-400'}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* 🌟 DETAILED BREAKDOWN ACCORDION */}
                                <div className={`transition-all duration-500 ease-in-out border-t border-white/5 bg-[#070a0f] ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden border-transparent'}`}>
                                    <div className="p-6 overflow-y-auto max-h-[600px] scrollbar-hide">
                                        <div className="grid grid-cols-12 gap-4 px-4 pb-3 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <div className="col-span-3">Recipient Identity</div>
                                            <div className="col-span-4">Wallet / ZK Destination</div>
                                            <div className="col-span-2 text-right">Amount</div>
                                            <div className="col-span-3 text-right">Execution Proof</div>
                                        </div>

                                        {tx.breakdown && tx.breakdown.map((b: any, bIdx: number) => (
                                            <div key={bIdx} className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-white/[0.02] items-center hover:bg-white/[0.01] transition-colors">
                                                <div className="col-span-3 flex flex-col">
                                                    <span className="text-sm font-bold text-slate-200">{b.name || 'Unknown Entity'}</span>
                                                    <span className="text-[10px] text-slate-500 mt-0.5">{b.note || 'Standard Disbursal'}</span>
                                                </div>
                                                <div className="col-span-4">
                                                    <span className="text-xs font-mono text-slate-400 bg-black/50 px-2 py-1 rounded border border-white/5">
                                                        {b.address || b.wallet_address}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    <span className="text-sm font-bold text-emerald-400">{b.amount}</span>
                                                </div>
                                                <div className="col-span-3 flex justify-end">
                                                    {/* CHANGED L2 to L1 in text, uses zkCommitment for the link */}
                                                    <a 
                                                        href={`https://explore.moderato.tempo.xyz/tx/${b.zkCommitment || b.txHash || tx.hash}`} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className={`text-[10px] font-bold transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isShieldedBatch ? 'bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500/20 border-fuchsia-500/30' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/30'}`}
                                                    >
                                                        {isShieldedBatch ? 'View ZK Proof' : 'View L1 TX'}
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* CHANGED L2 to L1 */}
                                    <div className="bg-black/80 p-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500 px-10">
                                        <span>Total Batch Execution Cost Covered by Daemon</span>
                                        <span className="font-mono text-slate-400">Tempo Network (L1) Validated</span>
                                    </div>
                                </div>

                            </div>
                        );
                    })}

                    {history.length === 0 && (
                        <div className="p-16 flex flex-col items-center justify-center text-center opacity-60 bg-black/20 rounded-2xl border border-dashed border-white/10">
                            <span className="text-4xl mb-4 opacity-50 grayscale">📂</span>
                            <h4 className="text-white font-bold mb-1">No execution history found</h4>
                            <p className="text-sm text-slate-500 max-w-[250px]">Once the Daemon processes payloads, they will be securely logged here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
export default React.memo(LedgerHistory);
