/**
 * Tempo Moderato Chain Definition
 * Custom chain config for viem — Tempo L1 testnet (Chain 42431)
 */
import { defineChain } from 'viem';

export const tempoModerato = defineChain({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: {
    name: 'TEMPO',
    symbol: 'TEMPO',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.moderato.tempo.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tempo Explorer',
      url: 'https://explorer.moderato.tempo.xyz',
    },
  },
  // Tempo L1 specifics
  // - Gas is free on testnet (no native gas token needed)
  // - Custom tx type 0x76 (TempoTransaction) for AA features
  // - TIP-20 precompile tokens use 5-6x more gas than standard ERC20
});
