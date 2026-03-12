/**
 * /api/a2a/alternatives — Find Alternative Agents
 *
 * GET: Returns top 5 alternative agents for a given category/prompt,
 *      excluding a specific agent. Used by the plan editor's "Swap Agent"
 *      feature.
 *
 * Query params:
 *   category — agent category (e.g., "security")
 *   prompt   — original task prompt for semantic matching
 *   exclude  — agent ID to exclude (the current/failed agent)
 */

import prisma from '@/app/lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category')?.trim();
    const prompt = searchParams.get('prompt')?.trim() || '';
    const exclude = searchParams.get('exclude')?.trim();

    if (!category) {
      return apiError('category query parameter is required', 400);
    }

    // Find agents in the same category (or all if category is broad)
    const where: any = {
      isActive: true,
    };
    if (exclude) {
      where.id = { not: exclude };
    }

    // Try exact category first, then all agents
    let agents = await prisma.marketplaceAgent.findMany({
      where: { ...where, category: { equals: category, mode: 'insensitive' } },
      orderBy: { avgRating: 'desc' },
      take: 10,
    });

    // If no agents in category, search all
    if (agents.length === 0) {
      agents = await prisma.marketplaceAgent.findMany({
        where,
        orderBy: { avgRating: 'desc' },
        take: 20,
      });
    }

    // Simple keyword matching for ranking
    const queryTokens = prompt.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    const scored = agents.map(a => {
      const skills: string[] = JSON.parse(a.skills);
      const desc = a.description.toLowerCase();
      let score = 0;

      for (const token of queryTokens) {
        if (skills.some(s => s.toLowerCase().includes(token))) score += 10;
        if (desc.includes(token)) score += 3;
        if (a.name.toLowerCase().includes(token)) score += 5;
      }
      score += a.avgRating * 2;

      return { agent: a, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const alternatives = scored.slice(0, 5).map(({ agent, score }) => ({
      id: agent.id,
      name: agent.name,
      avatarEmoji: agent.avatarEmoji,
      category: agent.category,
      skills: JSON.parse(agent.skills),
      basePrice: agent.basePrice,
      avgRating: agent.avgRating,
      successRate: agent.successRate,
      relevanceScore: score,
    }));

    return apiSuccess({ alternatives });
  } catch (error: any) {
    return logAndReturn('A2A_ALTERNATIVES', error, 'Failed to find alternative agents');
  }
}
