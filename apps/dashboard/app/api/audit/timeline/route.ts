/**
 * /api/audit/timeline — Query Audit Timeline
 *
 * GET: Timeline events with filters, pagination
 */

import prisma from '../../../lib/prisma';
import { apiSuccess, logAndReturn } from '@/app/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const swarmId = searchParams.get('swarmId');
    const agentId = searchParams.get('agentId');
    const eventType = searchParams.get('eventType');
    const severity = searchParams.get('severity');
    const from = searchParams.get('from'); // ISO date string
    const to = searchParams.get('to');     // ISO date string
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (swarmId) where.swarmId = swarmId;
    if (agentId) where.agentId = agentId;
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [events, total, severityCounts] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
    ]);

    return apiSuccess({
      events,
      total,
      severityCounts: severityCounts.reduce((acc, s) => {
        acc[s.severity] = s._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error: any) {
    return logAndReturn('AUDIT_TIMELINE', error, 'Failed to query audit timeline');
  }
}
