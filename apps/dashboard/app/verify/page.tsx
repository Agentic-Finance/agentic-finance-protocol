'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ProofStats {
  totalCommitments: number;
  totalVerified: number;
  totalMatched: number;
  totalMismatched: number;
  totalSlashed: number;
  matchRate: string;
  contractAddress: string;
  explorerUrl: string;
}

interface ProofEntry {
  commitmentId: number;
  committer: string;
  planHash: string;
  resultHash: string | null;
  nexusJobId: number | null;
  verified: boolean;
  matched: boolean;
  slashed: boolean;
  status: 'pending' | 'verified-match' | 'verified-mismatch' | 'slashed';
  timestamp: number;
  timestampISO: string | null;
}

const STATUS_CONFIG = {
  'pending':            { label: 'Pending',    color: 'text-amber-400',   bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: ClockIcon },
  'verified-match':     { label: 'Verified',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircleIcon },
  'verified-mismatch':  { label: 'Mismatch',   color: 'text-rose-400',    bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: XCircleIcon },
  'slashed':            { label: 'Slashed',    color: 'text-red-500',     bg: 'bg-red-500/10', border: 'border-red-500/30', icon: ExclamationTriangleIcon },
};

export default function VerifyPage() {
  const [stats, setStats] = useState<ProofStats | null>(null);
  const [history, setHistory] = useState<ProofEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<ProofEntry | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch('/api/proof/stats'),
        fetch('/api/proof/history?limit=20'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.commitments ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch proof data:', err);
    }
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchId.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`/api/proof/verify?id=${searchId.trim()}`);
      if (res.ok) {
        setSearchResult(await res.json());
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
    setSearching(false);
  }

  const shortHash = (hash: string) => hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : '—';
  const shortAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

  return (
    <div className="min-h-screen bg-[#0F1724] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0F1724]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center group">
            <Image src="/logo.png" alt="PayPol" width={140} height={36} className="h-7 w-auto object-contain" priority />
          </a>
          <div className="flex items-center gap-4">
            <a href="/protocol" className="text-xs text-slate-400 hover:text-white transition-colors">Protocol</a>
            <a href="/developers" className="text-xs text-slate-400 hover:text-white transition-colors">Developers</a>
            <a href="/docs/documentation" className="text-xs text-slate-400 hover:text-white transition-colors">Docs</a>
            <a href="/" className="text-xs text-slate-400 hover:text-white transition-colors">Dashboard</a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-indigo-500/10 to-transparent border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <ShieldCheckIcon className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Proof Verification</h1>
              <p className="text-slate-400 text-sm">Public dashboard for verifying AI agent execution integrity</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs max-w-2xl">
            Every AI agent on PayPol commits a plan hash <span className="text-indigo-400">before</span> execution,
            then verifies the result hash <span className="text-indigo-400">after</span>. This creates an immutable
            on-chain record of whether the agent followed its stated approach.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Commitments" value={stats.totalCommitments} color="text-indigo-400" />
            <StatCard label="Verified" value={stats.totalVerified} color="text-cyan-400" />
            <StatCard label="Matched" value={stats.totalMatched} color="text-emerald-400" />
            <StatCard label="Mismatched" value={stats.totalMismatched} color="text-rose-400" />
            <StatCard label="Integrity Rate" value={stats.matchRate} color="text-emerald-400" isText />
          </div>
        )}

        {/* Search */}
        <div className="bg-[#0B1215] border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MagnifyingGlassIcon className="w-5 h-5 text-indigo-400" />
            Verify a Commitment
          </h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter commitment ID (e.g. 1, 2, 3...)"
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-500/30 transition-all disabled:opacity-50"
            >
              {searching ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Verify'}
            </button>
          </form>

          {searchResult && (
            <div className="mt-4 bg-black/30 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Commitment #{searchResult.commitmentId}</span>
                <StatusBadge status={searchResult.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Committer</span>
                  <p className="text-white font-mono mt-1">{shortAddr(searchResult.committer)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Plan Hash</span>
                  <p className="text-white font-mono mt-1">{shortHash(searchResult.planHash)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Result Hash</span>
                  <p className="text-white font-mono mt-1">{searchResult.resultHash ? shortHash(searchResult.resultHash) : '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Escrow Job</span>
                  <p className="text-white font-mono mt-1">{searchResult.nexusJobId ?? '—'}</p>
                </div>
              </div>
              {searchResult.timestampISO && (
                <p className="text-[10px] text-slate-600">
                  Committed: {new Date(searchResult.timestampISO).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="bg-[#0B1215] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Recent Proof Commitments</h2>
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-slate-600 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <ShieldCheckIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No proof commitments yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 text-[10px] uppercase tracking-widest">
                    <th className="text-left py-3 px-2">ID</th>
                    <th className="text-left py-3 px-2">Committer</th>
                    <th className="text-left py-3 px-2">Plan Hash</th>
                    <th className="text-left py-3 px-2">Result Hash</th>
                    <th className="text-left py-3 px-2">Job</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.commitmentId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2 font-mono text-indigo-400">#{entry.commitmentId}</td>
                      <td className="py-3 px-2 font-mono">{shortAddr(entry.committer)}</td>
                      <td className="py-3 px-2 font-mono text-slate-400">{shortHash(entry.planHash)}</td>
                      <td className="py-3 px-2 font-mono text-slate-400">{entry.resultHash ? shortHash(entry.resultHash) : '—'}</td>
                      <td className="py-3 px-2 font-mono">{entry.nexusJobId ?? '—'}</td>
                      <td className="py-3 px-2"><StatusBadge status={entry.status} /></td>
                      <td className="py-3 px-2 text-slate-500">
                        {entry.timestampISO ? new Date(entry.timestampISO).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contract Info */}
        {stats && (
          <div className="bg-[#0B1215] border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-400 mb-3">Contract Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-600">AIProofRegistry</span>
                <a
                  href={stats.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-indigo-400 font-mono mt-1 hover:underline truncate"
                >
                  {stats.contractAddress}
                </a>
              </div>
              <div>
                <span className="text-slate-600">Network</span>
                <p className="text-white mt-1">Tempo L1 Moderato (Chain 42431)</p>
              </div>
              <div>
                <span className="text-slate-600">Protocol</span>
                <p className="text-white mt-1">APS-1 v2.1 — Agent Payment Standard</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-600 py-4">
          Powered by PayPol Protocol &bull; AIProofRegistry on Tempo L1 &bull; APS-1 v2.1
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function StatCard({ label, value, color, isText }: { label: string; value: number | string; color: string; isText?: boolean }) {
  return (
    <div className="bg-[#0B1215] border border-white/10 rounded-xl p-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>
        {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bg} ${config.color} border ${config.border}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
