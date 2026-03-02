/**
 * /api/swarm/stats — Aggregate Swarm Dashboard Stats
 *
 * GET: Returns top-level stats for the swarm hub
 */

import { apiSuccess, logAndReturn } from '@/app/lib/api-response';
import { getSwarmStats } from '@/app/lib/swarm-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getSwarmStats();
    return apiSuccess({ stats });
  } catch (error: any) {
    return logAndReturn('SWARM_STATS', error, 'Failed to get swarm stats');
  }
}
