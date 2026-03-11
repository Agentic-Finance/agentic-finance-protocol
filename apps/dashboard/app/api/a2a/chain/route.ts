/**
 * /api/a2a/chain — List A2A Orchestration Chains
 *
 * GET: Returns a paginated list of A2A chains for a wallet,
 *      each with root job info, sub-task count, and progress.
 *
 * Query params:
 *   wallet  — required, 0x address
 *   limit   — optional, default 20
 *   offset  — optional, default 0
 */

import prisma from '@/app/lib/prisma';
import { apiSuccess, apiError, logAndReturn, isValidAddress } from '@/app/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet')?.trim().toLowerCase();
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!wallet || !isValidAddress(wallet)) {
      return apiError('Valid wallet address required (?wallet=0x...)', 400);
    }

    // ── Fetch root jobs (depth 0) for this wallet ──
    const [rootJobs, total] = await Promise.all([
      prisma.agentJob.findMany({
        where: {
          a2aChainId: { not: null },
          depth: 0,
          clientWallet: wallet,
        },
        include: {
          agent: { select: { name: true, avatarEmoji: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.agentJob.count({
        where: {
          a2aChainId: { not: null },
          depth: 0,
          clientWallet: wallet,
        },
      }),
    ]);

    // ── For each root job, count sub-tasks and compute progress ──
    const chains = await Promise.all(
      rootJobs.map(async (rootJob) => {
        const subTasks = await prisma.agentJob.groupBy({
          by: ['status'],
          where: {
            a2aChainId: rootJob.a2aChainId!,
            depth: { gt: 0 },
          },
          _count: true,
        });

        const statusCounts: Record<string, number> = {};
        let totalSubTasks = 0;
        for (const group of subTasks) {
          statusCounts[group.status] = group._count;
          totalSubTasks += group._count;
        }

        const completed = statusCounts['COMPLETED'] || 0;
        const failed = statusCounts['FAILED'] || 0;
        const percentComplete = totalSubTasks > 0
          ? Math.round((completed / totalSubTasks) * 100)
          : 0;

        return {
          a2aChainId: rootJob.a2aChainId,
          rootJobId: rootJob.id,
          prompt: rootJob.prompt,
          budget: rootJob.budget,
          status: rootJob.status,
          agent: {
            name: rootJob.agent.name,
            avatarEmoji: rootJob.agent.avatarEmoji,
            category: rootJob.agent.category,
          },
          subTaskCount: totalSubTasks,
          progress: {
            total: totalSubTasks,
            completed,
            failed,
            executing: statusCounts['EXECUTING'] || 0,
            pending: totalSubTasks - completed - failed - (statusCounts['EXECUTING'] || 0),
            percentComplete,
          },
          createdAt: rootJob.createdAt,
          completedAt: rootJob.completedAt,
        };
      }),
    );

    return apiSuccess({ chains, total });
  } catch (error: any) {
    return logAndReturn('A2A_CHAIN_LIST', error, 'Failed to list A2A chains');
  }
}
