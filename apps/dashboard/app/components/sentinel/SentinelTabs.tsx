'use client';

import React from 'react';
import type { SentinelTab } from '../../lib/warroom-types';

const TABS: { id: SentinelTab; label: string; icon: string; color: string }[] = [
  { id: 'overview', label: 'Overview', icon: '🌐', color: 'cyan' },
  { id: 'trust',    label: 'Trust Board', icon: '⭐', color: 'amber' },
  { id: 'staking',  label: 'Staking', icon: '🔐', color: 'violet' },
  { id: 'risk',     label: 'Risk Console', icon: '🚨', color: 'red' },
];

interface Props {
  active: SentinelTab;
  onChange: (tab: SentinelTab) => void;
}

export default function SentinelTabs({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1.5 w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            active === tab.id
              ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          <span>{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
