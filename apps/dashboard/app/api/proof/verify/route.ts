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

    // Support both numeric IDs (converted to bytes32) and raw bytes32 hashes
    let commitmentId: string;
    if (idParam.startsWith('0x') && idParam.length === 66) {
      commitmentId = idParam;
    } else {
      const numId = parseInt(idParam, 10);
      if (isNaN(numId) || numId < 0) {
        return apiError('Invalid commitment ID — provide a number or bytes32 hash', 400);
      }
      commitmentId = ethers.zeroPadValue(ethers.toBeHex(numId), 32);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, [...AI_PROOF_REGISTRY_ABI], provider);

    const commitment = await registry.getCommitment(commitmentId);

    const committer = String(commitment[0]);
    const planHash = String(commitment[1]);
    const resultHash = String(commitment[2]);
    const nexusJobId = Number(commitment[3] ?? 0);
    const verified = Boolean(commitment[4] ?? false);
    const matched = Boolean(commitment[5] ?? false);
    const slashed = Boolean(commitment[6] ?? false);
    const timestamp = Number(commitment[7] ?? 0);

    // Determine status
    let status: string;
    if (slashed) status = 'slashed';
    else if (verified && matched) status = 'verified-match';
    else if (verified && !matched) status = 'verified-mismatch';
    else status = 'pending';

    return apiSuccess({
      commitmentId: String(commitmentId),
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
      explorerUrl: `https://explore.moderato.tempo.xyz/address/${AI_PROOF_REGISTRY_ADDRESS}`,
      chainId: 42431,
    });
  } catch (error: any) {
    return logAndReturn('ProofVerify', error, 'Failed to verify commitment');
  }
}
