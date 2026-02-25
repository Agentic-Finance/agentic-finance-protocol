/**
 * GET /api/revenue/chart?period=7d|30d|90d
 *
 * Returns time-series data for revenue charts:
 *   - labels: date strings
 *   - volume: daily volume in USD
 *   - fees: daily platform fees
 *   - jobs: daily job count
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const period = req.nextUrl.searchParams.get('period') ?? '7d';

    const days = period === '90d' ? 90 : period === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all completed jobs in the period
    const jobs = await prisma.agentJob.findMany({
      where: {
        completedAt: { gte: startDate },
        status: { in: ['COMPLETED', 'SETTLED'] },
      },
      select: {
        negotiatedPrice: true,
        platformFee: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'asc' },
    });

    // Aggregate by day
    const dailyData: Record<string, { volume: number; fees: number; jobs: number }> = {};

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      dailyData[key] = { volume: 0, fees: 0, jobs: 0 };
    }

    // Fill with actual data
    for (const job of jobs) {
      if (!job.completedAt) continue;
      const key = job.completedAt.toISOString().split('T')[0];
      if (dailyData[key]) {
        dailyData[key].volume += job.negotiatedPrice ?? 0;
        dailyData[key].fees += job.platformFee ?? 0;
        dailyData[key].jobs += 1;
      }
    }

    const labels = Object.keys(dailyData).sort();
    const volume = labels.map(k => dailyData[k].volume);
    const fees = labels.map(k => dailyData[k].fees);
    const jobCounts = labels.map(k => dailyData[k].jobs);

    return NextResponse.json({
      period,
      labels,
      volume,
      fees,
      jobs: jobCounts,
    });
  } catch (err: any) {
    console.error('[revenue/chart] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
