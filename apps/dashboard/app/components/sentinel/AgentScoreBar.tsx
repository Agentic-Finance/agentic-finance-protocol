'use client';

import React from 'react';

const TIER_COLORS = [
  { bg: 'bg-slate-500', text: 'text-slate-400', label: 'Newcomer' },
  { bg: 'bg-amber-600', text: 'text-amber-400', label: 'Rising' },
  { bg: 'bg-cyan-500', text: 'text-cyan-400', label: 'Trusted' },
  { bg: 'bg-indigo-500', text: 'text-indigo-400', label: 'Elite' },
  { bg: 'bg-fuchsia-500', text: 'text-fuchsia-400', label: 'Legend' },
];

interface Props {
  score: number;  // 0-100
  tier: number;   // 0-4
  size?: 'sm' | 'md';
}

export default function AgentScoreBar({ score, tier, size = 'md' }: Props) {
  const tc = TIER_COLORS[tier] ?? TIER_COLORS[0];
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 bg-white/[0.06] rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} ${tc.bg} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${tc.text} w-8 text-right`}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}
