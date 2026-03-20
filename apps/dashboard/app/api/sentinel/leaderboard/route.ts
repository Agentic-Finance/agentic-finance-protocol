import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import prisma from '../../../lib/prisma';
import {
  RPC_URL,
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
} from '../../../lib/constants';

const TIER_LABELS = ['Newcomer', 'Rising', 'Trusted', 'Elite', 'Legend'] as const;

// Simple in-memory cache (60s TTL)
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60_000;

/**
 * GET /api/sentinel/leaderboard
 *
 * Returns ranked list of agents from ReputationRegistry + Prisma join.
 */
export async function GET() {
  try {
    // Return cache if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const repRegistry = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, provider);

    // Get tracked agent count
    let trackedCount = 0;
    try {
      trackedCount = Number(await repRegistry.getTrackedAgentCount());
    } catch {
      // If getTrackedAgentCount doesn't exist, fall back to marketplace agents
      trackedCount = 0;
    }

    const agents: any[] = [];

    if (trackedCount > 0) {
      // Read from on-chain registry
      const batchSize = Math.min(trackedCount, 50); // Limit to 50
      const promises = Array.from({ length: batchSize }, async (_, i) => {
        try {
          const wallet = await repRegistry.getTrackedAgent(i);
          const [score, tier] = await Promise.all([
            repRegistry.getCompositeScore(wallet).then(Number).catch(() => 0),
            repRegistry.getTier(wallet).then(Number).catch(() => 0),
          ]);
          return { wallet: wallet as string, score, tier };
        } catch {
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      const onChainAgents = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
        .map((r) => r.value);

      // Enrich with Prisma data
      for (const agent of onChainAgents) {
        const dbAgent = await prisma.marketplaceAgent.findFirst({
          where: { ownerWallet: agent.wallet },
        });
        const jobStats = await prisma.agentJob.groupBy({
          by: ['status'],
          where: { clientWallet: agent.wallet },
          _count: { status: true },
        });

        const completed = jobStats.find((s) => s.status === 'COMPLETED')?._count?.status ?? 0;
        const failed = jobStats.find((s) => s.status === 'FAILED')?._count?.status ?? 0;

        agents.push({
          wallet: agent.wallet,
          name: dbAgent?.name ?? null,
          emoji: dbAgent?.avatarEmoji ?? null,
          compositeScore: agent.score,
          displayScore: agent.score / 100,
          tier: agent.tier,
          tierLabel: TIER_LABELS[agent.tier] ?? 'Newcomer',
          jobsCompleted: completed,
          jobsFailed: failed,
          proofMatchRate: 100, // Default, would need per-agent proof stats
          totalVolume: 0,
        });
      }
    }

    // Fall back to marketplace agents if no on-chain data
    if (agents.length === 0) {
      const dbAgents = await prisma.marketplaceAgent.findMany({
        take: 30,
        orderBy: { totalJobs: 'desc' },
      });

      for (const agent of dbAgents) {
        let score = 0;
        let tier = 0;
        try {
          score = Number(await repRegistry.getCompositeScore(agent.ownerWallet));
          tier = Number(await repRegistry.getTier(agent.ownerWallet));
        } catch {
          // Use off-chain estimation
          score = Math.round((agent.successRate ?? 0) * 100);
          tier = score >= 8000 ? 3 : score >= 5000 ? 2 : score >= 2000 ? 1 : 0;
        }

        agents.push({
          wallet: agent.ownerWallet,
          name: agent.name,
          emoji: agent.avatarEmoji,
          compositeScore: score,
          displayScore: score / 100,
          tier,
          tierLabel: TIER_LABELS[tier] ?? 'Newcomer',
          jobsCompleted: agent.totalJobs ?? 0,
          jobsFailed: 0,
          proofMatchRate: (agent.successRate ?? 1) * 100,
          totalVolume: 0,
        });
      }
    }

    // Sort by composite score descending
    agents.sort((a, b) => b.compositeScore - a.compositeScore);

    // Add ranks
    agents.forEach((a, i) => { a.rank = i + 1; });

    const response = { success: true, agents, total: agents.length };

    // Cache
    cache = { data: response, timestamp: Date.now() };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[sentinel/leaderboard] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, agents: [] },
      { status: 500 },
    );
  }
}
