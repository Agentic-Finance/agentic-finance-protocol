/**
 * POST /api/judge/auto
 *
 * Batch auto-judge: Evaluate all eligible jobs and return results.
 * Called by daemon every ~60 seconds or manually from UI.
 *
 * GET /api/judge/auto
 *
 * Returns auto-judge statistics.
 */

import { NextResponse } from 'next/server';
import { evaluateEligibleJobs, getJudgeStats } from '@/app/lib/auto-judge';
import { logAndReturn } from '@/app/lib/api-response';
import { requireDaemonAuth } from '@/app/lib/api-auth';

export async function POST(req: Request) {
  const auth = requireDaemonAuth(req);
  if (!auth.valid) return auth.response!;

  try {
    console.log('[AutoJudge] Batch evaluation triggered');
    const startTime = Date.now();
    const result = await evaluateEligibleJobs();
    const duration = Date.now() - startTime;

    console.log(`[AutoJudge] Batch complete in ${duration}ms: ${result.evaluated} evaluated, ${result.settled} settle, ${result.refunded} refund, ${result.escalated} escalate`);

    return NextResponse.json({
      success: true,
      ...result,
      duration,
    });
  } catch (error: any) {
    return logAndReturn('AutoJudge Batch', error, 'Batch evaluation failed');
  }
}

export async function GET() {
  try {
    const stats = await getJudgeStats();
    return NextResponse.json({ success: true, ...stats });
  } catch (error: any) {
    return logAndReturn('AutoJudge Stats', error, 'Failed to fetch judge stats');
  }
}
