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

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">

            {/* TOTAL VOLUME */}
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Volume</span>
                    <span className="text-[10px] font-mono text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">
                        {props.workspaceVolume != null ? 'workspace' : 'global'}
                    </span>
                </div>
                <p className="text-2xl sm:text-3xl font-semibold text-white font-mono tabular-nums tracking-tight">
                    {props.workspaceVolume != null ? props.workspaceVolume : props.totalDisbursed}
                </p>
                <p className="text-xs text-white/25 mt-1 font-mono">
                    {props.workspaceVolume != null ? `Protocol: ${props.totalDisbursed} aUSD` : 'aUSD'}
                </p>
            </div>

            {/* VAULT BALANCE */}
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Platform Vault</span>
                    <span className="text-[10px] font-mono text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">shared</span>
                </div>
                <p className="text-2xl sm:text-3xl font-semibold text-white font-mono tabular-nums tracking-tight">
                    {props.vaultBalance}
                </p>
                <p className="text-xs text-white/25 mt-1">{props.activeVaultToken.symbol}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {props.SUPPORTED_TOKENS.map((t: any) => (
                        <button
                            key={t.symbol}
                            onClick={() => props.setActiveVaultToken(t)}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded-full transition-all ${
                                props.activeVaultToken.symbol === t.symbol
                                    ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                                    : 'bg-white/[0.03] text-white/30 border border-white/[0.04] hover:text-white/50 hover:bg-white/[0.06]'
                            }`}
                        >
                            {t.symbol}
                        </button>
                    ))}
                </div>

                {props.isAdmin && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                        {props.showFundInput ? (
                            <div className="flex items-center gap-2">
                                <input type="number" min="0" step="0.01" aria-label="Fund amount" value={props.fundAmount} onChange={e => props.setFundAmount(e.target.value)} placeholder="0.00" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-white/20 transition-colors" />
                                <button onClick={props.executeFund} disabled={props.isFunding} className="text-xs font-medium bg-white text-black px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors whitespace-nowrap">{props.isFunding ? '...' : 'Fund'}</button>
                                <button onClick={() => props.setShowFundInput(false)} className="text-xs text-white/40 hover:text-white/60 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">x</button>
                            </div>
                        ) : (
                            <button onClick={() => props.setShowFundInput(true)} className="text-xs font-medium text-white/40 hover:text-white/70 transition-colors">+ Top up</button>
                        )}
                    </div>
                )}
            </div>

            {/* ACTIVE AGENTS */}
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Agents</span>
                    <span className="text-[10px] font-mono text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">autopilot</span>
                </div>
                <p className="text-2xl sm:text-3xl font-semibold text-white font-mono tabular-nums tracking-tight">
                    {props.activeBotsCount}
                </p>
                <p className="text-xs text-white/25 mt-1">active bots</p>
            </div>

            {/* DAEMON ENGINE */}
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Daemon</span>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        <span className={`text-[10px] font-mono ${isActive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                            {isActive ? 'active' : 'stopped'}
                        </span>
                    </div>
                </div>
                <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                    {isActive ? 'Running' : 'Halted'}
                </p>
                {props.daemonJobsProcessed != null && (
                    <div className="mt-1 space-y-1">
                        <p className="text-xs text-white/25 font-mono">{props.daemonJobsProcessed} jobs / {relativeTime(props.daemonLastSeen || null)}</p>
                        {isActive && (
                            <div className="flex items-center gap-1.5">
                                <div className="flex gap-0.5">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="w-1.5 h-3 rounded-sm bg-emerald-400/40" title={`Nonce Lane ${i}`} />
                                    ))}
                                </div>
                                <span className="text-[10px] text-white/20 font-mono">3 nonce lanes</span>
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
