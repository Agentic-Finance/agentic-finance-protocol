/**
 * /api/swarm/stream — Create & List Swarm Sessions
 *
 * POST: Create swarm (SwarmSession + N StreamJobs + SwarmStreams) in $transaction
 * GET:  List swarms with aggregate stats
 */

import prisma from '../../../lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { logAuditEvent } from '@/app/lib/audit-types';
import { notify } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      clientWallet,
      totalBudget,
      deadlineHours = 168,
      agents, // [{ agentWallet, agentName?, agentId?, role?, budget, milestones: [{ amount, deliverable }] }]
    } = body;

    if (!name || !clientWallet || !totalBudget || !agents?.length) {
      return apiError('Missing required fields: name, clientWallet, totalBudget, agents', 400);
    }

    // Validate agent budgets sum to total
    const agentBudgetSum = agents.reduce((sum: number, a: any) => sum + (a.budget || 0), 0);
    if (Math.abs(agentBudgetSum - totalBudget) > 0.01) {
      return apiError(`Agent budgets ($${agentBudgetSum}) don't match total ($${totalBudget})`, 400);
    }

    const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    // Create everything in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create SwarmSession
      const swarm = await tx.swarmSession.create({
        data: {
          name,
          clientWallet: clientWallet.toLowerCase(),
          totalBudget,
          agentCount: agents.length,
          deadline,
        },
      });

      // 2. Create StreamJob + SwarmStream per agent
      const swarmStreams: any[] = [];
      for (const agent of agents) {
        // Validate milestones
        const milestoneSum = (agent.milestones || []).reduce((s: number, m: any) => s + m.amount, 0);
        if (agent.milestones?.length && Math.abs(milestoneSum - agent.budget) > 0.01) {
          throw new Error(`Milestone mismatch for ${agent.agentName || agent.agentWallet}: $${milestoneSum} vs $${agent.budget}`);
        }

        // Create StreamJob
        const streamJob = await tx.streamJob.create({
          data: {
            clientWallet: clientWallet.toLowerCase(),
            agentWallet: agent.agentWallet.toLowerCase(),
            agentName: agent.agentName || null,
            totalBudget: agent.budget,
            deadline,
            milestones: {
              create: (agent.milestones || [{ amount: agent.budget, deliverable: 'Complete task' }]).map(
                (m: any, i: number) => ({
                  index: i,
                  amount: m.amount,
                  deliverable: m.deliverable || `Milestone ${i + 1}`,
                })
              ),
            },
          },
          include: { milestones: true },
        });

        // Create SwarmStream link
        const swarmStream = await tx.swarmStream.create({
          data: {
            swarmId: swarm.id,
            streamJobId: streamJob.id,
            agentId: agent.agentId || null,
            role: agent.role || 'worker',
            allocatedBudget: agent.budget,
          },
        });

        swarmStreams.push({ ...swarmStream, streamJob });
      }

      return { swarm, swarmStreams };
    });

    // Log audit event (non-blocking)
    await logAuditEvent({
      swarmId: result.swarm.id,
      eventType: 'SWARM_CREATED',
      title: `Swarm "${name}" Created`,
      description: `${agents.length} agents, total budget $${totalBudget}`,
      metadata: { agentCount: agents.length, totalBudget },
      severity: 'SUCCESS',
    });

    // Notify client about swarm creation
    notify({
      wallet: clientWallet,
      type: 'swarm:created',
      title: 'Swarm Created',
      message: `"${name}" — ${agents.length} agents, $${totalBudget} budget`,
    }).catch(() => {});

    return apiSuccess({ swarm: result.swarm, streams: result.swarmStreams }, 201);
  } catch (error: any) {
    return logAndReturn('SWARM_STREAM', error, 'Failed to create swarm');
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet')?.trim().toLowerCase();
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (wallet) where.clientWallet = wallet;
    if (status) where.status = status;

    const [swarms, total] = await Promise.all([
      prisma.swarmSession.findMany({
        where,
        include: {
          streams: {
            include: {
              streamJob: {
                include: { milestones: { orderBy: { index: 'asc' } } },
              },
            },
          },
          _count: { select: { auditEvents: true, a2aTransfers: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.swarmSession.count({ where }),
    ]);

    return apiSuccess({ swarms, total });
  } catch (error: any) {
    return logAndReturn('SWARM_STREAM', error, 'Failed to list swarms');
  }
}
