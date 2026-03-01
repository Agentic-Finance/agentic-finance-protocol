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

import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = 'https://rpc.moderato.tempo.xyz';
const AI_PROOF_REGISTRY_ADDRESS = '0x8fDB8E871c9eaF2955009566F41490Bbb128a014';

const AI_PROOF_REGISTRY_ABI = [
  'function getStats() view returns (uint256 totalCommitments, uint256 totalVerified, uint256 totalMatched, uint256 totalMismatched, uint256 totalSlashed)',
  'function getCommitment(uint256 commitmentId) view returns (address committer, bytes32 planHash, bytes32 resultHash, uint256 nexusJobId, bool verified, bool matched, bool slashed, uint256 timestamp)',
];

// Cache stats for 30 seconds
let cachedStats: any = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

export async function GET() {
  try {
    const now = Date.now();

    if (cachedStats && now - cacheTime < CACHE_TTL) {
      return NextResponse.json(cachedStats);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, provider);

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

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[ProofStats] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch proof stats', details: error.message },
      { status: 500 },
    );
  }
}
