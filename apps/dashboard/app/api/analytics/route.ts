import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase();
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
    }

    // Find agents owned by this wallet
    const agents = await prisma.marketplaceAgent.findMany({
      where: { ownerWallet: { equals: wallet, mode: 'insensitive' } },
      include: {
        jobs: {
          select: {
            id: true,
            status: true,
            negotiatedPrice: true,
            budget: true,
            platformFee: true,
            createdAt: true,
            completedAt: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (agents.length === 0) {
      return NextResponse.json({
        success: true,
        totalEarnings: 0,
        totalJobs: 0,
        avgRating: 0,
        activeAgents: 0,
        jobsByMonth: [],
        earningsByMonth: [],
        topAgents: [],
      });
    }

    let totalEarnings = 0;
    let totalJobs = 0;
    let totalRating = 0;
    let ratingCount = 0;
    const monthlyJobs: Record<string, number> = {};
    const monthlyEarnings: Record<string, number> = {};

    const topAgents = agents.map(agent => {
      let agentEarnings = 0;
      let agentJobs = 0;
      let agentSuccessful = 0;

      for (const job of agent.jobs) {
        agentJobs++;
        totalJobs++;
        const amount = job.negotiatedPrice ?? job.budget;
        const fee = job.platformFee ?? 0;
        const earning = amount - fee;

        if (job.status === 'COMPLETED' || job.status === 'SETTLED') {
          agentEarnings += earning;
          totalEarnings += earning;
          agentSuccessful++;
        }

        // Monthly aggregation
        const month = job.createdAt.toISOString().slice(0, 7); // YYYY-MM
        monthlyJobs[month] = (monthlyJobs[month] || 0) + 1;
        if (job.status === 'COMPLETED' || job.status === 'SETTLED') {
          monthlyEarnings[month] = (monthlyEarnings[month] || 0) + earning;
        }
      }

      for (const review of agent.reviews) {
        totalRating += review.rating;
        ratingCount++;
      }

      return {
        id: agent.id,
        name: agent.name,
        avatarEmoji: agent.avatarEmoji,
        category: agent.category,
        jobs: agentJobs,
        earnings: agentEarnings,
        rating: agent.avgRating,
        successRate: agentJobs > 0 ? (agentSuccessful / agentJobs) * 100 : 0,
      };
    });

    // Sort top agents by earnings
    topAgents.sort((a, b) => b.earnings - a.earnings);

    // Convert monthly data to arrays sorted by month
    const months = [...new Set([...Object.keys(monthlyJobs), ...Object.keys(monthlyEarnings)])].sort();
    const jobsByMonth = months.map(m => ({ month: m, count: monthlyJobs[m] || 0 }));
    const earningsByMonth = months.map(m => ({ month: m, amount: monthlyEarnings[m] || 0 }));

    return NextResponse.json({
      success: true,
      totalEarnings,
      totalJobs,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
      activeAgents: agents.filter(a => a.isActive).length,
      jobsByMonth,
      earningsByMonth,
      topAgents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analytics] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
