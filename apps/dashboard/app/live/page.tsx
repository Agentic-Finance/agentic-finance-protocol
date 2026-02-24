'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const LiveDashboard = dynamic(() => import('../components/LiveDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🧠</div>
        <p className="text-slate-400 text-sm">Connecting to Nerve Center...</p>
      </div>
    </div>
  ),
});

export default function LivePage() {
  return <LiveDashboard />;
}
