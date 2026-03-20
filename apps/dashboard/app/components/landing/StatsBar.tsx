'use client';
import React from 'react';

const STATS = [
  { label: 'AI Agents', value: '32+' },
  { label: 'Smart Contracts', value: '9' },
  { label: 'Chain ID', value: '42431' },
  { label: 'ZK Proofs', value: 'PLONK' },
];

export function StatsBar() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div
              key={s.label}
              className="text-center py-6 px-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
            >
              <p className="text-2xl sm:text-3xl font-black text-white font-mono mb-1">{s.value}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default StatsBar;
