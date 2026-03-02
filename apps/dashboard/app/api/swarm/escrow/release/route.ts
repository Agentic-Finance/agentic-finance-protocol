/**
 * /api/swarm/escrow/release — Release Escrow to Agent
 *
 * POST: Release portion of escrow to a specific agent, update totals
 */

import prisma from '../../../../lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { logAuditEvent } from '@/app/lib/audit-types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { swarmId, agentWallet, amount, txHash } = body;

    if (!swarmId || !agentWallet || !amount) {
      return apiError('Missing required fields: swarmId, agentWallet, amount', 400);
    }

    const swarm = await prisma.swarmSession.findUnique({
      where: { id: swarmId },
      include: { streams: { include: { streamJob: true } } },
    });

    if (!swarm) {
      return apiError('Swarm not found', 404);
    }

    if (swarm.escrowStatus !== 'LOCKED' && swarm.escrowStatus !== 'DISTRIBUTING') {
      return apiError(`Cannot release from escrow in state: ${swarm.escrowStatus}`, 400);
    }

    // Find the agent's stream in this swarm
    const agentStream = swarm.streams.find(
      (s) => s.streamJob.agentWallet.toLowerCase() === agentWallet.toLowerCase()
    );

    if (!agentStream) {
      return apiError(`Agent ${agentWallet} not found in this swarm`, 404);
    }

    // Check we're not over-releasing
    const newReleased = swarm.totalReleased + amount;
    if (newReleased > swarm.totalLocked) {
      return apiError(`Release would exceed locked amount ($${newReleased} > $${swarm.totalLocked})`, 400);
    }

    // Check if all funds are now distributed
    const allDistributed = Math.abs(newReleased - swarm.totalLocked) < 0.01;

    // Update in transaction
    await prisma.$transaction([
      prisma.swarmSession.update({
        where: { id: swarmId },
        data: {
          totalReleased: { increment: amount },
          escrowStatus: allDistributed ? 'SETTLED' : 'DISTRIBUTING',
        },
      }),
      prisma.swarmStream.update({
        where: { id: agentStream.id },
        data: {
          releasedAmount: { increment: amount },
        },
      }),
    ]);

    await logAuditEvent({
      swarmId,
      agentName: agentStream.streamJob.agentName || agentWallet.slice(0, 10),
      eventType: allDistributed ? 'ESCROW_SETTLED' : 'ESCROW_RELEASED',
      title: allDistributed
        ? `Escrow Settled: $${swarm.totalLocked}`
        : `Escrow Release: $${amount} → ${agentStream.streamJob.agentName || agentWallet.slice(0, 10)}`,
      description: `Released $${amount} to ${agentWallet}. Total: $${newReleased}/$${swarm.totalLocked}`,
      metadata: { agentWallet, amount, totalReleased: newReleased },
      txHash,
      severity: 'SUCCESS',
    });

    return apiSuccess({
      released: amount,
      totalReleased: newReleased,
      escrowStatus: allDistributed ? 'SETTLED' : 'DISTRIBUTING',
    });
  } catch (error: any) {
    return logAndReturn('ESCROW_RELEASE', error, 'Failed to release escrow');
  }
}
