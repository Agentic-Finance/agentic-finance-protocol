'use client';

/**
 * WalletButton — Connect / Disconnect wallet for Tempo Moderato
 * Compact button for dashboard header
 */
import { useWallet } from '../hooks/useWallet';

export function WalletButton() {
  const { isConnected, isConnecting, displayAddress, chain, connect, disconnect } = useWallet();

  if (isConnecting) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-400 text-xs font-mono border border-slate-700/50 cursor-wait"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        Connecting…
      </button>
    );
  }

  if (isConnected && displayAddress) {
    return (
      <button
        onClick={disconnect}
        className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-xs font-mono border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-200"
        title={`Connected to ${chain?.name ?? 'Unknown'} — Click to disconnect`}
      >
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
        <span>{displayAddress}</span>
        <span className="hidden group-hover:inline text-slate-400 text-[10px]">×</span>
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-medium border border-indigo-500/30 hover:border-indigo-400/50 transition-all duration-200"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
      </svg>
      Connect Wallet
    </button>
  );
}
