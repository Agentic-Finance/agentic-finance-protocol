'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '../components/ui/AppShell';
import dynamic from 'next/dynamic';

const MyBalances = dynamic(() => import('../components/portfolio/MyBalances'), { ssr: false });
const MyEscrows = dynamic(() => import('../components/portfolio/MyEscrows'), { ssr: false });
const MyStreams = dynamic(() => import('../components/portfolio/MyStreams'), { ssr: false });
const MyReputation = dynamic(() => import('../components/portfolio/MyReputation'), { ssr: false });
const RecentActivity = dynamic(() => import('../components/portfolio/RecentActivity'), { ssr: false });

type TabId = 'balances' | 'escrows' | 'streams' | 'reputation' | 'activity';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'balances', label: 'Balances', icon: '💰' },
  { id: 'escrows', label: 'Escrows', icon: '🔒' },
  { id: 'streams', label: 'Streams', icon: '🔄' },
  { id: 'reputation', label: 'Reputation', icon: '⭐' },
  { id: 'activity', label: 'Activity', icon: '📊' },
];

interface PortfolioData {
  success: boolean;
  wallet: string;
  balances: { symbol: string; balance: string; address: string }[];
  escrows: { active: any[]; completed: any[]; counts: any };
  streams: { active: any[]; completed: any[]; counts: any };
  reputation: { compositeScore: number; displayScore: number; tier: number; tierLabel: string };
  deposit: { amount: string; tier: number; tierName: string; tierEmoji: string; feeDiscount: number };
  recentActivity: any[];
  summary: { totalBalance: string; activeEscrows: number; activeStreams: number; trustScore: number };
}

function PortfolioContent() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('balances');

  // Wallet detection
  useEffect(() => {
    async function detectWallet() {
      try {
        const eth = (window as any).ethereum;
        if (!eth) return;
        const accounts: string[] = await eth.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch {
        // No wallet
      }
    }
    detectWallet();
  }, []);

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async (wallet: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio?wallet=${wallet}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to fetch portfolio');
      setData(json);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) fetchPortfolio(walletAddress);
  }, [walletAddress, fetchPortfolio]);

  // Connect wallet handler
  async function connectWallet() {
    try {
      const eth = (window as any).ethereum;
      if (!eth) {
        setError('No wallet detected. Please install MetaMask.');
        return;
      }
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) setWalletAddress(accounts[0]);
    } catch {
      setError('Failed to connect wallet');
    }
  }

  // No wallet connected
  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-3xl">
          👛
        </div>
        <h2 className="text-xl font-black text-white">Connect Your Wallet</h2>
        <p className="text-sm text-slate-500 max-w-md text-center">
          Connect your wallet to view your portfolio, escrows, streams, and reputation score.
        </p>
        <button
          onClick={connectWallet}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            📋 My Portfolio
          </h1>
          <p className="text-xs text-slate-500 mt-1">Track your balances, escrows, streams, and reputation</p>
        </div>
        <span className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </span>
      </div>

      {/* Summary row */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="TOTAL BALANCE" value={`$${parseFloat(data.summary.totalBalance).toLocaleString()}`} color="indigo" />
          <SummaryCard label="ACTIVE ESCROWS" value={String(data.summary.activeEscrows)} color="amber" />
          <SummaryCard label="ACTIVE STREAMS" value={String(data.summary.activeStreams)} color="cyan" />
          <SummaryCard label="TRUST SCORE" value={`${data.summary.trustScore}/100`} color="emerald" />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all
              ${activeTab === tab.id
                ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-transparent'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tab content */}
      {data && !loading && (
        <div>
          {activeTab === 'balances' && <MyBalances balances={data.balances} />}
          {activeTab === 'escrows' && <MyEscrows escrows={data.escrows} />}
          {activeTab === 'streams' && <MyStreams streams={data.streams} />}
          {activeTab === 'reputation' && <MyReputation reputation={data.reputation} deposit={data.deposit} />}
          {activeTab === 'activity' && <RecentActivity activities={data.recentActivity} />}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  };
  const c = colorMap[color] ?? colorMap.indigo;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.12] transition-all">
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-lg font-black ${c.text} tabular-nums font-mono`}>{value}</p>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <AppShell>
      <PortfolioContent />
    </AppShell>
  );
}
