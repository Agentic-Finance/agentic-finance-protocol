import React from 'react';
import { BankIcon, ShieldCheckIcon, ShieldKeyIcon, LockIcon, XMarkIcon, ClockIcon, BoltIcon } from './icons';

interface BoardroomProps {
    boardroomRef: React.RefObject<HTMLDivElement | null>;
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

    // SMART DETECTION: Check if we are interacting with OpenClaw Agents
    const isAgentMode = props.awaitingTxs.some(tx => tx.isDiscovery === true || (tx.note && tx.note.includes('A2A')));

    // UNIFIED ECONOMICS: 0.2% Protocol Fee for all modes (max $5)
    const calculatedFee = props.protocolFeeNum;
    const finalTotalDeduction = props.awaitingTotalAmountNum + calculatedFee + (props.usePhantomShield ? props.shieldFeeNum : 0);

    return (
        <div ref={props.boardroomRef} className="relative z-20 mb-10 scroll-mt-20">
            <div className={`agt-card ${isAgentMode ? 'agt-card-accent-pink' : ''} p-4 sm:p-8 flex flex-col relative overflow-hidden`}>

                {/* HEADER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-white/[0.05] pb-6 relative z-10 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--pp-text-primary)' }}>
                            <span className={`agt-icon-box ${isAgentMode ? 'agt-icon-box-pink' : 'agt-icon-box-orange'}`}>
                                {isAgentMode ? <BankIcon className="w-5 h-5" /> : <ShieldCheckIcon className="w-5 h-5" />}
                            </span>
                            {isAgentMode ? 'Escrow Vault' : 'The Boardroom'}

                            {isAgentMode && (
                                <span className="agt-badge agt-badge-pink ml-2 text-[11px] uppercase tracking-widest animate-pulse">
                                    Smart Contract Active
                                </span>
                            )}
                        </h2>
                        <p className="text-sm mt-2 md:ml-14" style={{ color: isAgentMode ? 'var(--agt-pink)' : 'var(--agt-orange)' }}>
                            {isAgentMode
                                ? "Funds will be securely locked in Agentic Finance Escrow until the agent completes the task."
                                : "Multi-Sig Validation Required. Awaiting cryptographic signature."}
                        </p>
                    </div>
                    <span className={`agt-badge ${isAgentMode ? 'agt-badge-pink' : 'agt-badge-orange'} px-4 py-2 text-sm font-bold`}>
                        {props.awaitingTxs.length} {isAgentMode ? 'Pending Escrow' : 'Payloads Ready'}
                    </span>
                </div>

                {/* Phantom Shield Premium Toggle */}
                {props.isAdmin && (
                    <div className="relative z-10 flex items-center justify-between mb-6 p-4 border rounded-2xl" style={{ background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.2)' }}>
                        <div className="flex items-center gap-4">
                            <div className="agt-icon-box agt-icon-box-pink">
                                <ShieldKeyIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--pp-text-primary)' }}>
                                    Phantom Shield
                                    <span className="agt-badge agt-badge-pink text-[11px] uppercase tracking-widest">Premium</span>
                                </h4>
                                <p className="text-xs mt-0.5" style={{ color: 'rgba(216,180,254,0.6)' }}>Mask transaction amounts via ZK-Rollups.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={props.usePhantomShield} onChange={() => { props.setUsePhantomShield(!props.usePhantomShield); }} />
                            <div className="w-12 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 shadow-inner" style={{ background: 'var(--pp-bg-elevated)', border: '1px solid var(--pp-border)' }}></div>
                        </label>
                    </div>
                )}

                {/* Gas Sponsorship Toggle */}
                {props.isAdmin && (
                    <div className="relative z-10 flex items-center justify-between mb-6 p-4 border rounded-2xl" style={{ background: 'rgba(62,221,185,0.05)', borderColor: 'rgba(62,221,185,0.15)' }}>
                        <div className="flex items-center gap-4">
                            <div className="agt-icon-box agt-icon-box-mint">
                                <BoltIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--pp-text-primary)' }}>
                                    Gas Sponsorship
                                    <span className="agt-badge agt-badge-mint text-[11px] uppercase tracking-widest">Tempo</span>
                                </h4>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>Platform pays gas fees for recipients. Zero-cost payroll delivery.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-emerald-400/70">Active</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                    </div>
                )}

