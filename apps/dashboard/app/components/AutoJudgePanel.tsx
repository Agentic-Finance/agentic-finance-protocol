'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Pagination, { usePagination } from './Pagination';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface VerdictScores {
  resultQuality: number;
  proofIntegrity: number;
  executionQuality: number;
  agentReputation: number;
  relevance: number;
  composite: number;
}

interface VerdictRecord {
  id: string;
  jobId: string;
  verdict: string;
  confidence: number;
  reasoning: string[];
  layer: number;
  rulesFired: string[];
  scores: VerdictScores | null;
  executedOnChain: boolean;
  txHash: string | null;
  overriddenBy: string | null;
  overrideVerdict: string | null;
  createdAt: string;
  job: {
    id: string;
    prompt: string;
    budget: number;
    token: string;
    status: string;
    clientWallet: string;
    executionTime: number | null;
    disputeReason: string | null;
    proofMatched: boolean | null;
    agent: {
      name: string;
      avatarEmoji: string;
      ownerWallet: string;
      successRate: number;
      isVerified: boolean;
    };
  };
}

interface JudgeStats {
  totalVerdicts: number;
  settleCount: number;
  refundCount: number;
  escalateCount: number;
  executedCount: number;
  avgConfidence: number;
  autoResolvedRate: string;
  layerBreakdown: { layer1: number; layer2: number; layer3: number };
  recentVerdicts: VerdictRecord[];
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const VERDICT_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  SETTLE: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '\u2713', label: 'Settle' },
  REFUND: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: '\u21A9', label: 'Refund' },
  ESCALATE: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '\u26A0', label: 'Escalate' },
};

