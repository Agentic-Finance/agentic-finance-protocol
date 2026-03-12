/**
 * /api/a2a/orchestrate/execute — Execute Approved A2A Plan
 *
 * POST: Confirm and run a previously generated orchestration plan.
 *       Builds a dependency graph, executes steps in topological waves,
 *       and aggregates results.
 */

import prisma from '@/app/lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { requireWalletAuth } from '@/app/lib/api-auth';
import { writeLimiter, getClientId } from '@/app/lib/rate-limit';
import { notify } from '@/app/lib/notify';
import { executeJob } from '@/app/lib/execute-job';
import { aggregateResults } from '@/app/lib/result-aggregator';

const MAX_A2A_DEPTH = 5;

// ── Topological Sort Helper ──────────────────────────────────

interface PlanStep {
  stepIndex: number;
  agentId: string;
  prompt: string;
  budgetAllocation: number;
  dependsOn: number[];
}

function getExecutionWaves(steps: PlanStep[]): number[][] {
  const completed = new Set<number>();
  const waves: number[][] = [];
  const remaining = new Set(steps.map(s => s.stepIndex));

  while (remaining.size > 0) {
    const wave = [...remaining].filter(idx => {
      const step = steps.find(s => s.stepIndex === idx)!;
      return step.dependsOn.every(dep => completed.has(dep));
    });
    if (wave.length === 0) {
      throw new Error('Circular dependency detected in execution plan');
    }
    waves.push(wave);
    wave.forEach(idx => {
      completed.add(idx);
      remaining.delete(idx);
    });
  }
  return waves;
}

