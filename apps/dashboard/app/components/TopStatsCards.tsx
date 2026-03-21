import React from 'react';

function relativeTime(iso: string | null): string {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

interface TopStatsProps {
    totalDisbursed: string | number;
    workspaceVolume?: string | number | null;
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
    daemonJobsProcessed?: number;
    daemonLastSeen?: string | null;
}

function TopStatsCards(props: TopStatsProps) {
    const isActive = props.agentStatus === 'ACTIVE';
    const isVaultEmpty = !props.vaultBalance || parseFloat(props.vaultBalance) === 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">

            {/* TOTAL VOLUME */}
            <div className="rounded-xl border p-5 transition-colors" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--pp-text-muted)' }}>Volume</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: 'var(--pp-text-muted)', background: 'var(--pp-surface-1)' }}>
                        {props.workspaceVolume != null ? 'workspace' : 'global'}
                    </span>
                </div>
                <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums tracking-tight" style={{ color: 'var(--pp-text-primary)' }}>
                    {props.workspaceVolume != null ? props.workspaceVolume : props.totalDisbursed}
                </p>
                <p className="text-xs mt-1 font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                    {props.workspaceVolume != null ? `Protocol: ${props.totalDisbursed} aUSD` : 'aUSD'}
                </p>
            </div>

            {/* VAULT BALANCE */}
            <div id="onboard-vault" className="rounded-xl border p-5 transition-colors relative overflow-hidden" style={{ background: 'var(--pp-bg-card)', borderColor: isVaultEmpty ? 'var(--agt-blue)' : 'var(--pp-border)' }}>
                {/* Empty state pulse ring */}
                {isVaultEmpty && <div className="absolute inset-0 rounded-xl animate-pulse" style={{ boxShadow: 'inset 0 0 20px rgba(27,191,236,0.08)' }} />}

                <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--pp-text-muted)' }}>Platform Vault</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: 'var(--pp-text-muted)', background: 'var(--pp-surface-1)' }}>shared</span>
                </div>

                {isVaultEmpty ? (
                    /* Empty state CTA */
                    <div className="relative z-10">
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--pp-text-primary)' }}>No funds yet</p>
                        <p className="text-[11px] mb-3" style={{ color: 'var(--pp-text-muted)' }}>Deposit to start sending payments</p>
                        {props.isAdmin && (
                            props.showFundInput ? (
                                <div className="flex items-center gap-2">
                                    <input type="number" min="0" step="0.01" aria-label="Fund amount" value={props.fundAmount} onChange={e => props.setFundAmount(e.target.value)} placeholder="0.00" className="w-full rounded-lg px-3 py-1.5 text-xs font-mono outline-none transition-colors" style={{ background: 'var(--pp-surface-2)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} autoFocus />
                                    <button onClick={props.executeFund} disabled={props.isFunding} className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap text-white transition-colors" style={{ background: 'var(--agt-blue)' }}>{props.isFunding ? '...' : 'Fund'}</button>
                                    <button onClick={() => props.setShowFundInput(false)} className="text-xs px-2 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--pp-text-muted)' }}>x</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => props.setShowFundInput(true)}
                                    className="w-full text-xs font-semibold py-2 rounded-lg text-white transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                                    style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Deposit Funds
                                </button>
                            )
                        )}
                    </div>
                ) : (
                    /* Normal state */
                    <div className="relative z-10">
                        <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums tracking-tight" style={{ color: 'var(--pp-text-primary)' }}>
                            {props.vaultBalance}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>{props.activeVaultToken.symbol}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {props.SUPPORTED_TOKENS.map((t: any) => (
                                <button
                                    key={t.symbol}
                                    onClick={() => props.setActiveVaultToken(t)}
                                    className={`text-[10px] font-mono px-2.5 py-1 rounded-full transition-all ${
                                        props.activeVaultToken.symbol === t.symbol
                                            ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                                            : 'border hover:opacity-80'
                                    }`}
                                    style={props.activeVaultToken.symbol !== t.symbol ? { background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)', borderColor: 'var(--pp-border)' } : undefined}
                                >
                                    {t.symbol}
                                </button>
                            ))}
                        </div>
                        {props.isAdmin && (
                            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--pp-border)' }}>
                                {props.showFundInput ? (
                                    <div className="flex items-center gap-2">
                                        <input type="number" min="0" step="0.01" aria-label="Fund amount" value={props.fundAmount} onChange={e => props.setFundAmount(e.target.value)} placeholder="0.00" className="w-full rounded-lg px-3 py-1.5 text-xs font-mono outline-none transition-colors" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                        <button onClick={props.executeFund} disabled={props.isFunding} className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap" style={{ background: 'var(--pp-text-primary)', color: 'var(--pp-bg-primary)' }}>{props.isFunding ? '...' : 'Fund'}</button>
                                        <button onClick={() => props.setShowFundInput(false)} className="text-xs px-2 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--pp-text-muted)' }}>x</button>
                                    </div>
                                ) : (
                                    <button onClick={() => props.setShowFundInput(true)} className="text-xs font-medium transition-colors" style={{ color: 'var(--pp-text-muted)' }}>+ Top up</button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ACTIVE AGENTS */}
            <div className="rounded-xl border p-5 transition-colors" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--pp-text-muted)' }}>Agents</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: 'var(--pp-text-muted)', background: 'var(--pp-surface-1)' }}>autopilot</span>
                </div>
                <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums tracking-tight" style={{ color: 'var(--pp-text-primary)' }}>
                    {props.activeBotsCount}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>active bots</p>
            </div>

            {/* DAEMON ENGINE */}
            <div className="rounded-xl border p-5 transition-colors" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--pp-text-muted)' }}>Daemon</span>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        <span className={`text-[10px] font-mono ${isActive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                            {isActive ? 'active' : 'stopped'}
                        </span>
                    </div>
                </div>
                <p className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--pp-text-primary)' }}>
                    {isActive ? 'Running' : 'Halted'}
                </p>
                {props.daemonJobsProcessed != null && (
                    <div className="mt-1 space-y-1">
                        <p className="text-xs font-mono" style={{ color: 'var(--pp-text-muted)' }}>{props.daemonJobsProcessed} jobs / {relativeTime(props.daemonLastSeen || null)}</p>
                        {isActive && (
                            <div className="flex items-center gap-1.5">
                                <div className="flex gap-0.5">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="w-1.5 h-3 rounded-sm bg-emerald-400/40" title={`Nonce Lane ${i}`} />
                                    ))}
                                </div>
                                <span className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>3 nonce lanes</span>
                            </div>
                        )}
                    </div>
                )}
                {props.isAdmin && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                        <button
                            onClick={props.toggleAgent}
                            disabled={props.isTogglingAgent}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                isActive
                                    ? 'text-red-400/80 hover:text-red-400 hover:bg-red-400/10'
                                    : 'text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-400/10'
                            }`}
                        >
                            {props.isTogglingAgent ? '...' : (isActive ? 'Stop' : 'Start')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
export default React.memo(TopStatsCards);
