import React from 'react';
import { CpuChipIcon, BoltIcon, PlayIcon, PauseIcon, XMarkIcon } from './icons';

interface ActiveAgentsProps {
    autopilotRef: React.RefObject<HTMLDivElement | null>; autopilotRules: any[]; isAdmin: boolean; triggerAutopilotAgent: (id: number, ruleName: string) => void; toggleAutopilotState: (id: number, status: string) => void; deleteAutopilotAgent: (id: number) => void;
}

function ActiveAgents(props: ActiveAgentsProps) {
    if (props.autopilotRules.length === 0) return null;

    return (
        <div ref={props.autopilotRef} className="relative z-20 mb-10 scroll-mt-20">
            <div className="agt-card agt-card-accent-pink p-4 sm:p-8 flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 border-b border-white/[0.05] pb-6 relative z-10">
                    <h2 className="text-2xl font-bold text-[var(--pp-text-primary)] flex items-center gap-3">
                        <span className="agt-icon-box agt-icon-box-pink">
                            <CpuChipIcon className="w-5 h-5" />
                        </span>
                        Active Agents
                    </h2>
                    <span className="agt-badge agt-badge-pink px-4 py-2 text-sm font-bold">{props.autopilotRules.length} Online</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    {props.autopilotRules.map((rule, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border transition-all ${rule.status === 'Active' ? 'bg-[var(--pp-bg-elevated)] border-[color:var(--agt-pink)]/40' : 'bg-[var(--pp-surface-1)] border-[var(--pp-border)] opacity-60'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div><p className="text-lg font-bold text-[var(--pp-text-primary)] mb-0.5">{rule.name}</p><p className="text-xs font-mono text-slate-500">{rule.wallet_address.slice(0, 8)}...{rule.wallet_address.slice(-6)}</p></div>
                                <div className="text-right"><p className="text-lg font-bold tabular-nums" style={{ color: 'var(--agt-pink)' }}>{rule.amount} <span className="text-[11px]" style={{ color: 'var(--agt-pink)', opacity: 0.7 }}>{rule.token || 'alphaUSD'}</span></p></div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                    <span className={`w-2 h-2 rounded-full ${rule.status === 'Active' ? 'animate-pulse' : 'bg-slate-500'}`} style={rule.status === 'Active' ? { background: 'var(--agt-mint)' } : undefined}></span> ↻ {rule.schedule}
                                </div>
                                {props.isAdmin && (
                                    <div className="flex flex-wrap gap-2">
                                        {rule.status === 'Active' && (
                                            <button onClick={() => props.triggerAutopilotAgent(rule.id, rule.name)} className="text-xs font-bold px-3 py-2 rounded-lg border" style={{ background: 'rgba(var(--agt-blue-rgb, 99,179,237), 0.1)', color: 'var(--agt-blue)', borderColor: 'rgba(var(--agt-blue-rgb, 99,179,237), 0.3)' }}>
                                                <span className="inline-flex items-center gap-1"><BoltIcon className="w-3.5 h-3.5" /> Execute</span>
                                            </button>
                                        )}
                                        <button onClick={() => props.toggleAutopilotState(rule.id, rule.status)} aria-label={rule.status === 'Active' ? 'Pause agent' : 'Resume agent'} className="text-xs font-bold px-3 py-2 rounded-lg border bg-white/5 text-slate-300 border-white/10 hover:bg-white/10">
                                            {rule.status === 'Active' ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                                        </button>
                                        <button onClick={() => props.deleteAutopilotAgent(rule.id)} aria-label="Delete agent" className="text-xs font-bold px-3 py-2 rounded-lg border" style={{ background: 'rgba(var(--pp-danger-rgb, 239,68,68), 0.1)', color: 'var(--pp-danger)', borderColor: 'rgba(var(--pp-danger-rgb, 239,68,68), 0.3)' }}>
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
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
