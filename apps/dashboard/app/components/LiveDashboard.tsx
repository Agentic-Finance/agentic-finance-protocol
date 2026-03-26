'use client';

import React, { useMemo, useState } from 'react';
import { useSSE, ProtocolEvent } from '../hooks/useSSE';
import StatCard from './ui/StatCard';

// ── Filter Types ────────────────────────────────────────────────
type EventFilterType = 'all' | 'escrow' | 'shield' | 'agent' | 'stream' | 'batch';

const FILTER_OPTIONS: { value: EventFilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'escrow', label: 'Escrow' },
  { value: 'shield', label: 'Shield' },
  { value: 'agent', label: 'Agent' },
  { value: 'stream', label: 'Stream' },
  { value: 'batch', label: 'Batch' },
];

/** Filter bar for event types */
function EventFilterBar({ active, onChange }: { active: EventFilterType; onChange: (f: EventFilterType) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-4">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
            active === opt.value
              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
              : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────────

/** Scrolling feed of protocol transactions */
function TxFeed({ events }: { events: ProtocolEvent[] }) {
  const [visibleCount, setVisibleCount] = useState(20);
  const txEvents = events.filter(e => e.type.startsWith('tx:') || e.type.startsWith('agent:'));
  const totalEvents = txEvents.length;
  const recent = txEvents.slice(-visibleCount).reverse();

  const getEventIcon = (type: string) => {
    if (type.includes('escrow_created')) return '🔐';
    if (type.includes('escrow_settled')) return '💰';
    if (type.includes('escrow_refunded')) return '↩️';
    if (type.includes('shield')) return '🛡️';
    if (type.includes('multisend')) return '📦';
    if (type.includes('token_deployed')) return '🪙';
    if (type.includes('contract_deployed')) return '📝';
    if (type.includes('a2a')) return '🔗';
    if (type.includes('job_completed')) return '✅';
    if (type.includes('job_failed')) return '❌';
    return '📡';
  };

  const getEventLabel = (type: string) => {
    if (type.includes('escrow_created')) return 'Escrow Created';
    if (type.includes('escrow_settled')) return 'Escrow Settled';
    if (type.includes('escrow_refunded')) return 'Escrow Refunded';
    if (type.includes('shield_deposit')) return 'Shield Deposit';
    if (type.includes('shield_payout')) return 'Shield Payout';
    if (type.includes('multisend')) return 'Batch Payment';
    if (type.includes('token_deployed')) return 'Token Deployed';
    if (type.includes('contract_deployed')) return 'Contract Deployed';
    if (type.includes('a2a_chain_completed')) return 'A2A Chain Done';
    if (type.includes('a2a_chain_started')) return 'A2A Chain Started';
    if (type.includes('job_completed')) return 'Agent Job Done';
    if (type.includes('job_started')) return 'Agent Job Started';
    return type.replace('tx:', '').replace('agent:', '');
  };

  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-4 h-full">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Live Transaction Feed
      </h3>
      <div className="space-y-2 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
        {recent.length === 0 && (
          <p className="text-slate-500 text-xs text-center py-4">Waiting for events...</p>
        )}
        {recent.map((event) => (
          <div key={event.id} className="flex items-start gap-3 text-xs bg-slate-800/40 rounded-lg px-3 py-2.5 border border-white/[0.03] hover:border-indigo-500/20 transition-colors">
            <span className="text-lg flex-shrink-0 mt-0.5">{getEventIcon(event.type)}</span>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-200 font-medium truncate">{getEventLabel(event.type)}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {event.data.amount && Number.isFinite(Number(event.data.amount)) && (
                    <span className="text-emerald-400 font-mono text-[10px]">
                      ${Number(event.data.amount).toFixed(2)}
                    </span>
                  )}
                  <span className="text-slate-600 text-[10px]">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              {event.data.txHash && (
                <a href={event.data.explorerUrl || `https://explore.moderato.tempo.xyz/tx/${event.data.txHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-slate-500 hover:text-indigo-400 font-mono text-[10px] truncate block mt-0.5">
                  {event.data.txHash.slice(0, 8)}...{event.data.txHash.slice(-6)}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalEvents > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            Showing {Math.min(visibleCount, totalEvents)} of {totalEvents} events
          </span>
          <div className="flex items-center gap-2">
            {visibleCount > 20 && (
              <button
                onClick={() => setVisibleCount(Math.max(20, visibleCount - 20))}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                Show Less
              </button>
            )}
            {visibleCount < totalEvents && (
              <button
                onClick={() => setVisibleCount(Math.min(totalEvents, visibleCount + 20))}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-[10px] text-indigo-400 hover:bg-indigo-500/20 transition-all"
              >
                Show More
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Grid of agent tiles, color-coded by activity */
function AgentHeatmap({ activity }: { activity: Record<string, { jobs: number; lastActive: number; active: boolean }> }) {
  const agents = Object.entries(activity).sort((a, b) => b[1].jobs - a[1].jobs);
  const now = Date.now();

  const getHeatColor = (jobs: number, lastActive: number) => {
    const recency = now - lastActive;
    if (recency < 30_000) return 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300'; // Active now
    if (recency < 300_000) return 'bg-amber-500/20 border-amber-500/40 text-amber-300'; // Recently active
    if (jobs > 0) return 'bg-slate-700/50 border-slate-600/30 text-slate-400'; // Has history
    return 'bg-slate-800/30 border-slate-700/20 text-slate-500'; // Idle
  };

  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Agent Heatmap</h3>
      <div className="grid grid-cols-3 gap-2">
        {agents.slice(0, 12).map(([agentId, data]) => (
          <div key={agentId} className={`rounded-lg px-2 py-2 border text-center ${getHeatColor(data.jobs, data.lastActive)}`}>
            <div className="text-[10px] font-mono truncate">{agentId}</div>
            <div className="text-lg font-bold">{data.jobs}</div>
            <div className="text-[9px] opacity-60">jobs</div>
          </div>
        ))}
        {agents.length === 0 && (
          <p className="text-slate-500 text-xs col-span-3 text-center py-4">No agent activity yet</p>
        )}
      </div>
    </div>
  );
}

/** Animated counter showing ZK proofs */
function ZKProofCounter({ total }: { total: number }) {
  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-4 flex flex-col items-center justify-center">
      <div className="text-3xl mb-1">🛡️</div>
      <div className="text-3xl font-bold text-purple-400 font-mono">{total}</div>
      <div className="text-xs text-slate-400 mt-1">ZK Proofs Generated</div>
      <div className="text-[10px] text-purple-400/60 mt-0.5">PLONK Verified on Tempo</div>
    </div>
  );
}

/** Platform fees collected */
function RevenueTicker({ total, recentSettlements }: { total: number; recentSettlements: number }) {
  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-4 flex flex-col items-center justify-center">
      <div className="text-3xl mb-1">💎</div>
      <div className="text-3xl font-bold text-emerald-400 font-mono">${total.toFixed(2)}</div>
      <div className="text-xs text-slate-400 mt-1">Platform Revenue</div>
      <div className="text-[10px] text-emerald-400/60 mt-0.5">{recentSettlements} escrows settled (5% fee)</div>
    </div>
  );
}

/** TVL gauge - donut chart style */
function TVLGauge({ tvl }: { tvl: { escrow: number; shield: number; multisend: number; total: number } }) {
  const segments = [
    { label: 'Escrow', value: tvl.escrow, color: 'bg-indigo-500' },
    { label: 'Shield', value: tvl.shield, color: 'bg-purple-500' },
    { label: 'Multisend', value: tvl.multisend, color: 'bg-emerald-500' },
  ];
  const nonZeroTotal = tvl.total || 1; // Avoid division by zero

  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Total Value Locked (TVL)</h3>
      <div className="text-center mb-3">
        <div className="text-2xl font-bold text-white font-mono">${tvl.total.toLocaleString()}</div>
        <div className="text-[10px] text-slate-400">AlphaUSD on Tempo L1</div>
      </div>
      {/* Bar breakdown */}
      <div className="h-3 rounded-full bg-slate-800 overflow-hidden flex mb-3">
        {segments.map(seg => (
          <div key={seg.label} className={`${seg.color} h-full transition-all duration-500`}
            style={{ width: `${(seg.value / nonZeroTotal) * 100}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {segments.map(seg => (
          <div key={seg.label}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <div className={`w-2 h-2 rounded-full ${seg.color}`} />
              <span className="text-[10px] text-slate-400">{seg.label}</span>
            </div>
            <div className="text-xs font-mono text-slate-300">${seg.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A2A chain visualization */
function A2AFlowViz({ events, totalChains }: { events: ProtocolEvent[]; totalChains: number }) {
  const a2aEvents = events.filter(e => e.type.includes('a2a'));
  const recentChains = a2aEvents.slice(-5).reverse();

  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        🔗 Agent-to-Agent Chains
        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-full">{totalChains} total</span>
      </h3>
      <div className="space-y-2">
        {recentChains.length === 0 && (
          <p className="text-slate-500 text-xs text-center py-4">No A2A chains yet</p>
        )}
        {recentChains.map((event) => (
          <div key={event.id} className="bg-slate-800/40 rounded-lg px-3 py-2 border border-white/[0.03]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-indigo-400 font-medium">{event.data.agentId || 'A2A Chain'}</span>
              {event.data.workflowId && (
                <span className="text-slate-500 font-mono text-[10px]">{event.data.workflowId}</span>
              )}
            </div>
            {event.data.amount && (
              <div className="text-[10px] text-emerald-400 mt-1">${Number(event.data.amount).toFixed(2)} total budget</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main LiveDashboard Component ────────────────────────────

export default function LiveDashboard() {
  const state = useSSE();
  const [eventFilter, setEventFilter] = useState<EventFilterType>('all');

  // Apply client-side filter on txFeed events
  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return state.txFeed;
    return state.txFeed.filter((e) => e.type.includes(eventFilter));
  }, [state.txFeed, eventFilter]);

  return (
    <div className="text-white pb-6 overflow-hidden">
      {/* Connection Status */}
      <div className="max-w-full mx-auto mb-6 flex items-center justify-end gap-4">
        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Status</div>
          <div className={`text-sm font-medium ${state.connected ? 'text-emerald-400' : 'text-red-400'}`}>
            {state.connected ? 'LIVE' : 'RECONNECTING...'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Clients</div>
          <div className="text-sm font-medium text-indigo-400">{state.connectionCount}</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-full mx-auto mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 overflow-hidden">
          <StatCard label="Transactions" value={state.stats.totalTxs} color="blue" icon={<span className="text-sm">📊</span>} trend={{ value: 18, direction: 'up', label: '24h' }} variant="compact" />
          <StatCard label="Agent Jobs" value={state.stats.totalAgentJobs} color="emerald" icon={<span className="text-sm">🤖</span>} trend={{ value: 7, direction: 'up', label: 'today' }} variant="compact" />
          <StatCard label="A2A Chains" value={state.stats.totalA2AChains} color="indigo" icon={<span className="text-sm">🔗</span>} trend={{ value: 32, direction: 'up', label: 'growth' }} variant="compact" />
          <StatCard label="Escrows" value={state.stats.totalEscrowCreated} color="amber" icon={<span className="text-sm">🔐</span>} trend={{ value: 5, direction: 'up', label: 'new' }} variant="compact" />
          <StatCard label="ZK Proofs" value={state.stats.totalZKProofs} color="violet" icon={<span className="text-sm">🛡️</span>} trend={{ value: 14, direction: 'up', label: '24h' }} variant="compact" />
        </div>
      </div>

      {/* Event Filter Bar */}
      <div className="max-w-full mx-auto">
        <EventFilterBar active={eventFilter} onChange={setEventFilter} />
      </div>

      {/* Main Grid */}
      <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Column 1: TX Feed (tall) */}
        <div className="row-span-2">
          <TxFeed events={filteredEvents} />
        </div>

        {/* Column 2: Agent Heatmap + ZK Counter */}
        <div className="space-y-4">
          <AgentHeatmap activity={state.agentActivity} />
          <ZKProofCounter total={state.stats.totalZKProofs} />
        </div>

        {/* Column 3: TVL + Revenue + A2A */}
        <div className="space-y-4">
          <TVLGauge tvl={state.tvl} />
          <RevenueTicker total={state.stats.totalFeesCollected} recentSettlements={state.stats.totalEscrowSettled} />
          <A2AFlowViz events={state.txFeed} totalChains={state.stats.totalA2AChains} />
        </div>
      </div>
    </div>
  );
}
