'use client';

import React from 'react';
import StatCard from '../ui/StatCard';
import type { WarRoomStats, NodeStatus } from '../../lib/warroom-types';

interface Props {
  stats: WarRoomStats | null;
  nodeStatus: NodeStatus | null;
  userTrustScore?: number | null;
  userDepositTier?: string | null;
}

export default function NodeStatusBar({ stats, nodeStatus, userTrustScore, userDepositTier }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
      <StatCard
        label="Node Uptime"
        value={nodeStatus ? `${nodeStatus.uptime}%` : '—'}
        icon={<span>🟢</span>}
        color="emerald"
        variant="compact"
        subtitle="Last 30 days"
      />
      <StatCard
        label="Active Agents"
        value={stats?.activeAgents ?? '—'}
        icon={<span>🤖</span>}
        color="cyan"
        variant="compact"
        subtitle={stats ? `${stats.activeAgents} of 32` : undefined}
      />
      <StatCard
        label="A2A Volume"
        value={stats ? `$${Math.round(stats.a2aVolume).toLocaleString()}` : '—'}
        icon={<span>⚡</span>}
        color="indigo"
        variant="compact"
        subtitle={stats ? `${stats.a2aCount} transfers` : undefined}
      />
      <StatCard
        label="Trust Score"
        value={userTrustScore != null ? userTrustScore.toFixed(1) : '—'}
        icon={<span>⭐</span>}
        color="amber"
        variant="compact"
        subtitle="Your score (0-100)"
      />
      <StatCard
        label="Deposit Tier"
        value={userDepositTier ?? '—'}
        icon={<span>🔐</span>}
        color="violet"
        variant="compact"
        subtitle="Security deposit"
      />
    </div>
  );
}
