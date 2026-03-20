'use client';

import React from 'react';
import { AppShell } from '../components/ui/AppShell';
import dynamic from 'next/dynamic';

const LiveDashboard = dynamic(() => import('../components/LiveDashboard'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse flex flex-col items-center justify-center py-20 text-slate-500 text-sm">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
      Loading live feed...
    </div>
  ),
});

export default function LivePage() {
  return (
    <AppShell>
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse bg-green-400"
              style={{ boxShadow: '0 0 10px #4ade80' }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">
              LIVE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Transaction Feed</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time protocol activity on Tempo L1
          </p>
        </div>
        <LiveDashboard />
      </div>
    </AppShell>
  );
}
