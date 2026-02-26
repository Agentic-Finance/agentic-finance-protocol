import React from 'react';

interface ActiveAgentsProps {
    autopilotRef: any; autopilotRules: any[]; isAdmin: boolean; triggerAutopilotAgent: (id: number, ruleName: string) => void; toggleAutopilotState: (id: number, status: string) => void; deleteAutopilotAgent: (id: number) => void;
}

function ActiveAgents(props: ActiveAgentsProps) {
    if (props.autopilotRules.length === 0) return null;

    return (
        <div ref={props.autopilotRef} className="relative z-20 mb-10 scroll-mt-20">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-fuchsia-500/40 via-purple-500/20 to-fuchsia-500/40 rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none"></div>
            <div className="absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 border-fuchsia-400/80 rounded-tl-xl z-10 pointer-events-none"></div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 border-fuchsia-400/80 rounded-br-xl z-10 pointer-events-none"></div>
            <div className="absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 border-fuchsia-400/80 rounded-tr-xl z-10 pointer-events-none"></div>
            <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 border-fuchsia-400/80 rounded-bl-xl z-10 pointer-events-none"></div>

            <div className="p-4 sm:p-8 flex flex-col border border-white/5 rounded-3xl relative z-10 shadow-inner overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, rgba(21,27,39,0.95) 0%, rgba(21,27,39,0.90) 100%)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(217,70,239,0.1) 0%, transparent 70%)' }}></div>
                <div className="flex items-center justify-between mb-6 border-b border-white/[0.05] pb-6 relative z-10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3"><span className="p-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl shadow-[0_0_15px_rgba(217,70,239,0.2)]">🤖</span>Active Agents</h2>
                    <span className="px-4 py-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl text-sm font-bold border border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.1)]">{props.autopilotRules.length} Online</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    {props.autopilotRules.map((rule, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border transition-all ${rule.status === 'Active' ? 'bg-[#111620] border-fuchsia-500/40 shadow-[0_0_20px_rgba(217,70,239,0.1)]' : 'bg-black/20 border-white/[0.05] opacity-60'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div><p className="text-lg font-bold text-white mb-0.5">{rule.name}</p><p className="text-xs font-mono text-slate-500">{rule.wallet_address.slice(0, 8)}...{rule.wallet_address.slice(-6)}</p></div>
                                <div className="text-right"><p className="text-lg font-bold text-fuchsia-400 tabular-nums">{rule.amount} <span className="text-[10px] text-fuchsia-400/70">{rule.token || 'ALPHA'}</span></p></div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                    <span className={`w-2 h-2 rounded-full ${rule.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span> ↻ {rule.schedule}
                                </div>
                                {props.isAdmin && (
                                    <div className="flex flex-wrap gap-2">
                                        {rule.status === 'Active' && (
                                            <button onClick={() => props.triggerAutopilotAgent(rule.id, rule.name)} className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20">⚡ Execute</button>
                                        )}
                                        <button onClick={() => props.toggleAutopilotState(rule.id, rule.status)} aria-label={rule.status === 'Active' ? 'Pause agent' : 'Resume agent'} className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-white/5 text-slate-300 border-white/10 hover:bg-white/10">{rule.status === 'Active' ? '⏸' : '▶'}</button>
                                        <button onClick={() => props.deleteAutopilotAgent(rule.id)} aria-label="Delete agent" className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20">✕</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
export default React.memo(ActiveAgents);
