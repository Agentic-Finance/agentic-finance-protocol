/**
 * GET /api/proof/verify?id=<commitmentId>
 *
 * Public API endpoint to verify a specific AI proof commitment.
 * Reads from the on-chain AIProofRegistry contract on Tempo L1.
 *
 * Response:
 * {
 *   commitmentId: number,
 *   committer: string,
 *   planHash: string,
 *   resultHash: string,
 *   nexusJobId: number,
 *   verified: boolean,
 *   matched: boolean,
 *   slashed: boolean,
 *   timestamp: number,
 *   status: 'pending' | 'verified-match' | 'verified-mismatch' | 'slashed',
 *   explorerUrl: string,
 * }
 */

import { ethers } from 'ethers';
import { RPC_URL, AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI } from '@/app/lib/constants';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return apiError('Missing ?id=<commitmentId>', 400);
    }

    const commitmentId = parseInt(idParam, 10);
    if (isNaN(commitmentId) || commitmentId < 0) {
      return apiError('Invalid commitment ID', 400);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, [...AI_PROOF_REGISTRY_ABI], provider);

    const commitment = await registry.getCommitment(commitmentId);

    const committer = commitment[0];
    const planHash = commitment[1];
    const resultHash = commitment[2];
    const nexusJobId = Number(commitment[3]);
    const verified = commitment[4];
    const matched = commitment[5];
    const slashed = commitment[6];
    const timestamp = Number(commitment[7]);

    // Determine status
    let status: string;
    if (slashed) status = 'slashed';
    else if (verified && matched) status = 'verified-match';
    else if (verified && !matched) status = 'verified-mismatch';
    else status = 'pending';

    return apiSuccess({
      commitmentId,
      committer,
      planHash,
      resultHash: verified ? resultHash : null,
      nexusJobId: nexusJobId > 0 ? nexusJobId : null,
      verified,
      matched,
      slashed,
      timestamp,
      timestampISO: timestamp > 0 ? new Date(timestamp * 1000).toISOString() : null,
      status,
      explorerUrl: `https://explore.tempo.xyz/address/${AI_PROOF_REGISTRY_ADDRESS}`,
      chainId: 42431,
    });
  } catch (error: any) {
    return logAndReturn('ProofVerify', error, 'Failed to verify commitment');
  }
}
