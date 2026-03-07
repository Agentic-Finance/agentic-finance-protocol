/**
 * GET /api/marketplace/earnings
 *
 * Returns real total earnings computed from completed AgentJob records.
 * Sums negotiatedPrice for all COMPLETED and SETTLED jobs.
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const result = await prisma.agentJob.aggregate({
      where: {
        status: { in: ['COMPLETED', 'SETTLED'] },
        negotiatedPrice: { not: null },
      },
      _sum: { negotiatedPrice: true },
      _count: true,
    });

    const totalEarnings = result._sum.negotiatedPrice ?? 0;
    const completedJobs = result._count;

    // Also get total budget from all jobs (for comparison)
    const allJobs = await prisma.agentJob.aggregate({
      _sum: { budget: true },
      _count: true,
    });

    return NextResponse.json({
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      completedJobs,
      totalJobs: allJobs._count,
      totalBudget: Math.round((allJobs._sum.budget ?? 0) * 100) / 100,
    });
  } catch (error: any) {
    console.error('[api/marketplace/earnings] Error:', error.message);
    return NextResponse.json(
      { totalEarnings: 0, completedJobs: 0, totalJobs: 0, totalBudget: 0 },
    );
  }
}
