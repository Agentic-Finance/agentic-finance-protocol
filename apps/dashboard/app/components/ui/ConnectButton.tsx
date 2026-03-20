'use client';
import React from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none' as const, userSelect: 'none' as const },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }}
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="hidden sm:inline">Connect Wallet</span>
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex-shrink-0" />
                  <span className="hidden sm:inline font-mono text-xs">{account.displayName}</span>
                </button>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}

export default ConnectButton;
