import React from 'react';

interface BoardroomProps {
    boardroomRef: any; 
    awaitingTxs: any[]; 
    isAdmin: boolean; 
    usePhantomShield: boolean; 
    setUsePhantomShield: (val: boolean) => void;
    awaitingTotalAmountNum: number; 
    protocolFeeNum: number; 
    shieldFeeNum: number; 
    totalWithFee: string; 
    activeVaultToken: any;
    signAndApproveBatch: () => void; 
    isEncrypting: boolean; 
    removeAwaitingTx: (id: string | number) => void; 
    showToast: (type: 'success' | 'error', msg: string) => void;
}

function Boardroom(props: BoardroomProps) {
    if (props.awaitingTxs.length === 0) return null;

    // 🌟 SMART DETECTION: Check if we are interacting with OpenClaw Agents
    const isAgentMode = props.awaitingTxs.some(tx => tx.isDiscovery === true || (tx.note && tx.note.includes('A2A')));
    
    // 🌟 UNIFIED ECONOMICS: 0.2% Protocol Fee for all modes (max $5)
    const calculatedFee = props.protocolFeeNum;
    const finalTotalDeduction = props.awaitingTotalAmountNum + calculatedFee + (props.usePhantomShield ? props.shieldFeeNum : 0);

    return (
        <div ref={props.boardroomRef} className="relative z-20 mb-10 scroll-mt-20">
            {/* 🌟 Cyberpunk Container (Adapts color based on mode) */}
            <div className={`absolute -inset-[1px] bg-gradient-to-r rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none transition-all duration-500 ${isAgentMode ? 'from-fuchsia-500/40 via-purple-500/20 to-fuchsia-500/40' : 'from-amber-500/40 via-orange-500/20 to-amber-500/40'}`}></div>
            <div className={`absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 rounded-tl-xl z-10 pointer-events-none ${isAgentMode ? 'border-fuchsia-400/80' : 'border-amber-400/80'}`}></div>
            <div className={`absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 rounded-br-xl z-10 pointer-events-none ${isAgentMode ? 'border-fuchsia-400/80' : 'border-amber-400/80'}`}></div>
            <div className={`absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 rounded-tr-xl z-10 pointer-events-none ${isAgentMode ? 'border-fuchsia-400/80' : 'border-amber-400/80'}`}></div>
            <div className={`absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 rounded-bl-xl z-10 pointer-events-none ${isAgentMode ? 'border-fuchsia-400/80' : 'border-amber-400/80'}`}></div>

            <div className="p-8 flex flex-col border border-white/5 rounded-3xl relative z-10 shadow-inner overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, rgba(21,27,39,0.95) 0%, rgba(21,27,39,0.90) 100%)' }}>
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 pointer-events-none`} style={{ background: isAgentMode ? 'radial-gradient(ellipse at center, rgba(217,70,239,0.05) 0%, transparent 70%)' : 'radial-gradient(ellipse at center, rgba(245,158,11,0.05) 0%, transparent 70%)' }}></div>
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-white/[0.05] pb-6 relative z-10 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className={`p-2 rounded-xl shadow-lg ${isAgentMode ? 'bg-fuchsia-500/10 text-fuchsia-400 shadow-fuchsia-500/20' : 'bg-amber-500/10 text-amber-400 shadow-amber-500/20'}`}>
                                {isAgentMode ? '🏦' : '🛡️'}
                            </span>
                            {isAgentMode ? 'Escrow Vault' : 'The Boardroom'}
                            
                            {isAgentMode && (
                                <span className="ml-2 px-2.5 py-1 bg-fuchsia-500/20 text-fuchsia-300 text-[10px] rounded-lg uppercase tracking-widest border border-fuchsia-500/30 animate-pulse">
                                    Smart Contract Active
                                </span>
                            )}
                        </h2>
                        <p className={`text-sm mt-2 md:ml-14 ${isAgentMode ? 'text-fuchsia-400/80' : 'text-amber-400/80'}`}>
                            {isAgentMode 
                                ? "Funds will be securely locked in PayPol Escrow until the agent completes the task." 
                                : "Multi-Sig Validation Required. Awaiting cryptographic signature."}
                        </p>
                    </div>
                    <span className={`px-4 py-2 rounded-xl text-sm font-bold border shadow-md ${isAgentMode ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30 shadow-fuchsia-500/10' : 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10'}`}>
                        {props.awaitingTxs.length} Payloads Blocked
                    </span>
                </div>

                {/* Phantom Shield Premium Toggle */}
                {props.isAdmin && (
                    <div className="relative z-10 flex items-center justify-between mb-6 p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">👻</div>
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    Phantom Shield 
                                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 uppercase tracking-widest">Premium</span>
                                </h4>
                                <p className="text-xs text-purple-200/60 mt-0.5">Mask transaction amounts via ZK-Rollups.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={props.usePhantomShield} onChange={() => { props.setUsePhantomShield(!props.usePhantomShield); }} />
                            <div className="w-12 h-6 bg-black/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 border border-white/[0.1] shadow-inner"></div>
                        </label>
                    </div>
                )}

                {/* Queue Table */}
                <div className="overflow-x-auto relative z-10 mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5">
                                <th className="pb-4 pl-3">Recipient</th>
                                <th className="pb-4">Tempo Wallet Address</th>
                                <th className="pb-4 text-right pr-3">Amount</th>
                                <th className="pb-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {props.awaitingTxs.map((tx, i) => {
                                // Dynamically fetch real wallet from DB/state
                                const realWallet = tx.wallet_address || tx.recipientWallet || tx.wallet || "0x0000000000000000000000000000000000000000";
                                const displayWallet = realWallet.length > 20 ? `${realWallet.slice(0, 10)}...${realWallet.slice(-8)}` : realWallet;

                                return (
                                <tr key={tx.id || i} className="hover:bg-white/[0.03] transition-colors group">
                                    <td className="py-5 pl-3 text-sm font-semibold text-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isAgentMode ? 'bg-fuchsia-500' : 'bg-amber-500'}`}></span> 
                                            {tx.name}
                                        </div>
                                        {/* 🌟 ESCROW LOCK BADGE FOR AGENTS 🌟 */}
                                        {isAgentMode && (
                                            <div className="mt-1.5 ml-3.5">
                                                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 w-fit shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                    <span>🔒</span> Escrow Locked
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    
                                    <td className="py-5 font-mono text-sm text-slate-400">
                                        {displayWallet}
                                    </td>
                                    
                                    <td className="py-5 pr-3 text-right">
                                        {props.usePhantomShield ? (
                                            <div className="flex items-center justify-end gap-2 text-purple-400 animate-in fade-in zoom-in duration-300">
                                                <span className="text-sm">🔒</span>
                                                <span className="text-sm font-bold tracking-widest blur-[4px] select-none opacity-70">0.0000</span>
                                            </div>
                                        ) : (
                                            <div className="animate-in fade-in duration-300">
                                                <span className="text-sm font-bold text-white tabular-nums">{parseFloat(tx.amount).toFixed(4)}</span> 
                                                <span className="text-[10px] text-slate-500 ml-1">{tx.token || 'AlphaUSD'}</span>
                                            </div>
                                        )}
                                    </td>
                                    
                                    <td className="py-5 pr-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        {props.isAdmin && (
                                            <button onClick={() => props.removeAwaitingTx(tx.id)} className="w-6 h-6 inline-flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-md transition-all shadow-sm">✕</button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                {/* Footer Actions & Fees */}
                <div className="relative z-10 pt-6 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-end gap-6">
                    <div className="w-full md:w-auto bg-black/40 p-5 rounded-2xl border border-white/[0.05] min-w-[320px]">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Total Payload:</span>
                            <span className="text-white font-bold">{props.awaitingTotalAmountNum.toFixed(4)}</span>
                        </div>
                        
                        {/* 🌟 PROTOCOL FEE DISPLAY (0.2%, max $5) 🌟 */}
                        <div className="flex justify-between text-sm mb-3">
                            <span className="text-slate-400 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isAgentMode ? 'bg-fuchsia-500 animate-pulse' : 'bg-indigo-500'}`}></span>
                                Protocol Fee (0.2%):
                            </span>
                            <span className="text-amber-400 font-bold">+{calculatedFee.toFixed(4)}</span>
                        </div>
                        
                        {props.usePhantomShield && (
                            <div className="flex justify-between text-sm mb-3 animate-in slide-in-from-top-2 fade-in duration-300">
                                <span className="text-slate-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>Shield Premium:</span>
                                <span className="text-purple-400 font-bold">+{props.shieldFeeNum.toFixed(4)}</span>
                            </div>
                        )}

                        <div className="border-b border-white/[0.05] mb-3 pb-1"></div>
                        <div className="flex justify-between text-base">
                            <span className="text-slate-300 font-bold">Total Deduction:</span>
                            <span className="text-white font-black">{finalTotalDeduction.toFixed(4)} {props.activeVaultToken.symbol}</span>
                        </div>
                    </div>

                    {/* Deploy Button */}
                    {props.isAdmin ? (
                        <button 
                            onClick={props.signAndApproveBatch} 
                            disabled={props.isEncrypting} 
                            className={`w-full md:w-auto px-8 py-4 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-3 ${props.isEncrypting ? 'bg-slate-700 opacity-50 cursor-not-allowed' : props.usePhantomShield ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:scale-[1.02]' : isAgentMode ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 shadow-[0_0_25px_rgba(217,70,239,0.4)] hover:scale-[1.02]' : 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02]'}`}
                        >
                            {props.isEncrypting ? '⏳ Working...' : isAgentMode ? `✍️ Sign & Move to Escrow (${props.awaitingTxs.length})` : `✍️ Sign & Execute Batch (${props.awaitingTxs.length})`}
                        </button>
                    ) : (
                        <div className="w-full md:w-auto px-8 py-4 bg-black/40 border border-white/[0.05] text-slate-500 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">🔒 Awaiting Administrator Signature</div>
                    )}
                </div>
            </div>
        </div>
    );
}
export default React.memo(Boardroom);
