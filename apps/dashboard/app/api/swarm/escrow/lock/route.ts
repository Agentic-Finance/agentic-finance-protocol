/**
 * /api/swarm/escrow/lock — Record NexusV2 Escrow Lock on SwarmSession
 *
 * POST: Lock budget in NexusV2 escrow for a swarm
 */

import prisma from '../../../../lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { logAuditEvent } from '@/app/lib/audit-types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { swarmId, escrowTxHash, onChainJobId, totalLocked } = body;

    if (!swarmId) {
      return apiError('Missing swarmId', 400);
    }

    const swarm = await prisma.swarmSession.findUnique({ where: { id: swarmId } });
    if (!swarm) {
      return apiError('Swarm not found', 404);
    }

    if (swarm.escrowStatus !== 'NONE') {
      return apiError(`Escrow already in state: ${swarm.escrowStatus}`, 400);
    }

    const updated = await prisma.swarmSession.update({
      where: { id: swarmId },
      data: {
        escrowTxHash: escrowTxHash || null,
        onChainJobId: onChainJobId ?? null,
        totalLocked: totalLocked || swarm.totalBudget,
        escrowStatus: 'LOCKED',
      },
    });

    await logAuditEvent({
      swarmId,
      eventType: 'ESCROW_LOCKED',
      title: `Escrow Locked: $${totalLocked || swarm.totalBudget}`,
      description: `NexusV2 escrow locked for swarm "${swarm.name}"`,
      metadata: { totalLocked: totalLocked || swarm.totalBudget, onChainJobId },
      txHash: escrowTxHash,
      severity: 'SUCCESS',
    });

    return apiSuccess({ swarm: updated });
  } catch (error: any) {
    return logAndReturn('ESCROW_LOCK', error, 'Failed to lock escrow');
  }
}
