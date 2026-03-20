import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// REST endpoint for initial page load with pagination
// GET /api/live/feed?limit=50&offset=0&eventType=all&severity=all

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const eventType = searchParams.get('eventType') || 'all';
    const severity = searchParams.get('severity') || 'all';

    // Build where clause
    const where: Record<string, any> = {};

    if (eventType !== 'all') {
      where.eventType = { contains: eventType.toUpperCase() };
    }

    if (severity !== 'all') {
      where.severity = severity.toUpperCase();
    }

    // Query events and stats in parallel
    const [events, total, totalJobs, totalAgents] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditEvent.count({ where }),
      prisma.agentJob.count({ where: { status: 'COMPLETED' } }),
      prisma.marketplaceAgent.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      success: true,
      events,
      total,
      stats: {
        totalEvents: total,
        totalJobs,
        totalAgents,
      },
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error('[live/feed] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live feed', events: [], total: 0, stats: { totalEvents: 0, totalJobs: 0, totalAgents: 0 }, hasMore: false },
      { status: 500 }
    );
  }
}
