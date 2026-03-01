/**
 * GET /api/proof/stats
 *
 * Public API endpoint that returns AIProofRegistry statistics.
 * Reads from the on-chain AIProofRegistry contract on Tempo L1.
 *
 * Response:
 * {
 *   totalCommitments: number,
 *   totalVerified: number,
 *   totalMatched: number,
 *   totalMismatched: number,
 *   totalSlashed: number,
 *   matchRate: string (percentage),
 *   chainId: 42431,
 *   contractAddress: string,
 *   explorerUrl: string,
 * }
 */

import { ethers } from 'ethers';
import { RPC_URL, AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI } from '@/app/lib/constants';
import { apiSuccess, logAndReturn } from '@/app/lib/api-response';

// Cache stats for 30 seconds
let cachedStats: any = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

export async function GET() {
  try {
    const now = Date.now();

    if (cachedStats && now - cacheTime < CACHE_TTL) {
      return apiSuccess(cachedStats);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, [...AI_PROOF_REGISTRY_ABI], provider);

    const stats = await registry.getStats();

    const totalCommitments = Number(stats[0]);
    const totalVerified = Number(stats[1]);
    const totalMatched = Number(stats[2]);
    const totalMismatched = Number(stats[3]);
    const totalSlashed = Number(stats[4]);

    const matchRate = totalVerified > 0
      ? ((totalMatched / totalVerified) * 100).toFixed(1)
      : '0.0';

    const result = {
      totalCommitments,
      totalVerified,
      totalMatched,
      totalMismatched,
      totalSlashed,
      matchRate: `${matchRate}%`,
      integrity: totalVerified > 0 ? matchRate : 'N/A',
      chainId: 42431,
      network: 'Tempo L1 Moderato',
      contractAddress: AI_PROOF_REGISTRY_ADDRESS,
      explorerUrl: `https://explore.tempo.xyz/address/${AI_PROOF_REGISTRY_ADDRESS}`,
      lastUpdated: new Date().toISOString(),
    };

    cachedStats = result;
    cacheTime = now;

    return apiSuccess(result);
  } catch (error: any) {
    return logAndReturn('ProofStats', error, 'Failed to fetch proof stats');
  }
}
