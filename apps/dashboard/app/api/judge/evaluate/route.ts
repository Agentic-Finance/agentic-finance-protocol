/**
 * POST /api/judge/evaluate
 *
 * Evaluate a single job and return the auto-judge verdict.
 * Optionally execute the verdict on-chain.
 *
 * Body: { jobId: string, execute?: boolean }
 * Response: { success: true, verdict: JudgeResult, verdictId: string }
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { evaluateJob, type JudgeResult } from '@/app/lib/auto-judge';
import { notify } from '@/app/lib/notify';
import { apiError, logAndReturn } from '@/app/lib/api-response';

export async function POST(req: Request) {
  try {
    const { jobId, execute } = await req.json();

    if (!jobId) {
      return apiError('Missing jobId', 400);
    }

    // Check if job exists
    const job = await prisma.agentJob.findUnique({
      where: { id: jobId },
      include: { agent: true },
    });

    if (!job) return apiError('Job not found', 404);

    // Evaluate
    const verdict: JudgeResult = await evaluateJob(jobId);

    // Store verdict
    const stored = await prisma.judgeVerdict.create({
      data: {
        jobId,
        verdict: verdict.verdict,
        confidence: verdict.confidence,
        reasoning: JSON.stringify(verdict.reasoning),
        layer: verdict.layer,
        rulesFired: JSON.stringify(verdict.rulesFired),
        scores: verdict.scores ? JSON.stringify(verdict.scores) : null,
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        agentId: job.agentId,
        agentName: job.agent?.name,
        eventType: 'JUDGE_VERDICT',
        title: `Auto-Judge: ${verdict.verdict}`,
        description: `Layer ${verdict.layer} verdict with ${Math.round(verdict.confidence * 100)}% confidence for job "${job.prompt?.slice(0, 50)}"`,
        metadata: {
          jobId,
          verdict: verdict.verdict,
          confidence: verdict.confidence,
          layer: verdict.layer,
          rulesFired: verdict.rulesFired,
          manual: true,
        } as any,
        severity: verdict.verdict === 'ESCALATE' ? 'WARNING' : 'INFO',
      },
    });

    // Notify client
    notify({
      wallet: job.clientWallet,
      type: 'judge:verdict' as any,
      title: `Auto-Judge Verdict: ${verdict.verdict}`,
      message: `${verdict.reasoning[0]} (${Math.round(verdict.confidence * 100)}% confidence)`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      verdict: {
        ...verdict,
        id: stored.id,
      },
      verdictId: stored.id,
    });

  } catch (error: any) {
    return logAndReturn('Judge Evaluate', error, 'Failed to evaluate job');
  }
}