const LAYER_LABELS: Record<number, string> = {
  1: 'Deterministic',
  2: 'AI Scoring',
  3: 'Human Review',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</span>
      <span className={`text-2xl font-black font-mono ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-slate-500 mt-1">{sub}</span>}
    </div>
  );
}

function ConfidenceBar({ confidence, size = 'md' }: { confidence: number; size?: 'sm' | 'md' }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  const h = size === 'sm' ? 'h-1' : 'h-1.5';
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${h} bg-white/5 rounded-full overflow-hidden`}>
        <div className={`${h} ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-mono font-bold ${pct >= 85 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
        {pct}%
      </span>
    </div>
  );
}

function ScoreBreakdown({ scores }: { scores: VerdictScores }) {
  const items = [
    { label: 'Result Quality', value: scores.resultQuality, color: 'bg-cyan-500' },
    { label: 'Proof Integrity', value: scores.proofIntegrity, color: 'bg-violet-500' },
    { label: 'Execution', value: scores.executionQuality, color: 'bg-blue-500' },
    { label: 'Reputation', value: scores.agentReputation, color: 'bg-emerald-500' },
    { label: 'Relevance', value: scores.relevance, color: 'bg-amber-500' },
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5 mt-2">
      {items.map(item => (
        <div key={item.label} className="flex flex-col items-center">
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-1 ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
          </div>
          <span className="text-[8px] text-slate-600 mt-0.5 truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function LayerGauge({ breakdown }: { breakdown: { layer1: number; layer2: number; layer3: number } }) {
  const total = breakdown.layer1 + breakdown.layer2 + breakdown.layer3;
  if (total === 0) return null;

  const l1Pct = Math.round((breakdown.layer1 / total) * 100);
  const l2Pct = Math.round((breakdown.layer2 / total) * 100);
  const l3Pct = Math.round((breakdown.layer3 / total) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
        {l1Pct > 0 && <div className="bg-cyan-500 transition-all" style={{ width: `${l1Pct}%` }} />}
        {l2Pct > 0 && <div className="bg-violet-500 transition-all" style={{ width: `${l2Pct}%` }} />}
        {l3Pct > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${l3Pct}%` }} />}
      </div>
      <div className="flex justify-between text-[9px] font-mono">
        <span className="text-cyan-400">L1: {l1Pct}%</span>
        <span className="text-violet-400">L2: {l2Pct}%</span>
        <span className="text-amber-400">L3: {l3Pct}%</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function AutoJudgePanel() {
  const [stats, setStats] = useState<JudgeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [runResult, setRunResult] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/judge/auto');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setStats(data);
    } catch { /* silent */ }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      if (!document.hidden) fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const triggerAutoJudge = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/judge/auto', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRunResult(`Evaluated ${data.evaluated} jobs: ${data.settled} settle, ${data.refunded} refund, ${data.escalated} escalate (${data.duration}ms)`);
        fetchStats();
      } else {
        setRunResult(`Error: ${data.error || 'Unknown'}`);
      }
    } catch (err: any) {
      setRunResult(`Error: ${err.message}`);
    }
    setIsRunning(false);
    setTimeout(() => setRunResult(null), 8000);
  };

  const filteredVerdicts = stats?.recentVerdicts?.filter(v => {
    if (filter === 'all') return true;
    return v.verdict === filter.toUpperCase();
  }) || [];

  const { paginatedItems: paginatedVerdicts, currentPage: verdictPage, totalPages: verdictTotalPages, setCurrentPage: setVerdictPage, totalItems: verdictTotal, itemsPerPage: verdictPerPage } = usePagination(filteredVerdicts, 10);

  if (isLoading) {
    return (
      <div className="relative z-20 mb-10">
        <div className="p-8 border border-white/5 rounded-3xl bg-[#061014]/90">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 pp-skeleton rounded-xl" />
            <div className="w-48 h-6 pp-skeleton rounded-lg" />
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="h-24 pp-skeleton rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="relative z-20 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500/40 via-cyan-500/20 to-violet-500/40 rounded-[1.9rem] opacity-100 blur-[2px] pointer-events-none" />

      <div className="p-4 sm:p-8 flex flex-col border border-white/5 rounded-3xl relative z-10 bg-[#061014]/90 shadow-inner backdrop-blur-3xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-violet-500/5 blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-white/[0.05] pb-5 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="p-2 bg-violet-500/10 text-violet-400 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              Auto-Judge Engine
            </h2>
            <p className="text-sm text-violet-400/80 mt-2 ml-14">
              3-layer automated dispute resolution with {stats.autoResolvedRate} auto-resolve rate
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={triggerAutoJudge}
              disabled={isRunning}
              className="px-5 py-2.5 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 hover:border-violet-400/50 text-violet-400 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isRunning ? (
                <><span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" /> Running...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Run Now</>
              )}
            </button>
          </div>
        </div>

        {/* Run result banner */}
        {runResult && (
          <div className={`mb-4 p-3 rounded-xl border text-sm font-mono animate-in fade-in duration-300 ${runResult.startsWith('Error') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            {runResult}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 relative z-10">
          <StatCard label="Total Verdicts" value={stats.totalVerdicts} color="text-white" />
          <StatCard label="Auto-Resolved" value={stats.autoResolvedRate} sub={`${stats.settleCount} settle + ${stats.refundCount} refund`} color="text-emerald-400" />
          <StatCard label="Avg Confidence" value={`${Math.round(stats.avgConfidence * 100)}%`} sub={`${stats.executedCount} executed on-chain`} color="text-cyan-400" />
          <StatCard label="Escalated" value={stats.escalateCount} sub="Requires human review" color="text-amber-400" />
        </div>

        {/* Layer Breakdown */}
        <div className="mb-6 p-4 bg-black/30 rounded-xl border border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Resolution Layer Distribution</span>
          <LayerGauge breakdown={stats.layerBreakdown} />
          <div className="flex gap-4 mt-2 text-[9px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-cyan-500 rounded-full" /> L1: Deterministic Rules</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-violet-500 rounded-full" /> L2: AI Scoring</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" /> L3: Human Review</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-4 bg-black/40 p-1.5 rounded-xl border border-white/5 w-fit">
          {['all', 'settle', 'refund', 'escalate'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize
                ${filter === f
                  ? f === 'settle' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : f === 'refund' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : f === 'escalate' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Verdict Feed */}
        {filteredVerdicts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm font-mono border border-dashed border-white/10 rounded-2xl">
            {stats.totalVerdicts === 0
              ? '> No verdicts yet. Click "Run Now" to evaluate pending jobs.'
              : '> No verdicts match this filter.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {paginatedVerdicts.map((v) => {
              const vc = VERDICT_CONFIG[v.verdict] || VERDICT_CONFIG.ESCALATE;
              const isExpanded = expandedId === v.id;

              return (
                <div
                  key={v.id}
                  className={`bg-[#0A161A] border rounded-xl p-4 transition-all cursor-pointer hover:border-violet-500/30 ${isExpanded ? 'border-violet-500/40' : 'border-white/5'}`}
                  onClick={() => setExpandedId(isExpanded ? null : v.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{v.job?.agent?.avatarEmoji || '\uD83E\uDD16'}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">{v.job?.agent?.name || 'Agent'}</span>
                          {v.job?.agent?.isVerified && <span className="text-[8px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0">VERIFIED</span>}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${vc.bg} ${vc.color} ${vc.border} border shrink-0`}>
                            {vc.icon} {vc.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5 max-w-[300px]">{v.job?.prompt?.slice(0, 60) || 'No prompt'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-mono font-bold text-white">{v.job?.budget?.toFixed(2)} <span className="text-slate-500">{v.job?.token}</span></span>
                        <div className="w-20 mt-1">
                          <ConfidenceBar confidence={v.confidence} size="sm" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${v.layer === 1 ? 'text-cyan-400 bg-cyan-500/10' : v.layer === 2 ? 'text-violet-400 bg-violet-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                          L{v.layer}
                        </span>
                        <span className="text-[9px] text-slate-600 mt-1">{relativeTime(v.createdAt)}</span>
                      </div>
                      <svg className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Confidence */}
                      <div className="mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Confidence</span>
                        <div className="mt-1">
                          <ConfidenceBar confidence={v.confidence} />
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div className="mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reasoning</span>
                        <ul className="mt-1 space-y-1">
                          {v.reasoning.map((r: string, i: number) => (
                            <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                              <span className="text-violet-500 shrink-0 mt-0.5">{'\u2022'}</span>
                              <span className="font-mono">{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Score Breakdown (Layer 2 only) */}
                      {v.scores && (
                        <div className="mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Score Breakdown</span>
                          <ScoreBreakdown scores={v.scores} />
                        </div>
                      )}

                      {/* Rules Fired */}
                      {v.rulesFired.length > 0 && (
                        <div className="mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rules Fired</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {v.rulesFired.map((r: string, i: number) => (
                              <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono border border-white/10">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-mono">
                        <span>Layer: <span className="text-slate-300">{LAYER_LABELS[v.layer]}</span></span>
                        <span>Job: <span className="text-slate-300">{v.jobId.slice(0, 8)}...</span></span>
                        {v.executedOnChain && <span className="text-emerald-400">On-chain {'\u2713'}</span>}
                        {v.txHash && <span>TX: <span className="text-slate-300">{v.txHash.slice(0, 12)}...</span></span>}
                        {v.overriddenBy && <span className="text-amber-400">Overridden by {v.overriddenBy.slice(0, 8)}...</span>}
                        {v.job?.disputeReason && <span className="text-rose-400">Disputed: &quot;{v.job.disputeReason.slice(0, 40)}&quot;</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <Pagination currentPage={verdictPage} totalPages={verdictTotalPages} onPageChange={setVerdictPage} totalItems={verdictTotal} itemsPerPage={verdictPerPage} />
      </div>
    </div>
  );
}
