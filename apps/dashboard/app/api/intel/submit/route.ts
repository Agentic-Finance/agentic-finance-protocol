/**
 * /api/intel/submit — Submit Intelligence to the ZK Market
 *
 * POST: Submit intel with Poseidon ZK commitment
 */

import prisma from '../../../lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { getPoseidon } from '@/app/lib/poseidon-cache';
import { logAuditEvent } from '@/app/lib/audit-types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sourceAgentId,
      category,
      title,
      summary,
      dataHash,
      price,
      token = 'AlphaUSD',
      // ZK fields — client can provide pre-computed or we generate
      zkCommitment,
      zkProof,
      nullifierHash,
      secret, // If provided, we compute commitment server-side
    } = body;

    if (!category || !title || !summary || !dataHash || !price) {
      return apiError('Missing required fields: category, title, summary, dataHash, price', 400);
    }

    const validCategories = ['security', 'defi', 'market', 'governance'];
    if (!validCategories.includes(category)) {
      return apiError(`Invalid category. Must be one of: ${validCategories.join(', ')}`, 400);
    }

    // Generate ZK commitment if not provided
    let commitment = zkCommitment;
    let nullifier = nullifierHash;

    if (!commitment && secret) {
      // Compute Poseidon commitment: C = Poseidon(secret, dataHash_numeric, price_scaled)
      const poseidon = await getPoseidon();
      const dataHashNum = BigInt('0x' + dataHash.replace(/^0x/, '').slice(0, 16));
      const priceScaled = BigInt(Math.round(price * 100)); // cents

      const commitHash = poseidon([BigInt(secret), dataHashNum, priceScaled]);
      commitment = poseidon.F.toObject(commitHash).toString();

      const nullHash = poseidon([BigInt(secret), BigInt(42)]); // salt = 42
      nullifier = poseidon.F.toObject(nullHash).toString();
    }

    if (!commitment) {
      return apiError('Must provide zkCommitment or secret for commitment generation', 400);
    }

    // Check for double-submit via nullifier
    if (nullifier) {
      const existing = await prisma.intelSubmission.findFirst({
        where: { nullifierHash: nullifier },
      });
      if (existing) {
        return apiError('Duplicate submission detected (nullifier already exists)', 409);
      }
    }

    const submission = await prisma.intelSubmission.create({
      data: {
        sourceAgentId: sourceAgentId || null,
        zkCommitment: commitment,
        zkProof: zkProof || null,
        nullifierHash: nullifier || null,
        category,
        title,
        summary,
        dataHash,
        price,
        token,
        status: 'LISTED',
      },
    });

    // Log audit
    await logAuditEvent({
      agentId: sourceAgentId,
      eventType: 'INTEL_SUBMITTED',
      title: `Intel: "${title}"`,
      description: `New ${category} intel listed at $${price}`,
      metadata: { category, price, dataHash: dataHash.slice(0, 16) },
      severity: 'INFO',
    });

    return apiSuccess({ submission }, 201);
  } catch (error: any) {
    return logAndReturn('INTEL_SUBMIT', error, 'Failed to submit intel');
  }
}
