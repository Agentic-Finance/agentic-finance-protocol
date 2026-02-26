import React from 'react';

interface TopStatsProps {
    totalDisbursed: string | number;
    agentStatus: string;
    activeBotsCount: number;
    isAdmin: boolean;
    toggleAgent: () => void;
    isTogglingAgent: boolean;
    activeVaultToken: any;
    setActiveVaultToken: (token: any) => void;
    SUPPORTED_TOKENS: readonly any[];
    vaultBalance: string;
    showFundInput: boolean;
    setShowFundInput: (val: boolean) => void;
    fundAmount: string;
    setFundAmount: (val: string) => void;
    executeFund: () => void;
    isFunding: boolean;
}

function TopStatsCards(props: TopStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            
            {/* 📊 CARD 1: TOTAL VOLUME (Emerald Theme) */}
            <div className="relative z-20 group">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/40 to-teal-500/10 rounded-[1.4rem] opacity-70 blur-[2px] pointer-events-none group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-emerald-400/80 rounded-tl-lg z-10 pointer-events-none"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-emerald-400/80 rounded-br-lg z-10 pointer-events-none"></div>
                <div className="p-6 flex flex-col border border-white/5 rounded-2xl relative z-10 shadow-inner h-full" style={{ background: 'radial-gradient(ellipse at top, rgba(21,27,39,0.95) 0%, rgba(21,27,39,0.90) 100%)' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">📊</div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 tracking-widest">GLOBAL</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Volume</p>
                    <h3 className="text-2xl font-black text-white font-mono">{props.totalDisbursed} <span className="text-sm text-slate-500 font-sans font-bold">αUSD</span></h3>
                </div>
            </div>

            {/* 🏦 CARD 2: VAULT BALANCE (Cyan Theme) */}
            <div className="relative z-20 group">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/40 to-blue-500/10 rounded-[1.4rem] opacity-70 blur-[2px] pointer-events-none group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-lg z-10 pointer-events-none"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-400/80 rounded-br-lg z-10 pointer-events-none"></div>
                <div className="p-6 flex flex-col border border-white/5 rounded-2xl relative z-10 shadow-inner h-full" style={{ background: 'radial-gradient(ellipse at top, rgba(21,27,39,0.95) 0%, rgba(21,27,39,0.90) 100%)' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]">🏦</div>
                        <select aria-label="Select vault token" value={props.activeVaultToken.symbol} onChange={(e) => { const found = props.SUPPORTED_TOKENS.find((t: any) => t.symbol === e.target.value); if (found) props.setActiveVaultToken(found); }} className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/30 outline-none cursor-pointer hover:bg-cyan-500/20 transition-colors">
                            {props.SUPPORTED_TOKENS.map((t: any) => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
                        </select>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Vault Balance</p>
                    <h3 className="text-2xl font-black text-white font-mono">{props.vaultBalance} <span className="text-sm text-cyan-500 font-sans font-bold">{props.activeVaultToken.symbol}</span></h3>
                    
                    {props.isAdmin && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                            {props.showFundInput ? (
                                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                    <input type="number" min="0" step="0.01" aria-label="Fund amount" value={props.fundAmount} onChange={e => props.setFundAmount(e.target.value)} placeholder="0.00" className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-400" />
                                    <button onClick={props.executeFund} disabled={props.isFunding} className="text-[10px] uppercase tracking-widest bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3 py-1.5 rounded-lg transition-colors">{props.isFunding ? '...' : 'Fund'}</button>
                                    <button onClick={() => props.setShowFundInput(false)} className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2.5 py-1.5 rounded-lg border border-white/10 transition-colors">✕</button>
                                </div>
                            ) : (
                                <button onClick={() => props.setShowFundInput(true)} className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 transition-colors"><span>+</span> Top Up Vault</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 🤖 CARD 3: ACTIVE AGENTS (Fuchsia Theme) */}
            <div className="relative z-20 group">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-fuchsia-500/40 to-purple-500/10 rounded-[1.4rem] opacity-70 blur-[2px] pointer-events-none group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-fuchsia-400/80 rounded-tl-lg z-10 pointer-events-none"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-fuchsia-400/80 rounded-br-lg z-10 pointer-events-none"></div>
                <div className="p-6 flex flex-col border border-white/5 rounded-2xl relative z-10 shadow-inner h-full" style={{ background: 'radial-gradient(ellipse at top, rgba(21,27,39,0.95) 0%, rgba(21,27,39,0.90) 100%)' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400 border border-fuchsia-500/20 shadow-[0_0_10px_rgba(217,70,239,0.2)]">🤖</div>
                        <span className="text-[10px] font-mono text-fuchsia-400 bg-fuchsia-500/10 px-2 py-1 rounded border border-fuchsia-500/20 tracking-widest">AUTOPILOT</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Agents</p>
                    <h3 className="text-2xl font-black text-white font-mono">{props.activeBotsCount} <span className="text-sm text-slate-500 font-sans font-bold">Bots</span></h3>
                </div>
            </div>

            {/* ⚡ CARD 4: DAEMON ENGINE (Amber/Rose Theme) */}
            <div className="relative z-20 group">
                <div className={`absolute -inset-[1px] bg-gradient-to-r rounded-[1.4rem] opacity-70 blur-[2px] pointer-events-none group-hover:opacity-100 transition-opacity ${props.agentStatus === 'ACTIVE' ? 'from-amber-500/40 to-orange-500/10' : 'from-rose-500/40 to-red-500/10'}`}></div>
                <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg z-10 pointer-events-none ${props.agentStatus === 'ACTIVE' ? 'border-amber-400/80' : 'border-rose-400/80'}`}></div>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 rounded-br-lg z-10 pointer-events-none ${props.agentStatus === 'ACTIVE' ? 'border-amber-400/80' : 'border-rose-400/80'}`}></div>
                <div className="p-6 flex flex-col border border-white/5 rounded-2xl relative z-10 shadow-inner h-full" style={{ background: 'radial-gradient(ellipse at top, rgba(21,27,39,0.95) 0%, rgba(21,27,39,0.90) 100%)' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-[0_0_10px_rgba(0,0,0,0.2)] ${props.agentStatus === 'ACTIVE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {props.agentStatus === 'ACTIVE' ? '⚡' : '⏸'}
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-1 rounded border tracking-widest ${props.agentStatus === 'ACTIVE' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                            {props.agentStatus}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Daemon Engine</p>
                    <div className="flex justify-between items-end mt-auto">
                        <h3 className="text-xl font-black text-white font-sans">{props.agentStatus === 'ACTIVE' ? 'Processing' : 'Halted'}</h3>
                        {props.isAdmin && (
                            <button onClick={props.toggleAgent} disabled={props.isTogglingAgent} className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${props.agentStatus === 'ACTIVE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'}`}>
                                {props.isTogglingAgent ? '...' : (props.agentStatus === 'ACTIVE' ? 'Stop' : 'Start')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
export default React.memo(TopStatsCards);
