/**
 * /api/a2a/orchestrate/update — Update A2A Plan Before Execution
 *
 * PATCH: Persist user edits to the orchestration plan (step removal,
 *        budget reallocation, agent swaps, prompt edits) before
 *        confirming execution.
 */

import prisma from '@/app/lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { requireWalletAuth } from '@/app/lib/api-auth';

export async function PATCH(req: Request) {
  const auth = requireWalletAuth(req);
  if (!auth.valid) return auth.response!;

  try {
    const { orchestratorJobId, steps } = await req.json();

    if (!orchestratorJobId) {
      return apiError('Missing orchestratorJobId', 400);
    }
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return apiError('Steps array is required and must not be empty', 400);
    }

    // Load root job
    const rootJob = await prisma.agentJob.findUnique({
      where: { id: orchestratorJobId },
    });

    if (!rootJob) {
      return apiError('Orchestrator job not found', 404);
    }

    if (rootJob.status !== 'ORCHESTRATING') {
      return apiError(`Cannot update plan in status: ${rootJob.status}. Plan can only be edited before execution.`, 409);
    }

    // Parse existing plan to preserve reasoning and metadata
    let existingPlan: any = {};
    try {
      existingPlan = JSON.parse(rootJob.result || '{}');
    } catch {
      existingPlan = {};
    }

    // Update the stored plan with user edits
    const updatedPlan = {
      ...existingPlan,
      steps,
    };

    await prisma.agentJob.update({
      where: { id: orchestratorJobId },
      data: {
        result: JSON.stringify(updatedPlan),
      },
    });

    console.log(`[A2A_UPDATE] Plan updated for job ${orchestratorJobId.slice(0, 8)} (${steps.length} steps)`);

    return apiSuccess({
      orchestratorJobId,
      stepsCount: steps.length,
      message: 'Plan updated successfully.',
    });
  } catch (error: any) {
    return logAndReturn('A2A_UPDATE', error, 'Failed to update orchestration plan');
  }
}
