'use client';

import React from 'react';

interface TierBadgeProps {
  /** Tier number: 0=None, 1=Bronze, 2=Silver, 3=Gold */
  tier: number;
  /** Show compact badge (no label) */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

const TIERS = [
  { name: 'None',   emoji: '⚪', color: 'text-slate-500 border-slate-500/20 bg-slate-500/5' },
  { name: 'Bronze', emoji: '🥉', color: 'text-amber-600 border-amber-600/30 bg-amber-600/10' },
  { name: 'Silver', emoji: '🥈', color: 'text-slate-300 border-slate-300/30 bg-slate-300/10' },
  { name: 'Gold',   emoji: '🥇', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10 shadow-[0_0_12px_rgba(250,204,21,0.15)]' },
];

export default function TierBadge({ tier, compact, className = '' }: TierBadgeProps) {
  const t = TIERS[tier] ?? TIERS[0];

  if (tier === 0 && compact) return null; // Don't show for None in compact mode

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs ${className}`} title={`${t.name} Tier`}>
        <span>{t.emoji}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${t.color} ${className}`}>
      <span>{t.emoji}</span>
      <span>{t.name}</span>
    </span>
  );
}
