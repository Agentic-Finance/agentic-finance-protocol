'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWarRoomData } from '../../hooks/useWarRoomData';
import type { SentinelTab, NodeStatus } from '../../lib/warroom-types';
import SentinelTabs from './SentinelTabs';
import NodeStatusBar from './NodeStatusBar';

// Lazy load heavy components
const GlobeScene = dynamic(() => import('../warroom/GlobeScene'), { ssr: false });
const AgentHeartbeatGrid = dynamic(() => import('../warroom/AgentHeartbeatGrid'), { ssr: false });
const SwarmTopology = dynamic(() => import('../warroom/SwarmTopology'), { ssr: false });
const AuditFeed = dynamic(() => import('../warroom/AuditFeed'), { ssr: false });
const TrustLeaderboard = dynamic(() => import('./TrustLeaderboard'), { ssr: false });
const StakingPanel = dynamic(() => import('./StakingPanel'), { ssr: false });
const RiskConsole = dynamic(() => import('./RiskConsole'), { ssr: false });
const CinematicMode = dynamic(() => import('../warroom/CinematicMode'), { ssr: false });

export default function SentinelDashboard() {
  const [tab, setTab] = useState<SentinelTab>('overview');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [nodeStatus, setNodeStatus] = useState<NodeStatus | null>(null);
  const [userTrustScore, setUserTrustScore] = useState<number | null>(null);
  const [userDepositTier, setUserDepositTier] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isCinematic, setIsCinematic] = useState(false);

  const { stats, agents, arcs, flowEdges, topAgents, auditEvents, threats } = useWarRoomData({ pollInterval: 30000 });

  // Detect wallet
  useEffect(() => {
    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
    if (!ethereum) return;
    const handleAccounts = (accounts: string[]) => setWalletAddress(accounts?.[0] || null);
    ethereum.request({ method: 'eth_accounts' }).then(handleAccounts).catch(() => {});
    ethereum.on('accountsChanged', handleAccounts);
    return () => { ethereum.removeListener('accountsChanged', handleAccounts); };
  }, []);

  // Fetch node status
  useEffect(() => {
    fetch('/api/sentinel/node-status')
      .then((r) => r.json())
      .then((data) => { if (data.success) setNodeStatus(data.status); })
      .catch(console.error);
  }, []);

  // Fetch user reputation & deposit if wallet connected
  useEffect(() => {
    if (!walletAddress) return;

    fetch(`/api/reputation?wallet=${walletAddress}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.reputation) setUserTrustScore(data.reputation.displayScore);
      })
      .catch(() => {});

    fetch(`/api/security-deposit?wallet=${walletAddress}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.deposit) setUserDepositTier(`${data.deposit.tierEmoji} ${data.deposit.tierName}`);
      })
      .catch(() => {});
  }, [walletAddress]);

  if (isCinematic) {
    return (
      <CinematicMode
        agents={agents}
        arcs={arcs}
        stats={stats}
        auditEvents={auditEvents}
        onExit={() => setIsCinematic(false)}
      />
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#06b6d4', boxShadow: '0 0 10px #06b6d4' }} />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: '#06b6d4', opacity: 0.3 }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">NODE ACTIVE</span>
            {walletAddress && (
              <span className="text-[10px] text-slate-500 font-mono ml-2">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Sentinel Node</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Decentralized Agent Security Layer — monitor, stake, govern</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCinematic(true)}
            className="px-3 py-2 rounded-lg border border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all text-[10px] font-bold uppercase tracking-wider"
          >
            🎬 Cinematic
          </button>
        </div>
      </div>

      {/* Tabs */}
      <SentinelTabs active={tab} onChange={setTab} />

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <NodeStatusBar
            stats={stats}
            nodeStatus={nodeStatus}
            userTrustScore={userTrustScore}
            userDepositTier={userDepositTier}
          />

          {/* Globe + Heartbeat */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            <div
              className="lg:col-span-8 rounded-2xl border border-white/[0.06] overflow-hidden relative"
              style={{ background: 'radial-gradient(ellipse at center, var(--pp-bg-elevated) 0%, var(--pp-bg-primary) 100%)', minHeight: '360px', aspectRatio: '16/10' }}
            >
              <GlobeScene
                agents={agents}
                arcs={arcs}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
              />
            </div>
            <div className="lg:col-span-4 space-y-3">
              <AgentHeartbeatGrid
                agents={agents}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
              />
            </div>
          </div>

          {/* Bottom: Topology + Audit */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            <div className="lg:col-span-7">
              <SwarmTopology
                flowEdges={flowEdges}
                topAgents={topAgents}
                agents={agents}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
              />
            </div>
            <div className="lg:col-span-5">
              <AuditFeed events={auditEvents} />
            </div>
          </div>
        </div>
      )}

      {tab === 'trust' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Agent Trust Leaderboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">Rankings powered by on-chain ReputationRegistry — composite of NexusV2 ratings, job completion, and AI proof reliability</p>
          </div>
          <TrustLeaderboard />
        </div>
      )}

      {tab === 'staking' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Security Deposit Staking</h2>
            <p className="text-xs text-slate-500 mt-0.5">Stake AlphaUSD in SecurityDepositVault to unlock fee discounts and insurance coverage</p>
          </div>
          <StakingPanel walletAddress={walletAddress} />
        </div>
      )}

      {tab === 'risk' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Risk Console</h2>
            <p className="text-xs text-slate-500 mt-0.5">Monitor threats, flag suspicious agents, and vote on governance actions</p>
          </div>
          <RiskConsole
            threats={threats}
            auditEvents={auditEvents}
            walletAddress={walletAddress}
          />
        </div>
      )}
    </div>
  );
}
