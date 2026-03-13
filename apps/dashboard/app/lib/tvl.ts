/**
 * TVL (Total Value Locked) Computation
 *
 * Reads balanceOf for each token on each contract to compute
 * the total value locked across all PayPol smart contracts.
 *
 * Contracts: NexusV2, ShieldVaultV2, StreamV1, MultisendV2
 * Tokens: AlphaUSD, pathUSD, BetaUSD, ThetaUSD
 *
 * Migrated from ethers.js to viem for Tempo AA foundation.
 */

import { type Address, formatUnits } from 'viem';
import { publicClient } from './tempo/clients';
import { ERC20_VIEM_ABI } from './tempo/contracts';

// Smart contracts holding locked funds
const TVL_CONTRACTS = [
  { name: 'NexusV2',      address: '0x6A467Cd4156093bB528e448C04366586a1052Fab' as Address, label: 'Escrow' },
  { name: 'ShieldVaultV2', address: '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055' as Address, label: 'Shield Vault' },
  { name: 'StreamV1',     address: '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C' as Address, label: 'Streams' },
  { name: 'MultisendV2',  address: '0x25f4d3f12C579002681a52821F3a6251c46D4575' as Address, label: 'Multisend' },
] as const;

// Stablecoins tracked
const TVL_TOKENS = [
  { symbol: 'AlphaUSD', address: '0x20c0000000000000000000000000000000000001' as Address, decimals: 6 },
  { symbol: 'pathUSD',  address: '0x20c0000000000000000000000000000000000000' as Address, decimals: 6 },
  { symbol: 'BetaUSD',  address: '0x20c0000000000000000000000000000000000002' as Address, decimals: 6 },
  { symbol: 'ThetaUSD', address: '0x20c0000000000000000000000000000000000003' as Address, decimals: 6 },
] as const;

export interface TVLBreakdown {
  /** Total USD value locked across all contracts */
  totalUSD: number;
  /** Breakdown by contract */
  byContract: {
    name: string;
    label: string;
    address: string;
    totalUSD: number;
    tokens: { symbol: string; balance: number; }[];
  }[];
  /** Breakdown by token */
  byToken: {
    symbol: string;
    totalUSD: number;
  }[];
  /** Timestamp of computation */
  computedAt: string;
}

/**
 * Compute TVL across all PayPol contracts.
 * Uses viem publicClient.readContract for each token×contract pair.
 */
export async function computeTVL(): Promise<TVLBreakdown> {
  const byContract: TVLBreakdown['byContract'] = [];
  const tokenTotals: Record<string, number> = {};
  let totalUSD = 0;

  for (const contract of TVL_CONTRACTS) {
    const tokens: { symbol: string; balance: number }[] = [];
    let contractTotal = 0;

    for (const token of TVL_TOKENS) {
      try {
        const rawBalance = await publicClient.readContract({
          address: token.address,
          abi: ERC20_VIEM_ABI,
          functionName: 'balanceOf',
          args: [contract.address],
        });

        const balance = Number(formatUnits(rawBalance as bigint, token.decimals));
        tokens.push({ symbol: token.symbol, balance });
        contractTotal += balance;
        tokenTotals[token.symbol] = (tokenTotals[token.symbol] ?? 0) + balance;
      } catch {
        tokens.push({ symbol: token.symbol, balance: 0 });
      }
    }

    byContract.push({
      name: contract.name,
      label: contract.label,
      address: contract.address,
      totalUSD: contractTotal,
      tokens,
    });

    totalUSD += contractTotal;
  }

  const byToken = Object.entries(tokenTotals).map(([symbol, totalUSD]) => ({
    symbol,
    totalUSD,
  }));

  return {
    totalUSD,
    byContract,
    byToken,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Get cached TVL (with 30s revalidation).
 * Uses a simple in-memory cache.
 */
let cachedTVL: TVLBreakdown | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function getCachedTVL(): Promise<TVLBreakdown> {
  if (cachedTVL && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedTVL;
  }
  cachedTVL = await computeTVL();
  cacheTimestamp = Date.now();
  return cachedTVL;
}
