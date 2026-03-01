/**
 * GET /api/proof/history?limit=20&offset=0
 *
 * Public API endpoint that returns recent AI proof commitments
 * by reading events from the AIProofRegistry contract.
 *
 * Response:
 * {
 *   commitments: Array<{
 *     commitmentId, committer, planHash, nexusJobId,
 *     verified, matched, slashed, status, timestamp
 *   }>,
 *   total: number,
 * }
 */

import { ethers } from 'ethers';
import { RPC_URL, AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI } from '@/app/lib/constants';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';

// Cache for 30 seconds
let cachedHistory: any = null;
let cacheTime = 0;
let cacheKey = '';
const CACHE_TTL = 30_000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const key = `${limit}:${offset}`;

    if (cachedHistory && cacheKey === key && Date.now() - cacheTime < CACHE_TTL) {
      return apiSuccess(cachedHistory);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, [...AI_PROOF_REGISTRY_ABI], provider);

    // Get total commitments
    const stats = await registry.getStats();
    const total = Number(stats[0]);

    if (total === 0) {
      return apiSuccess({ commitments: [], total: 0 });
    }

    // Fetch commitment details (most recent first)
    const startId = Math.max(total - offset, 0);
    const endId = Math.max(startId - limit, 0);

    const commitments: any[] = [];
    for (let id = startId; id > endId; id--) {
      try {
        const c = await registry.getCommitment(id);

        let status: string;
        if (c[6]) status = 'slashed';
        else if (c[4] && c[5]) status = 'verified-match';
        else if (c[4] && !c[5]) status = 'verified-mismatch';
        else status = 'pending';

        commitments.push({
          commitmentId: id,
          committer: c[0],
          planHash: c[1],
          resultHash: c[4] ? c[2] : null,
          nexusJobId: Number(c[3]) > 0 ? Number(c[3]) : null,
          verified: c[4],
          matched: c[5],
          slashed: c[6],
          timestamp: Number(c[7]),
          timestampISO: Number(c[7]) > 0 ? new Date(Number(c[7]) * 1000).toISOString() : null,
          status,
        });
      } catch {
        // Skip failed reads
      }
    }

    const result = {
      commitments,
      total,
      limit,
      offset,
      hasMore: endId > 0,
    };

    cachedHistory = result;
    cacheKey = key;
    cacheTime = Date.now();

    return apiSuccess(result);
  } catch (error: any) {
    return logAndReturn('ProofHistory', error, 'Failed to fetch proof history');
  }
}
