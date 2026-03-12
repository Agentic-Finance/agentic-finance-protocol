/**
 * /api/a2a/orchestrate/cancel — Cancel A2A Orchestration
 *
 * POST: Sets root job status to CANCELLING. The async execution loop
 *       checks this flag before each wave and stops gracefully.
 */

import prisma from '@/app/lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { requireWalletAuth } from '@/app/lib/api-auth';

export async function POST(req: Request) {
  const auth = requireWalletAuth(req);
  if (!auth.valid) return auth.response!;

  try {
    const { a2aChainId } = await req.json();

    if (!a2aChainId) {
      return apiError('Missing a2aChainId', 400);
    }

    // Find the root job for this chain
    const rootJob = await prisma.agentJob.findFirst({
      where: { a2aChainId, depth: 0 },
    });

    if (!rootJob) {
      return apiError('Chain not found', 404);
    }

    if (rootJob.status !== 'EXECUTING') {
      return apiError(`Cannot cancel chain in status: ${rootJob.status}`, 409);
    }

    // Set CANCELLING flag — the async wave loop will pick this up
    await prisma.agentJob.update({
      where: { id: rootJob.id },
      data: { status: 'CANCELLING' },
    });

    console.log(`[A2A_CANCEL] Chain ${a2aChainId.slice(0, 8)} set to CANCELLING`);

    return apiSuccess({
      a2aChainId,
      status: 'CANCELLING',
      message: 'Cancellation requested. In-flight steps will complete, remaining steps will be skipped.',
    });
  } catch (error: any) {
    return logAndReturn('A2A_CANCEL', error, 'Failed to cancel orchestration');
  }
}
