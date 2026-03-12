/**
 * /api/a2a/orchestrate/execute — Execute Approved A2A Plan
 *
 * POST: Confirm and run a previously generated orchestration plan.
 *       Returns 202 Accepted immediately, then executes asynchronously.
 *       Emits real-time SSE events for each step transition.
 *
 * Super-Level Features:
 *   - Async fire-and-forget (non-blocking 202 response)
 *   - Real-time SSE progress events per step
 *   - Smart retry with agent fallback (2 retries per step)
 *   - Dynamic budget reallocation (surplus redistribution)
 *   - Graceful cancellation (check before each wave)
 *   - Per-step AIProof verification
 */

import prisma from '@/app/lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { requireWalletAuth } from '@/app/lib/api-auth';
import { writeLimiter, getClientId } from '@/app/lib/rate-limit';
import { notify, notifyA2A } from '@/app/lib/notify';
import { executeJob } from '@/app/lib/execute-job';
import { aggregateResults } from '@/app/lib/result-aggregator';
import { findFallbackAgent } from '@/app/lib/task-decomposer';
import { ethers } from 'ethers';

const MAX_A2A_DEPTH = 5;
const MAX_RETRIES_PER_STEP = 2;

// ── Topological Sort Helper ──────────────────────────────────

interface PlanStep {
  stepIndex: number;
  agentId: string;
  agentName?: string;
  agentEmoji?: string;
  prompt: string;
  budgetAllocation: number;
  dependsOn: number[];
  category?: string;
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

// ── Smart Retry with Agent Fallback ──────────────────────────

async function executeWithRetry(
  jobId: string,
  step: PlanStep,
  rootJob: { id: string; clientWallet: string; token: string; depth: number; a2aChainId: string },
  a2aChainId: string,
): Promise<{ success: boolean; jobId: string; retryCount: number }> {
  // Attempt 1: Execute original job
  const result = await executeJob(jobId);

  if (result.success) {
    return { success: true, jobId, retryCount: 0 };
  }

  // Attempt 2: Retry same agent after 3s delay (transient errors)
  console.log(`[A2A_RETRY] Step ${step.stepIndex} failed. Retry 1/2 (same agent)...`);
  notifyA2A({
    a2aChainId,
    type: 'a2a:step_retry',
    stepIndex: step.stepIndex,
    jobId,
    agentName: step.agentName,
    agentEmoji: step.agentEmoji,
    message: `Retrying step ${step.stepIndex} (attempt 2/3)...`,
  }).catch(() => {});

  await new Promise(r => setTimeout(r, 3000));

  // Create a new sub-job for retry
  try {
    const retryJob = await prisma.agentJob.create({
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
        retryCount: 1,
        originalAgentId: step.agentId,
      },
    });

    const retryResult = await executeJob(retryJob.id);
    if (retryResult.success) {
      return { success: true, jobId: retryJob.id, retryCount: 1 };
    }
  } catch (e: any) {
    console.error(`[A2A_RETRY] Retry 1 creation failed:`, e.message);
  }

  // Attempt 3: Fallback to different agent in same category
  try {
    const fallback = await findFallbackAgent(step.agentId, step.category || '', step.prompt);
    if (fallback) {
      console.log(`[A2A_RETRY] Step ${step.stepIndex}: falling back to ${fallback.agentName}`);
      notifyA2A({
        a2aChainId,
        type: 'a2a:step_fallback',
        stepIndex: step.stepIndex,
        agentName: fallback.agentName,
        agentEmoji: fallback.agentEmoji,
        message: `Switched to ${fallback.agentName} for step ${step.stepIndex}`,
      }).catch(() => {});

      const fallbackJob = await prisma.agentJob.create({
        data: {
          agentId: fallback.agentId,
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
          retryCount: 2,
          originalAgentId: step.agentId,
        },
      });

      const fallbackResult = await executeJob(fallbackJob.id);
      if (fallbackResult.success) {
        return { success: true, jobId: fallbackJob.id, retryCount: 2 };
      }
    }
  } catch (e: any) {
    console.error(`[A2A_RETRY] Fallback agent failed:`, e.message);
  }

