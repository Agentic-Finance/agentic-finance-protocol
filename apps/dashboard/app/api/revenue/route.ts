/**
 * GET /api/revenue - Revenue & TVL Dashboard Data
 *
 * Returns:
 *   - TVL: Total Value Locked across all contracts
 *   - Fees: today, week, month, allTime
 *   - Volume: today, week, month
 *   - Top agents by revenue
 *   - Recent settlements
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCachedTVL } from '../../lib/tvl';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    const monthStart = new Date(todayStart.getTime() - 30 * 86400000);

    // Parallel queries
    const [
      tvl,
      feesToday,
      feesWeek,
      feesMonth,
      feesAll,
      volumeToday,
      volumeWeek,
      volumeMonth,
      topAgents,
      recentSettlements,
      activeStreams,
      totalJobs,
    ] = await Promise.all([
      // TVL
      getCachedTVL(),

      // Fees
      prisma.agentJob.aggregate({
        where: { completedAt: { gte: todayStart }, status: { in: ['COMPLETED', 'SETTLED'] } },
        _sum: { platformFee: true },
      }),
      prisma.agentJob.aggregate({
        where: { completedAt: { gte: weekStart }, status: { in: ['COMPLETED', 'SETTLED'] } },
        _sum: { platformFee: true },
      }),
      prisma.agentJob.aggregate({
        where: { completedAt: { gte: monthStart }, status: { in: ['COMPLETED', 'SETTLED'] } },
        _sum: { platformFee: true },
      }),
      prisma.agentJob.aggregate({
        where: { status: { in: ['COMPLETED', 'SETTLED'] } },
        _sum: { platformFee: true },
      }),

      // Volume
      prisma.agentJob.aggregate({
        where: { completedAt: { gte: todayStart }, status: { in: ['COMPLETED', 'SETTLED'] } },
        _sum: { negotiatedPrice: true },
      }),
      prisma.agentJob.aggregate({
        where: { completedAt: { gte: weekStart }, status: { in: ['COMPLETED', 'SETTLED'] } },
        _sum: { negotiatedPrice: true },
      }),
      prisma.agentJob.aggregate({
        where: { completedAt: { gte: monthStart }, status: { in: ['COMPLETED', 'SETTLED'] } },
        _sum: { negotiatedPrice: true },
      }),

      // Top agents by revenue
      prisma.agentJob.groupBy({
        by: ['agentId'],
        where: { status: { in: ['COMPLETED', 'SETTLED'] } },
        _sum: { negotiatedPrice: true, platformFee: true },
        _count: true,
        orderBy: { _sum: { negotiatedPrice: 'desc' } },
        take: 10,
      }),

      // Recent settlements
      prisma.agentJob.findMany({
        where: { status: { in: ['COMPLETED', 'SETTLED'] } },
        orderBy: { completedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          agentId: true,
          negotiatedPrice: true,
          platformFee: true,
          token: true,
          status: true,
          settleTxHash: true,
          completedAt: true,
          agent: { select: { name: true, avatarEmoji: true } },
        },
      }),

      // Active streams
      prisma.streamJob.count({ where: { status: 'ACTIVE' } }),

      // Total jobs
      prisma.agentJob.count({ where: { status: { in: ['COMPLETED', 'SETTLED'] } } }),
    ]);

    // Enrich top agents with names
    const agentIds = topAgents.map(a => a.agentId);
    const agentDetails = await prisma.marketplaceAgent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, avatarEmoji: true, avgRating: true, totalJobs: true },
    });
    const agentMap = Object.fromEntries(agentDetails.map(a => [a.id, a]));

    return NextResponse.json({
      tvl: {
        total: tvl.totalUSD,
        byContract: tvl.byContract,
        byToken: tvl.byToken,
        computedAt: tvl.computedAt,
      },
      fees: {
        today: feesToday._sum.platformFee ?? 0,
        week: feesWeek._sum.platformFee ?? 0,
        month: feesMonth._sum.platformFee ?? 0,
        allTime: feesAll._sum.platformFee ?? 0,
      },
      volume: {
        today: volumeToday._sum.negotiatedPrice ?? 0,
        week: volumeWeek._sum.negotiatedPrice ?? 0,
        month: volumeMonth._sum.negotiatedPrice ?? 0,
      },
      topAgents: topAgents.map(a => ({
        agentId: a.agentId,
        name: agentMap[a.agentId]?.name ?? a.agentId,
        emoji: agentMap[a.agentId]?.avatarEmoji ?? '🤖',
        rating: agentMap[a.agentId]?.avgRating ?? 0,
        jobs: a._count,
        revenue: a._sum.negotiatedPrice ?? 0,
        fees: a._sum.platformFee ?? 0,
      })),
      recentSettlements: recentSettlements.map(s => ({
        id: s.id,
        agentName: s.agent.name,
        agentEmoji: s.agent.avatarEmoji,
        amount: s.negotiatedPrice ?? 0,
        fee: s.platformFee ?? 0,
        token: s.token,
        txHash: s.settleTxHash,
        explorerUrl: s.settleTxHash ? `https://explore.tempo.xyz/tx/${s.settleTxHash}` : null,
        completedAt: s.completedAt?.toISOString() ?? null,
      })),
      summary: {
        activeStreams,
        totalJobs,
      },
    });
  } catch (err: any) {
    console.error('[revenue] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
