/**
 * /api/a2a/chain/[chainId] — A2A Chain Detail
 *
 * GET: Returns full chain detail including root job, all sub-tasks
 *      with agent info, progress breakdown, and budget tracking.
 */

import prisma from '@/app/lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ chainId: string }> }
) {
  try {
    const { chainId } = await params;

    if (!chainId) {
      return apiError('Chain ID is required', 400);
    }

    // ── Fetch all jobs in this chain ──
    const allJobs = await prisma.agentJob.findMany({
      where: { a2aChainId: chainId },
      include: {
        agent: { select: { name: true, avatarEmoji: true, category: true } },
      },
      orderBy: [{ depth: 'asc' }, { stepIndex: 'asc' }],
    });

    if (allJobs.length === 0) {
      return apiError('A2A chain not found', 404);
    }

    // ── Separate root job from sub-tasks ──
    const rootJob = allJobs.find(j => j.depth === 0);
    if (!rootJob) {
      return apiError('Root job not found for this chain', 404);
    }

    const subTasks = allJobs
      .filter(j => j.depth > 0)
      .map(t => ({
        id: t.id,
        stepIndex: t.stepIndex,
        depth: t.depth,
        agentId: t.agentId,
        agent: {
          name: t.agent.name,
          avatarEmoji: t.agent.avatarEmoji,
          category: t.agent.category,
        },
        prompt: t.prompt,
        budget: t.budget,
        negotiatedPrice: t.negotiatedPrice,
        status: t.status,
        result: t.result,
        dependsOn: t.dependsOn ? JSON.parse(t.dependsOn) : [],
        executionTime: t.executionTime,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      }));

    // ── Compute progress ──
    const total = subTasks.length;
    const completed = subTasks.filter(t => t.status === 'COMPLETED').length;
    const failed = subTasks.filter(t => t.status === 'FAILED').length;
    const executing = subTasks.filter(t => t.status === 'EXECUTING').length;
    const pending = total - completed - failed - executing;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    // ── Compute budget breakdown ──
    const spent = subTasks
      .filter(t => t.status === 'COMPLETED' || t.status === 'SETTLED')
      .reduce((sum, t) => sum + (t.negotiatedPrice || t.budget), 0);
    const totalBudget = rootJob.budget;
    const remaining = totalBudget - spent - (rootJob.platformFee || 0);

    return apiSuccess({
      a2aChainId: chainId,
      rootJob: {
        id: rootJob.id,
        agentId: rootJob.agentId,
        agent: {
          name: rootJob.agent.name,
          avatarEmoji: rootJob.agent.avatarEmoji,
          category: rootJob.agent.category,
        },
        clientWallet: rootJob.clientWallet,
        prompt: rootJob.prompt,
        budget: rootJob.budget,
        platformFee: rootJob.platformFee,
        status: rootJob.status,
        createdAt: rootJob.createdAt,
        completedAt: rootJob.completedAt,
      },
      subTasks,
      progress: {
        total,
        completed,
        failed,
        executing,
        pending,
        percentComplete,
      },
      budget: {
        total: totalBudget,
        spent,
        remaining: Math.max(0, remaining),
        platformFee: rootJob.platformFee || 0,
      },
    });
  } catch (error: any) {
    return logAndReturn('A2A_CHAIN_DETAIL', error, 'Failed to get A2A chain detail');
  }
}
