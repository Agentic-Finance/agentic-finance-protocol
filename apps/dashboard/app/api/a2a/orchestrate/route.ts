/**
 * /api/a2a/orchestrate — A2A Plan Generation
 *
 * POST: Decompose a task into a multi-agent execution plan for client review
 */

import crypto from 'crypto';
import prisma from '@/app/lib/prisma';
import { apiSuccess, apiError, logAndReturn, isValidAddress } from '@/app/lib/api-response';
import { writeLimiter, getClientId } from '@/app/lib/rate-limit';
import { decomposeTask } from '@/app/lib/task-decomposer';

export async function POST(req: Request) {
  // Plan generation is a read/compute operation — wallet auth optional
  // (Wallet only strictly required at execution phase)
  const rateCheck = writeLimiter.check(getClientId(req));
  if (!rateCheck.success) return apiError('Rate limit exceeded', 429);

  try {
    const body = await req.json();
    const { prompt, budget, clientWallet, token, preferences } = body;

    // ── Validate inputs ──
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return apiError('Prompt must be at least 10 characters', 400);
    }
    if (typeof budget !== 'number' || budget <= 0) {
      return apiError('Budget must be a positive number', 400);
    }
    // clientWallet is optional for planning — validated if provided
    const wallet = (clientWallet && isValidAddress(clientWallet))
      ? clientWallet.toLowerCase()
      : '0x0000000000000000000000000000000000000000';

    // ── Generate unique chain ID ──
    const a2aChainId = crypto.randomUUID();

    // ── Decompose task into execution plan ──
    const plan = await decomposeTask(prompt, budget, preferences);

    if (!plan || !plan.steps || plan.steps.length === 0) {
      return apiError('Task decomposition returned no steps', 422);
    }

    // ── Calculate platform fee and validate budget ──
    const platformFee = plan.platformFee ?? 0;
    const totalBudget = plan.totalBudget ?? budget;
    const stepsTotal = plan.steps.reduce(
      (sum: number, s: any) => sum + (s.budgetAllocation || 0),
      0,
    );

    if (stepsTotal + platformFee > budget) {
      return apiError(
        `Plan cost ($${stepsTotal} + $${platformFee} fee) exceeds budget ($${budget})`,
        422,
      );
    }

    // ── Create root orchestration job ──
    // Use the first step's agentId as the root job agent (highest relevance)
    const rootAgentId = plan.steps[0].agentId;

    const rootJob = await prisma.agentJob.create({
      data: {
        agentId: rootAgentId,
        clientWallet: wallet,
        prompt: prompt.trim(),
        budget: totalBudget,
        platformFee,
        token: token || 'AlphaUSD',
        status: 'ORCHESTRATING',
        a2aChainId,
        depth: 0,
        // Store the plan in result for the execute endpoint to retrieve
        result: JSON.stringify({
          steps: plan.steps,
          reasoning: plan.reasoning,
          totalBudget,
          platformFee,
          preferences: preferences || {},
        }),
      },
    });

    return apiSuccess({
      a2aChainId,
      orchestratorJobId: rootJob.id,
      plan: {
        steps: plan.steps,
        reasoning: plan.reasoning,
        totalBudget,
        platformFee,
      },
    });
  } catch (error: any) {
    return logAndReturn('A2A_ORCHESTRATE', error, 'Failed to generate orchestration plan');
  }
}