                {/* Queue Table */}
                <div className="overflow-x-auto relative z-10 mb-8">
                    <table className="w-full text-left border-collapse" aria-label="Pending payroll transactions">
                        <thead>
                            <tr className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)', borderBottom: '1px solid var(--pp-border)' }}>
                                <th className="pb-4 pl-3">Recipient</th>
                                <th className="pb-4">Tempo Wallet Address</th>
                                <th className="pb-4 text-right pr-3">Amount</th>
                                <th className="pb-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {props.awaitingTxs.map((tx, i) => {
                                // Dynamically fetch real wallet from DB/state
                                const realWallet = tx.wallet_address || tx.recipientWallet || tx.wallet || '';
                                const displayWallet = !realWallet ? 'Unknown' : realWallet.length > 20 ? `${realWallet.slice(0, 10)}...${realWallet.slice(-8)}` : realWallet;

                                return (
                                <tr key={tx.id || i} className="hover:bg-white/[0.03] transition-colors group">
                                    <td className="py-5 pl-3 text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isAgentMode ? 'var(--agt-pink)' : 'var(--agt-orange)' }}></span>
                                            {tx.name}
                                        </div>
                                        {/* ESCROW LOCK BADGE FOR AGENTS */}
                                        {isAgentMode && (
                                            <div className="mt-1.5 ml-3.5">
                                                <span className="agt-badge agt-badge-mint text-[11px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit">
                                                    <LockIcon className="w-3 h-3" /> Escrow Locked
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    <td className="py-5 font-mono text-sm" style={{ color: 'var(--pp-text-secondary)' }}>
                                        {displayWallet}
                                    </td>

                                    <td className="py-5 pr-3 text-right">
                                        {props.usePhantomShield ? (
                                            <div className="flex items-center justify-end gap-2 animate-in fade-in zoom-in duration-300" style={{ color: 'var(--agt-pink)' }}>
                                                <LockIcon className="w-4 h-4" />
                                                <span className="text-sm font-bold tracking-widest blur-[4px] select-none opacity-70">0.0000</span>
                                            </div>
                                        ) : (
                                            <div className="animate-in fade-in duration-300">
                                                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--pp-text-primary)' }}>{(parseFloat(tx.amount) || 0).toFixed(4)}</span>
                                                <span className="text-[11px] ml-1" style={{ color: 'var(--pp-text-muted)' }}>{tx.token || 'AlphaUSD'}</span>
                                            </div>
                                        )}
                                    </td>

                                    <td className="py-5 pr-3 text-right opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity sm:opacity-100 sm:group-hover:opacity-100 md:opacity-0">
                                        {props.isAdmin && (
                                            <button onClick={() => props.removeAwaitingTx(tx.id)} aria-label={`Remove ${tx.name}`} className="w-6 h-6 inline-flex items-center justify-center rounded-md transition-all shadow-sm" style={{ background: 'rgba(var(--pp-danger-rgb, 239,68,68), 0.1)', color: 'var(--pp-danger)' }}>
                                                <XMarkIcon className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                {/* Footer Actions & Fees */}
                <div className="relative z-10 pt-6 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-end gap-6">
                    <div className="w-full md:w-auto p-5 rounded-2xl min-w-[320px]" style={{ background: 'var(--pp-bg-elevated)', border: '1px solid var(--pp-border)' }}>
                        <div className="flex justify-between text-sm mb-2">
                            <span style={{ color: 'var(--pp-text-secondary)' }}>Total Payload:</span>
                            <span className="font-bold" style={{ color: 'var(--pp-text-primary)' }}>{props.awaitingTotalAmountNum.toFixed(4)}</span>
                        </div>

                        {/* PROTOCOL FEE DISPLAY (0.2%, max $5) */}
                        <div className="flex justify-between text-sm mb-3">
                            <span className="flex items-center gap-1.5" style={{ color: 'var(--pp-text-secondary)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isAgentMode ? 'var(--agt-pink)' : 'var(--agt-blue)' }}></span>
                                Protocol Fee (0.2%):
                            </span>
                            <span className="font-bold" style={{ color: 'var(--agt-orange)' }}>+{calculatedFee.toFixed(4)}</span>
                        </div>

                        {props.usePhantomShield && (
                            <div className="flex justify-between text-sm mb-3 animate-in slide-in-from-top-2 fade-in duration-300">
                                <span className="flex items-center gap-1.5" style={{ color: 'var(--pp-text-secondary)' }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--agt-pink)' }}></span>Shield Premium:</span>
                                <span className="font-bold" style={{ color: 'var(--agt-pink)' }}>+{props.shieldFeeNum.toFixed(4)}</span>
                            </div>
                        )}

                        <div className="border-b border-white/[0.05] mb-3 pb-1"></div>
                        <div className="flex justify-between text-base">
                            <span className="font-bold" style={{ color: 'var(--pp-text-secondary)' }}>Total Deduction:</span>
                            <span className="font-black" style={{ color: 'var(--pp-text-primary)' }}>{finalTotalDeduction.toFixed(4)} {props.activeVaultToken.symbol}</span>
                        </div>
                    </div>

                    {/* Deploy Button */}
                    {props.isAdmin ? (
                        <button
                            onClick={props.signAndApproveBatch}
                            disabled={props.isEncrypting}
                            className={`w-full md:w-auto px-8 py-4 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-3 ${props.isEncrypting ? 'bg-slate-700 opacity-50 cursor-not-allowed' : props.usePhantomShield ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02]' : isAgentMode ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:scale-[1.02]' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-[1.02]'}`}
                        >
                            {props.isEncrypting ? (
                                <><ClockIcon className="w-4 h-4" /> Working...</>
                            ) : isAgentMode ? (
                                `Sign & Move to Escrow (${props.awaitingTxs.length})`
                            ) : (
                                `Sign & Execute Batch (${props.awaitingTxs.length})`
                            )}
                        </button>
                    ) : (
                        <div className="w-full md:w-auto px-8 py-4 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed" style={{ background: 'var(--pp-bg-elevated)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-muted)' }}>
                            <LockIcon className="w-4 h-4" /> Awaiting Administrator Signature
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
export default React.memo(Boardroom);