// ── Main Handler ─────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = requireWalletAuth(req);
  if (!auth.valid) return auth.response!;
  const rateCheck = writeLimiter.check(getClientId(req));
  if (!rateCheck.success) return apiError('Rate limit exceeded', 429);

  try {
    const body = await req.json();
    const { a2aChainId, orchestratorJobId } = body;

    if (!a2aChainId || !orchestratorJobId) {
      return apiError('Missing required fields: a2aChainId, orchestratorJobId', 400);
    }

    // ── Load and validate root job ──
    const rootJob = await prisma.agentJob.findUnique({
      where: { id: orchestratorJobId },
    });

    if (!rootJob) {
      return apiError('Orchestrator job not found', 404);
    }
    if (rootJob.a2aChainId !== a2aChainId) {
      return apiError('Chain ID mismatch', 400);
    }
    if (rootJob.status !== 'ORCHESTRATING') {
      return apiError(`Job is not in ORCHESTRATING state (current: ${rootJob.status})`, 409);
    }

    // ── Parse stored plan ──
    let plan: { steps: PlanStep[]; reasoning: string; totalBudget: number; platformFee: number };
    try {
      plan = JSON.parse(rootJob.result || '{}');
    } catch {
      return apiError('Failed to parse stored plan from root job', 500);
    }

    if (!plan.steps || plan.steps.length === 0) {
      return apiError('No steps found in stored plan', 422);
    }

    // ── Depth guard ──
    if ((rootJob.depth || 0) + 1 >= MAX_A2A_DEPTH) {
      return apiError(`Maximum A2A depth (${MAX_A2A_DEPTH}) exceeded`, 422);
    }

    // ── Budget guard ──
    const stepsTotal = plan.steps.reduce((sum, s) => sum + (s.budgetAllocation || 0), 0);
    const platformFee = plan.platformFee || 0;
    if (stepsTotal + platformFee > rootJob.budget) {
      return apiError(
        `Plan cost ($${stepsTotal} + $${platformFee} fee) exceeds budget ($${rootJob.budget})`,
        422,
      );
    }

    // ── Update root job status to EXECUTING ──
    await prisma.agentJob.update({
      where: { id: rootJob.id },
      data: { status: 'EXECUTING' },
    });

    // ── Build dependency graph and execute in waves ──
    const waves = getExecutionWaves(plan.steps);
    const stepResults: Record<number, { jobId: string; status: string; result: any }> = {};
    let hasFailure = false;

    for (const wave of waves) {
      // Create sub-jobs for each step in this wave (individually, so one failure doesn't kill the wave)
      const waveJobs: { stepIndex: number; jobId: string }[] = [];
      for (const stepIdx of wave) {
        const step = plan.steps.find(s => s.stepIndex === stepIdx)!;
        try {
          const subJob = await prisma.agentJob.create({
            data: {
              agentId: step.agentId,
              clientWallet: rootJob.clientWallet,
              prompt: step.prompt,
              budget: step.budgetAllocation,
              token: rootJob.token,
              status: 'MATCHED',
              parentJobId: rootJob.id,
              a2aChainId,
              depth: (rootJob.depth || 0) + 1,
              stepIndex: step.stepIndex,
              dependsOn: JSON.stringify(step.dependsOn),
            },
          });
          waveJobs.push({ stepIndex: stepIdx, jobId: subJob.id });
        } catch (createError: any) {
          console.error(`[A2A_EXECUTE] Failed to create sub-job for step ${stepIdx} (agent: ${step.agentId}):`, createError.message);
          stepResults[stepIdx] = {
            jobId: 'creation-failed',
            status: 'FAILED',
            result: { error: `Failed to create job: ${createError.message}` },
          };
          hasFailure = true;
        }
      }

      if (waveJobs.length === 0) continue; // All jobs in this wave failed to create

      // Execute all jobs in this wave in parallel
      const waveResults = await Promise.allSettled(
        waveJobs.map(async ({ stepIndex, jobId }) => {
          const result = await executeJob(jobId);
          return { stepIndex, jobId, result };
        }),
      );

      // Process wave results
      for (const outcome of waveResults) {
        if (outcome.status === 'fulfilled') {
          const { stepIndex, jobId, result } = outcome.value;
          const updatedJob = await prisma.agentJob.findUnique({
            where: { id: jobId },
            select: { status: true, result: true },
          });
          stepResults[stepIndex] = {
            jobId,
            status: updatedJob?.status || 'UNKNOWN',
            result: updatedJob?.result || null,
          };
          if (updatedJob?.status === 'FAILED') {
            hasFailure = true;
          }
        } else {
          // Promise rejected — mark as failed
          const matchingJob = waveJobs.find(j => j.stepIndex === (outcome as any).value?.stepIndex);
          const jobId = matchingJob?.jobId || 'unknown';
          const failedStepIdx = (outcome as any).value?.stepIndex ?? matchingJob?.stepIndex ?? -1;
          stepResults[failedStepIdx] = {
            jobId,
            status: 'FAILED',
            result: { error: outcome.reason?.message || 'Execution failed' },
          };
          hasFailure = true;
        }
      }
    }

    // ── Aggregate results ──
    const completedJobs = await prisma.agentJob.findMany({
      where: { a2aChainId, depth: { gt: 0 } },
      include: { agent: { select: { name: true, avatarEmoji: true } } },
    });
    const subResultsForAgg = completedJobs.map(j => ({
      stepIndex: j.stepIndex ?? 0,
      agentId: j.agentId,
      agentName: j.agent.name,
      agentEmoji: j.agent.avatarEmoji || '🤖',
      status: (j.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED') as 'COMPLETED' | 'FAILED',
      result: j.result ? JSON.parse(j.result) : null,
      executionTime: j.executionTime ?? 0,
      budgetSpent: j.negotiatedPrice ?? j.budget,
    }));
    const aggregated = await aggregateResults(rootJob.prompt, subResultsForAgg);

    // ── Update root job with final result ──
    const finalStatus = hasFailure ? 'FAILED' : 'COMPLETED';
    await prisma.agentJob.update({
      where: { id: rootJob.id },
      data: {
        status: finalStatus,
        result: JSON.stringify({
          aggregated,
          stepResults,
          completedAt: new Date().toISOString(),
        }),
        completedAt: new Date(),
      },
    });

    // ── Notify client ──
    notify({
      wallet: rootJob.clientWallet,
      type: hasFailure ? 'job:failed' : 'job:completed',
      title: hasFailure ? 'A2A Orchestration Partially Failed' : 'A2A Orchestration Complete',
      message: `Chain ${a2aChainId.slice(0, 8)}... finished with ${Object.keys(stepResults).length} steps (${finalStatus})`,
    }).catch(() => {});

    // ── Build response ──
    const subTasks = await prisma.agentJob.findMany({
      where: { a2aChainId, depth: { gt: 0 } },
      include: { agent: { select: { name: true, avatarEmoji: true, category: true } } },
      orderBy: [{ stepIndex: 'asc' }],
    });

    return apiSuccess({
      a2aChainId,
      status: finalStatus,
      subTasks: subTasks.map(t => ({
        id: t.id,
        stepIndex: t.stepIndex,
        agentId: t.agentId,
        agentName: t.agent.name,
        agentEmoji: t.agent.avatarEmoji,
        prompt: t.prompt,
        budget: t.budget,
        status: t.status,
        result: t.result,
        dependsOn: t.dependsOn ? JSON.parse(t.dependsOn) : [],
      })),
      aggregated,
    });
  } catch (error: any) {
    return logAndReturn('A2A_EXECUTE', error, 'Failed to execute orchestration plan');
  }
}
