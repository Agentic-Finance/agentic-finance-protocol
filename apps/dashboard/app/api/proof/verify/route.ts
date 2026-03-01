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

import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = 'https://rpc.moderato.tempo.xyz';
const AI_PROOF_REGISTRY_ADDRESS = '0x8fDB8E871c9eaF2955009566F41490Bbb128a014';

const AI_PROOF_REGISTRY_ABI = [
  'function getCommitment(uint256 commitmentId) view returns (address committer, bytes32 planHash, bytes32 resultHash, uint256 nexusJobId, bool verified, bool matched, bool slashed, uint256 timestamp)',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'Missing ?id=<commitmentId>' }, { status: 400 });
    }

    const commitmentId = parseInt(idParam, 10);
    if (isNaN(commitmentId) || commitmentId < 0) {
      return NextResponse.json({ error: 'Invalid commitment ID' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, provider);

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

    return NextResponse.json({
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
    console.error('[ProofVerify] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to verify commitment', details: error.message },
      { status: 500 },
    );
  }
}
