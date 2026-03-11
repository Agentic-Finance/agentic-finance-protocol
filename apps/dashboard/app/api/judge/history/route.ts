/**
 * GET /api/judge/history
 *
 * Returns verdict history with filtering and pagination.
 *
 * Query params:
 *   - verdict: SETTLE | REFUND | ESCALATE (filter by verdict)
 *   - layer: 1 | 2 | 3 (filter by layer)
 *   - limit: number (default 20)
 *   - offset: number (default 0)
 *
 * PUT /api/judge/history
 *
 * Override a verdict (human arbitrator action).
 * Body: { verdictId: string, newVerdict: 'SETTLE' | 'REFUND', overrideWallet: string }
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { notify } from '@/app/lib/notify';
import { apiError, logAndReturn } from '@/app/lib/api-response';
import { requireWalletAuth } from '@/app/lib/api-auth';
import { writeLimiter, getClientId } from '@/app/lib/rate-limit';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const verdict = searchParams.get('verdict');
    const layer = searchParams.get('layer');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (verdict) where.verdict = verdict;
    if (layer) where.layer = parseInt(layer);

    const [verdicts, total] = await Promise.all([
      prisma.judgeVerdict.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              prompt: true,
              budget: true,
              token: true,
              status: true,
              clientWallet: true,
              executionTime: true,
              disputeReason: true,
              proofMatched: true,
              agent: {
                select: {
                  name: true,
                  avatarEmoji: true,
                  ownerWallet: true,
                  successRate: true,
                  isVerified: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.judgeVerdict.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      verdicts: verdicts.map(v => ({
        ...v,
        reasoning: JSON.parse(v.reasoning),
        rulesFired: v.rulesFired ? JSON.parse(v.rulesFired) : [],
        scores: v.scores ? JSON.parse(v.scores) : null,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    return logAndReturn('Judge History', error, 'Failed to fetch verdict history');
  }
}

export async function PUT(req: Request) {
  const auth = requireWalletAuth(req);
  if (!auth.valid) return auth.response!;
  const rateCheck = writeLimiter.check(getClientId(req));
  if (!rateCheck.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const { verdictId, newVerdict, overrideWallet } = await req.json();

    if (!verdictId || !newVerdict || !overrideWallet) {
      return apiError('Missing verdictId, newVerdict, or overrideWallet', 400);
    }

    if (!['SETTLE', 'REFUND'].includes(newVerdict)) {
      return apiError('newVerdict must be SETTLE or REFUND', 400);
    }

    // Enforce that the overrideWallet matches the authenticated wallet
    if (overrideWallet.toLowerCase() !== auth.wallet) {
      return apiError('overrideWallet does not match authenticated wallet', 403);
    }

    const existing = await prisma.judgeVerdict.findUnique({
      where: { id: verdictId },
      include: {
        job: {
          select: { id: true, clientWallet: true, agent: { select: { name: true, ownerWallet: true } } },
        },
      },
    });

    if (!existing) return apiError('Verdict not found', 404);

    // Update verdict with override info
    const updated = await prisma.judgeVerdict.update({
      where: { id: verdictId },
      data: {
        overrideVerdict: existing.verdict, // Store original
        verdict: newVerdict,
        overriddenBy: overrideWallet,
        confidence: 1.0, // Human override = 100% confidence
        layer: 3,
        reasoning: JSON.stringify([
          ...JSON.parse(existing.reasoning),
          `Human override by ${overrideWallet.slice(0, 8)}...: ${existing.verdict} → ${newVerdict}`,
        ]),
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        agentName: existing.job?.agent?.name,
        eventType: 'JUDGE_OVERRIDE',
        title: `Verdict Override: ${existing.verdict} → ${newVerdict}`,
        description: `Human arbitrator ${overrideWallet.slice(0, 8)}... overrode auto-judge verdict`,
        metadata: {
          verdictId,
          jobId: existing.jobId,
          originalVerdict: existing.verdict,
          newVerdict,
          overrideWallet,
        } as any,
        severity: 'WARNING',
      },
    });

    // Notify client
    if (existing.job?.clientWallet) {
      notify({
        wallet: existing.job.clientWallet,
        type: 'judge:override' as any,
        title: 'Verdict Updated',
        message: `Arbitrator changed verdict from ${existing.verdict} to ${newVerdict}`,
        streamJobId: existing.jobId,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      verdict: {
        ...updated,
        reasoning: JSON.parse(updated.reasoning),
        rulesFired: updated.rulesFired ? JSON.parse(updated.rulesFired) : [],
      },
    });
  } catch (error: any) {
    return logAndReturn('Judge Override', error, 'Failed to override verdict');
  }
}
