/**
 * /api/swarm/stream/[id] — Swarm Detail
 *
 * GET: Full swarm detail with all streams, milestones, recent audit events
 */

import prisma from '../../../../lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const swarm = await prisma.swarmSession.findUnique({
      where: { id },
      include: {
        streams: {
          include: {
            streamJob: {
              include: { milestones: { orderBy: { index: 'asc' } } },
            },
          },
        },
        auditEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        a2aTransfers: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!swarm) {
      return apiError('Swarm not found', 404);
    }

    return apiSuccess({ swarm });
  } catch (error: any) {
    return logAndReturn('SWARM_DETAIL', error, 'Failed to get swarm detail');
  }
}
