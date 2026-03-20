'use client';
import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { ConnectButton } from '../ui/ConnectButton';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isConnected, isConnecting } = useWallet();

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--pp-bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Connecting...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--pp-bg-primary)' }}
      >
        {/* Gradient mesh background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF2D87]/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 p-8 max-w-md w-full mx-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-2xl font-black text-white">A</span>
          </div>

          {/* Card */}
          <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-xl text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to Agentic Finance</h1>
            <p className="text-sm text-slate-400 mb-8">
              Connect your wallet to access the agent economy
            </p>

            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Powered by Tempo L1 &middot; Chain 42431
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
