/**
 * Tempo Chain Definitions — Testnet + Mainnet
 * Custom chain configs for viem
 */
import { defineChain } from 'viem';

/** Tempo Moderato — Testnet (Chain 42431) */
export const tempoModerato = defineChain({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'TEMPO', symbol: 'TEMPO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.moderato.tempo.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.moderato.tempo.xyz' },
  },
});

/** Tempo Mainnet (Chain 4217) */
export const tempoMainnet = defineChain({
  id: 4217,
  name: 'Tempo',
  nativeCurrency: { name: 'TEMPO', symbol: 'TEMPO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.tempo.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
  },
});

/** Get the active chain based on environment */
export function getActiveChain() {
  const env = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_CHAIN_ENV || 'testnet')
    : (process.env.NEXT_PUBLIC_CHAIN_ENV || process.env.CHAIN_ENV || 'testnet');
  return env === 'mainnet' ? tempoMainnet : tempoModerato;
}

/** Check if we're on mainnet */
export function isMainnet(): boolean {
  return getActiveChain().id === 4217;
}
