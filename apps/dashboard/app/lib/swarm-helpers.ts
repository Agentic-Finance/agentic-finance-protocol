/**
 * Swarm Helper Functions
 *
 * Shared business logic for swarm operations:
 * - syncSwarmProgress: recalculate totals after milestone approval
 * - getSwarmStats: aggregate stats for dashboard
 */

import prisma from './prisma';
import { logAuditEvent } from './audit-types';

/**
 * Recalculate SwarmSession totals after a milestone is approved.
 * Checks if all SwarmStreams are complete → marks swarm COMPLETED.
 */
export async function syncSwarmProgress(swarmId: string): Promise<void> {
  try {
    const swarm = await prisma.swarmSession.findUnique({
      where: { id: swarmId },
      include: {
        streams: {
          include: {
            streamJob: {
              include: { milestones: true },
            },
          },
        },
      },
    });

    if (!swarm) return;

    let totalReleased = 0;
    let allComplete = true;

    for (const ss of swarm.streams) {
      const stream = ss.streamJob;
      totalReleased += stream.releasedAmount;

      // Update SwarmStream released amount
      await prisma.swarmStream.update({
        where: { id: ss.id },
        data: {
          releasedAmount: stream.releasedAmount,
          status: stream.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
        },
      });

      if (stream.status !== 'COMPLETED') {
        allComplete = false;
      }
    }

    // Update SwarmSession totals
    await prisma.swarmSession.update({
      where: { id: swarmId },
      data: {
        totalReleased,
        status: allComplete ? 'COMPLETED' : 'ACTIVE',
        completedAt: allComplete ? new Date() : null,
      },
    });

    if (allComplete) {
      await logAuditEvent({
        swarmId,
        eventType: 'SWARM_COMPLETED',
        title: 'Swarm Completed',
        description: `All ${swarm.streams.length} agents have completed their milestones. Total: $${totalReleased}`,
        severity: 'SUCCESS',
      });
    }
  } catch (error: any) {
    console.error('[swarm-helpers] syncSwarmProgress error:', error.message);
  }
}

/**
 * Get aggregate stats for the swarm dashboard.
 */
export async function getSwarmStats() {
  const [
    totalSwarms,
    activeSwarms,
    completedSwarms,
    swarmBudgets,
    a2aStats,
    intelCount,
    auditCount,
    feeResult,
  ] = await Promise.all([
    prisma.swarmSession.count(),
    prisma.swarmSession.count({ where: { status: 'ACTIVE' } }),
    prisma.swarmSession.count({ where: { status: 'COMPLETED' } }),
    prisma.swarmSession.aggregate({
      _sum: { totalBudget: true, totalLocked: true, totalReleased: true },
    }),
    prisma.a2ATransfer.aggregate({
      _sum: { amount: true },
      _count: true,
    }),
    prisma.intelSubmission.count(),
    prisma.auditEvent.count(),
    // Platform fees from AgentJobs linked to swarm streams
    prisma.agentJob.aggregate({
      where: {
        StreamJob: {
          swarmStream: { isNot: null },
        },
      },
      _sum: { platformFee: true },
    }),
  ]);

  return {
    totalSwarms,
    activeSwarms,
    completedSwarms,
    totalBudgetLocked: swarmBudgets._sum.totalBudget || 0,
    totalEscrowLocked: swarmBudgets._sum.totalLocked || 0,
    totalReleased: swarmBudgets._sum.totalReleased || 0,
    a2aVolume: a2aStats._sum.amount || 0,
    a2aCount: a2aStats._count || 0,
    intelCount,
    auditCount,
    totalFees: feeResult._sum.platformFee || 0,
  };
}
