'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import SubPageNav from '../components/SubPageNav';

const LiveDashboard = dynamic(() => import('../components/LiveDashboard'), {
  ssr: false,
  loading: () => <TabSkeleton label="Connecting to Cortex..." />,
});

const ShieldPanel = dynamic(() => import('../components/ShieldPanel'), {
  ssr: false,
  loading: () => <TabSkeleton label="Loading Shield..." />,
});

const RevenueDashboard = dynamic(() => import('../components/RevenueDashboard'), {
  ssr: false,
  loading: () => <TabSkeleton label="Loading Revenue..." />,
});

const EmbeddedWallets = dynamic(() => import('../components/EmbeddedWallets'), {
  ssr: false,
  loading: () => <TabSkeleton label="Loading Wallets..." />,
});

function TabSkeleton({ label }: { label: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">{label}</p>
      </div>
    </div>
  );
}

type ViewTab = 'feed' | 'shield' | 'revenue' | 'wallets';

const viewTabs: { id: ViewTab; label: string; icon: string }[] = [
  { id: 'feed', label: 'Live Feed', icon: '⚡' },
  { id: 'shield', label: 'Shield', icon: '🛡️' },
  { id: 'revenue', label: 'Revenue', icon: '💰' },
  { id: 'wallets', label: 'Wallets', icon: '👛' },
];

export default function CortexPage() {
  const [activeView, setActiveView] = useState<ViewTab>('feed');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Try to get wallet from localStorage (set by OmniTerminal or other wallet flows)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('connectedWallet') || localStorage.getItem('walletAddress');
      if (saved) setWalletAddress(saved);
    } catch {}
  }, []);

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d1a 50%, #0a0a12 100%)' }}>
      <SubPageNav />

      {/* Internal tab bar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: '#10b981', opacity: 0.3 }} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">LIVE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Cortex</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Real-time protocol activity, privacy layer, revenue & wallet management</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit overflow-x-auto scrollbar-hide">
          {viewTabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
                  isActive
                    ? 'text-white bg-white/[0.08] shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeView === 'feed' && <LiveDashboard />}
      {activeView === 'shield' && <ShieldPanel walletAddress={walletAddress} />}
      {activeView === 'revenue' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <RevenueDashboard />
        </div>
      )}
      {activeView === 'wallets' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <EmbeddedWallets walletAddress={walletAddress} />
        </div>
      )}
    </div>
  );
}