  return { success: false, jobId, retryCount: MAX_RETRIES_PER_STEP };
}

// ── Async Orchestration Runner ───────────────────────────────

async function runOrchestrationAsync(
  a2aChainId: string,
  rootJob: any,
  plan: { steps: PlanStep[]; reasoning: string; totalBudget: number; platformFee: number },
) {
  const stepResults: Record<number, { jobId: string; status: string; result: any; executionTime?: number }> = {};
  let hasFailure = false;

  // Budget ledger for dynamic reallocation
  const budgetLedger: Record<number, { allocated: number; spent: number; status: string }> = {};
  for (const step of plan.steps) {
    budgetLedger[step.stepIndex] = { allocated: step.budgetAllocation, spent: 0, status: 'PENDING' };
  }

  try {
    const waves = getExecutionWaves(plan.steps);

    for (let waveIdx = 0; waveIdx < waves.length; waveIdx++) {
      const wave = waves[waveIdx];

      // ── Cancellation check: stop if root job status is CANCELLING ──
      const rootRefresh = await prisma.agentJob.findUnique({
        where: { id: rootJob.id },
        select: { status: true },
      });
      if (rootRefresh?.status === 'CANCELLING') {
        console.log(`[A2A_EXECUTE] Chain ${a2aChainId.slice(0, 8)} cancelled before wave ${waveIdx}`);

        // Mark remaining un-started steps as CANCELLED
        for (const remainingWave of waves.slice(waveIdx)) {
          for (const stepIdx of remainingWave) {
            stepResults[stepIdx] = { jobId: 'cancelled', status: 'CANCELLED', result: null };
            budgetLedger[stepIdx].status = 'CANCELLED';
          }
        }
        break;
      }

      // ── SSE: Wave started ──
      notifyA2A({
        a2aChainId,
        type: 'a2a:wave_started',
        waveIndex: waveIdx,
        message: `Executing wave ${waveIdx + 1}/${waves.length} (${wave.length} step${wave.length > 1 ? 's' : ''})`,
      }).catch(() => {});

      // Create sub-jobs for each step in this wave
      const waveJobs: { stepIndex: number; jobId: string; step: PlanStep }[] = [];
      for (const stepIdx of wave) {
        const step = plan.steps.find(s => s.stepIndex === stepIdx)!;

        // Use reallocated budget if available
        const currentBudget = budgetLedger[stepIdx]?.allocated ?? step.budgetAllocation;

        try {
          const subJob = await prisma.agentJob.create({
            data: {
              agentId: step.agentId,
              clientWallet: rootJob.clientWallet,
              prompt: step.prompt,
              budget: currentBudget,
              token: rootJob.token,
              status: 'MATCHED',
              parentJobId: rootJob.id,
              a2aChainId,
              depth: (rootJob.depth || 0) + 1,
              stepIndex: step.stepIndex,
              dependsOn: JSON.stringify(step.dependsOn),
            },
          });
          waveJobs.push({ stepIndex: stepIdx, jobId: subJob.id, step: { ...step, budgetAllocation: currentBudget } });

          // ── SSE: Step started ──
          notifyA2A({
            a2aChainId,
            type: 'a2a:step_started',
            stepIndex: stepIdx,
            jobId: subJob.id,
            agentName: step.agentName,
            agentEmoji: step.agentEmoji,
            budget: { allocated: currentBudget },
          }).catch(() => {});
        } catch (createError: any) {
          console.error(`[A2A_EXECUTE] Failed to create sub-job for step ${stepIdx}:`, createError.message);
          stepResults[stepIdx] = {
            jobId: 'creation-failed',
            status: 'FAILED',
            result: { error: `Failed to create job: ${createError.message}` },
          };
          budgetLedger[stepIdx].status = 'FAILED';
          hasFailure = true;

          notifyA2A({
            a2aChainId,
            type: 'a2a:step_failed',
            stepIndex: stepIdx,
            agentName: step.agentName,
            agentEmoji: step.agentEmoji,
            message: `Failed to create job: ${createError.message}`,
          }).catch(() => {});
        }
      }

      if (waveJobs.length === 0) continue;

      // Execute all jobs in this wave in parallel (with retry)
      const waveResults = await Promise.allSettled(
        waveJobs.map(async ({ stepIndex, jobId, step }) => {
          const retryResult = await executeWithRetry(jobId, step, {
            id: rootJob.id,
            clientWallet: rootJob.clientWallet,
            token: rootJob.token,
            depth: rootJob.depth || 0,
            a2aChainId,
          }, a2aChainId);
          return { stepIndex, ...retryResult };
        }),
      );

      // Process wave results
      for (let i = 0; i < waveResults.length; i++) {
        const outcome = waveResults[i];
        const waveJob = waveJobs[i];
        const stepIndex = waveJob.stepIndex;

        if (outcome.status === 'fulfilled') {
          const finalJobId = outcome.value.jobId;
          const updatedJob = await prisma.agentJob.findUnique({
            where: { id: finalJobId },
            select: { status: true, result: true, executionTime: true, budget: true, negotiatedPrice: true },
          });

          stepResults[stepIndex] = {
            jobId: finalJobId,
            status: updatedJob?.status || 'UNKNOWN',
            result: updatedJob?.result || null,
            executionTime: updatedJob?.executionTime || undefined,
          };

          const spent = updatedJob?.negotiatedPrice ?? updatedJob?.budget ?? 0;
          budgetLedger[stepIndex].spent = spent;
          budgetLedger[stepIndex].status = updatedJob?.status || 'FAILED';

          if (updatedJob?.status === 'COMPLETED') {
            // ── SSE: Step completed ──
            notifyA2A({
              a2aChainId,
              type: 'a2a:step_completed',
              stepIndex,
              jobId: finalJobId,
              agentName: waveJob.step.agentName,
              agentEmoji: waveJob.step.agentEmoji,
              status: 'COMPLETED',
              executionTime: updatedJob.executionTime || 0,
              budget: { allocated: budgetLedger[stepIndex].allocated, spent },
            }).catch(() => {});
          } else {
            hasFailure = true;
            notifyA2A({
              a2aChainId,
              type: 'a2a:step_failed',
              stepIndex,
              jobId: finalJobId,
              agentName: waveJob.step.agentName,
              agentEmoji: waveJob.step.agentEmoji,
              status: updatedJob?.status || 'FAILED',
              message: `Step ${stepIndex} failed after ${outcome.value.retryCount} retries`,
            }).catch(() => {});
          }
        } else {
          // Promise rejected
          console.error(`[A2A_EXECUTE] Step ${stepIndex} promise rejected:`, outcome.reason?.message);
          const updatedJob = await prisma.agentJob.findUnique({
            where: { id: waveJob.jobId },
            select: { status: true, result: true },
          });
          stepResults[stepIndex] = {
            jobId: waveJob.jobId,
            status: updatedJob?.status || 'FAILED',
            result: updatedJob?.result || JSON.stringify({ error: outcome.reason?.message || 'Execution failed' }),
          };
          budgetLedger[stepIndex].status = 'FAILED';
          hasFailure = true;

          notifyA2A({
            a2aChainId,
            type: 'a2a:step_failed',
            stepIndex,
            jobId: waveJob.jobId,
            agentName: waveJob.step.agentName,
            agentEmoji: waveJob.step.agentEmoji,
            status: 'FAILED',
          }).catch(() => {});
        }
      }

      // ── Dynamic Budget Reallocation ──
      // After each wave, redistribute surplus from completed/failed steps to pending ones
      const pendingSteps = plan.steps.filter(s =>
        !stepResults[s.stepIndex] || stepResults[s.stepIndex]?.status === 'PENDING'
      );

      if (pendingSteps.length > 0) {
        let surplus = 0;
        for (const [idx, entry] of Object.entries(budgetLedger)) {
          if (entry.status === 'COMPLETED' || entry.status === 'FAILED') {
            surplus += Math.max(0, entry.allocated - entry.spent);
          }
        }

        if (surplus > 0.01) {
          const perStep = Math.round((surplus / pendingSteps.length) * 100) / 100;
          const reallocation: { stepIndex: number; oldBudget: number; newBudget: number }[] = [];

          for (const ps of pendingSteps) {
            const old = budgetLedger[ps.stepIndex].allocated;
            budgetLedger[ps.stepIndex].allocated = Math.round((old + perStep) * 100) / 100;
            reallocation.push({
              stepIndex: ps.stepIndex,
              oldBudget: old,
              newBudget: budgetLedger[ps.stepIndex].allocated,
            });
          }

          notifyA2A({
            a2aChainId,
            type: 'a2a:budget_rebalanced',
            budget: { surplus },
            reallocation,
            message: `Budget rebalanced: +$${perStep.toFixed(2)} to each remaining step`,
          }).catch(() => {});

          console.log(`[A2A_EXECUTE] Budget reallocation: $${surplus.toFixed(2)} surplus → +$${perStep.toFixed(2)}/step to ${pendingSteps.length} pending steps`);
        }
      }
    }

    // ── Safety sweep: force any stuck EXECUTING sub-jobs to FAILED ──
    const stuckJobs = await prisma.agentJob.findMany({
      where: { a2aChainId, depth: { gt: 0 }, status: 'EXECUTING' },
    });
    if (stuckJobs.length > 0) {
      console.error(`[A2A_EXECUTE] Found ${stuckJobs.length} stuck EXECUTING jobs — forcing to FAILED`);
      for (const sj of stuckJobs) {
        await prisma.agentJob.update({
          where: { id: sj.id },
          data: { status: 'FAILED', result: JSON.stringify({ error: 'Execution timed out or crashed' }), completedAt: new Date() },
        }).catch(() => {});
      }
      hasFailure = true;
    }

    // ── Check if we were cancelled ──
    const rootCheck = await prisma.agentJob.findUnique({
      where: { id: rootJob.id },
      select: { status: true },
    });
    const wasCancelled = rootCheck?.status === 'CANCELLING';

    // ── Aggregate results ──
    const completedJobs = await prisma.agentJob.findMany({
      where: { a2aChainId, depth: { gt: 0 } },
      include: { agent: { select: { name: true, avatarEmoji: true } } },
    });
    const subResultsForAgg = completedJobs.map(j => ({
      stepIndex: j.stepIndex ?? 0,
      agentId: j.agentId,
      agentName: j.agent.name,
      agentEmoji: j.agent.avatarEmoji || '\uD83E\uDD16',
      status: (j.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED') as 'COMPLETED' | 'FAILED',
      result: j.result ? JSON.parse(j.result) : null,
      executionTime: j.executionTime ?? 0,
      budgetSpent: j.negotiatedPrice ?? j.budget,
    }));
    const aggregated = await aggregateResults(rootJob.prompt, subResultsForAgg);

    // ── Per-Step AIProof: Aggregate chain proof ──
    let chainProofHash: string | null = null;
    try {
      const proofInputs = completedJobs
        .filter(j => j.status === 'COMPLETED' && j.resultHash)
        .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0))
        .map(j => j.resultHash!);

      if (proofInputs.length > 0) {
        chainProofHash = ethers.keccak256(ethers.toUtf8Bytes(proofInputs.join(',')));
      }
    } catch { /* non-critical */ }

    // ── Determine final status ──
    let finalStatus: string;
    if (wasCancelled) {
      finalStatus = 'CANCELLED';
    } else if (hasFailure) {
      finalStatus = 'FAILED';
    } else {
      finalStatus = 'COMPLETED';
    }

    // ── Update root job with final result ──
    const completedCount = Object.values(stepResults).filter(r => r.status === 'COMPLETED').length;
    const failedCount = Object.values(stepResults).filter(r => r.status === 'FAILED').length;
    const cancelledCount = Object.values(stepResults).filter(r => r.status === 'CANCELLED').length;
    const totalSpent = Object.values(budgetLedger)
      .filter(e => e.status === 'COMPLETED' || e.status === 'FAILED')
      .reduce((sum, e) => sum + e.spent, 0);

    await prisma.agentJob.update({
      where: { id: rootJob.id },
      data: {
        status: finalStatus,
        resultHash: chainProofHash,
        result: JSON.stringify({
          aggregated,
          stepResults,
          budgetSummary: {
            total: plan.totalBudget,
            spent: totalSpent,
            refunded: Math.max(0, plan.totalBudget - totalSpent - (plan.platformFee || 0)),
          },
          completedAt: new Date().toISOString(),
        }),
        completedAt: new Date(),
      },
    });

    // ── SSE: Chain completed ──
    notifyA2A({
      a2aChainId,
      type: wasCancelled ? 'a2a:chain_cancelled' : 'a2a:chain_completed',
      status: finalStatus,
      message: wasCancelled
        ? `Chain cancelled. ${completedCount} completed, ${cancelledCount} cancelled.`
        : `Chain ${finalStatus.toLowerCase()}. ${completedCount}/${plan.steps.length} steps completed.`,
      budget: { spent: totalSpent },
    }).catch(() => {});

    // ── Notify client (persistent notification) ──
    notify({
      wallet: rootJob.clientWallet,
      type: finalStatus === 'COMPLETED' ? 'job:completed' : 'job:failed',
      title: wasCancelled
        ? 'A2A Orchestration Cancelled'
        : hasFailure ? 'A2A Orchestration Partially Failed' : 'A2A Orchestration Complete',
      message: `Chain ${a2aChainId.slice(0, 8)}... finished with ${completedCount}/${plan.steps.length} steps (${finalStatus}). Budget spent: $${totalSpent.toFixed(2)}`,
    }).catch(() => {});

    console.log(`[A2A_EXECUTE] Chain ${a2aChainId.slice(0, 8)} → ${finalStatus} (${completedCount}/${plan.steps.length} completed, $${totalSpent.toFixed(2)} spent)`);

  } catch (error: any) {
    console.error(`[A2A_EXECUTE] FATAL: Chain ${a2aChainId.slice(0, 8)} crashed:`, error.message, error.stack);

    // Force root job to FAILED
    await prisma.agentJob.update({
      where: { id: rootJob.id },
      data: {
        status: 'FAILED',
        result: JSON.stringify({ error: `Orchestration crashed: ${error.message}` }),
        completedAt: new Date(),
      },
    }).catch(() => {});

    notifyA2A({
      a2aChainId,
      type: 'a2a:chain_completed',
      status: 'FAILED',
      message: `Orchestration crashed: ${error.message}`,
    }).catch(() => {});
  }
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

    console.log(`[A2A_EXECUTE] Starting chain ${a2aChainId.slice(0, 8)} with ${plan.steps.length} steps (async)`);

    // ── Fire-and-forget: run orchestration asynchronously ──
    // Do NOT await — return 202 immediately while execution proceeds in background
    runOrchestrationAsync(a2aChainId, rootJob, plan).catch(err => {
      console.error(`[A2A_EXECUTE] Unhandled async error:`, err);
    });

    // ── Return 202 Accepted immediately ──
    return apiSuccess({
      a2aChainId,
      orchestratorJobId: rootJob.id,
      status: 'EXECUTING',
      totalSteps: plan.steps.length,
      message: 'Orchestration started. Listen for SSE events or poll /api/a2a/chain/{chainId} for progress.',
    }, 202);

  } catch (error: any) {
    return logAndReturn('A2A_EXECUTE', error, 'Failed to start orchestration');
  }
}
