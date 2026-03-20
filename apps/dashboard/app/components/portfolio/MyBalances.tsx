'use client';

import React from 'react';

interface TokenBalance {
  symbol: string;
  balance: string;
  address: string;
}

interface MyBalancesProps {
  balances: TokenBalance[];
}

const TOKEN_COLORS: Record<string, string> = {
  AlphaUSD: 'bg-purple-500',
  pathUSD: 'bg-emerald-500',
  BetaUSD: 'bg-yellow-500',
  ThetaUSD: 'bg-red-500',
};

const TOKEN_GLOW: Record<string, string> = {
  AlphaUSD: 'shadow-purple-500/20',
  pathUSD: 'shadow-emerald-500/20',
  BetaUSD: 'shadow-yellow-500/20',
  ThetaUSD: 'shadow-red-500/20',
};

export default function MyBalances({ balances }: MyBalancesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {balances.map((token) => {
        const dotColor = TOKEN_COLORS[token.symbol] ?? 'bg-slate-500';
        const glow = TOKEN_GLOW[token.symbol] ?? '';

        return (
          <div
            key={token.address}
            className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-all hover:translate-y-[-2px] ${glow}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {token.symbol}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-slate-500 text-lg font-bold">$</span>
              <span className="text-2xl font-black text-white tabular-nums font-mono">
                {parseFloat(token.balance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 mt-2 font-mono truncate">
              {token.address}
            </p>
          </div>
        );
      })}
    </div>
  );
}
