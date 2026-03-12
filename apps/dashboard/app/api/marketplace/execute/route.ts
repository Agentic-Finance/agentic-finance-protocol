/**
 * /api/marketplace/execute — Execute an Agent Job
 *
 * Delegates to the shared executeJob() utility which handles:
 * - Agent dispatch (native, webhook, or demo)
 * - AIProof commit/verify on-chain
 * - Stats update, notifications, chat updates
 * - Safety: jobs never stay stuck in EXECUTING
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { apiError, logAndReturn } from '@/app/lib/api-response';
import { validateApiKey, getClientId } from '@/app/lib/api-auth';
import { writeLimiter } from '@/app/lib/rate-limit';
import { executeJob } from '@/app/lib/execute-job';

export async function POST(req: Request) {
    try {
        // Rate limit
        const clientId = getClientId(req);
        const limit = writeLimiter.check(clientId);
        if (!limit.success) {
            return apiError('Rate limit exceeded. Try again later.', 429);
        }

        // Auth check (optional — validates if API key provided, allows browser calls without key)
        const auth = await validateApiKey(req);
        if (!auth.valid && auth.response) return auth.response;

        const { jobId } = await req.json();

        if (!jobId) {
            return apiError('Missing jobId', 400);
        }

        // Validate job exists and is in correct state
        const job = await prisma.agentJob.findUnique({
            where: { id: jobId },
            select: { id: true, status: true },
        });

        if (!job) return apiError('Job not found', 404);
        if (job.status !== 'ESCROW_LOCKED' && job.status !== 'MATCHED') {
            return apiError(`Cannot execute job in status: ${job.status}`, 400);
        }

        // Delegate to shared execution utility
        // Handles: status transitions, AIProof commit/verify, agent dispatch,
        // stats update, notifications, and chat channel updates
        const result = await executeJob(jobId);

        return NextResponse.json({
            success: result.success,
            status: result.status,
            result: result.result,
            executionTime: result.executionTime,
            aiProof: result.aiProof || null,
        });

    } catch (error: any) {
        return logAndReturn('Marketplace Execute', error, 'Execution failed');
    }
}
