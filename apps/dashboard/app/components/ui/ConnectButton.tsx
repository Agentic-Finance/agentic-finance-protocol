'use client';
import React from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Wallet } from 'lucide-react';

export function ConnectButton() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets();

  const walletAddress = wallets?.[0]?.address || user?.wallet?.address;
  const displayName = user?.google?.name || user?.discord?.username || user?.email?.address ||
    (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : null);

  if (!ready) {
    return (
      <div className="w-[140px] h-[36px] rounded-xl animate-pulse" style={{ background: 'var(--pp-surface-1)' }} />
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        type="button"
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }}
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
      </button>
    );
  }

  // When authenticated, UserProfileArea handles the display + dropdown
  // ConnectButton should not render anything to avoid double UI
  return null;
}

export default ConnectButton;
