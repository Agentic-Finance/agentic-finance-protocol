import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import prisma from '../../lib/prisma';
import {
  RPC_URL,
  PAYPOL_NEXUS_V2_ADDRESS,
  NEXUS_V2_ABI,
  AI_PROOF_REGISTRY_ADDRESS,
  AI_PROOF_REGISTRY_ABI,
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
} from '../../lib/constants';

const TIER_LABELS = ['Newcomer', 'Rising', 'Trusted', 'Elite', 'Legend'] as const;

/**
 * GET /api/reputation?wallet=0x...
 *
 * Returns the reputation score breakdown for an agent (identified by wallet address).
 * Reads from both on-chain (NexusV2 ratings, AIProofRegistry stats, ReputationRegistry score)
 * and off-chain (AgentJob completion stats, AgentReview ratings) data sources.
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    if (!wallet || !ethers.isAddress(wallet)) {
      return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // ── Parallel reads: on-chain + off-chain ───────────────────

    const [
      onChainRating,
      proofStats,
      reputationScore,
      reputationTier,
      jobStats,
      reviewStats,
      agent,
    ] = await Promise.all([
      // On-chain NexusV2 worker rating
      (async () => {
        try {
          const nexus = new ethers.Contract(PAYPOL_NEXUS_V2_ADDRESS, NEXUS_V2_ABI, provider);
          const rating = await nexus.getWorkerRating(wallet);
          return Number(rating);
        } catch { return 0; }
      })(),

      // On-chain AIProofRegistry stats (global, not per-agent yet)
      (async () => {
        try {
          const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, provider);
          const stats = await registry.getStats();
          return {
            totalCommitments: Number(stats[0]),
            totalVerified: Number(stats[1]),
            totalMatched: Number(stats[2]),
            totalMismatched: Number(stats[3]),
            totalSlashed: Number(stats[4]),
          };
        } catch {
          return { totalCommitments: 0, totalVerified: 0, totalMatched: 0, totalMismatched: 0, totalSlashed: 0 };
        }
      })(),

      // On-chain ReputationRegistry composite score
      (async () => {
        try {
          const rep = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, provider);
          const score = await rep.getCompositeScore(wallet);
          return Number(score);
        } catch { return 0; }
      })(),

      // On-chain ReputationRegistry tier
      (async () => {
        try {
          const rep = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, provider);
          const tier = await rep.getTier(wallet);
          return Number(tier);
        } catch { return 0; }
      })(),

      // Off-chain: job completion stats
      (async () => {
        const completed = await prisma.agentJob.count({
          where: { clientWallet: wallet, status: 'COMPLETED' },
        });
        const failed = await prisma.agentJob.count({
          where: { clientWallet: wallet, status: 'FAILED' },
        });
        const total = await prisma.agentJob.count({
          where: { clientWallet: wallet },
        });
        return { completed, failed, total };
      })(),

      // Off-chain: review ratings
      (async () => {
        const reviews = await prisma.agentReview.aggregate({
          where: {
            agent: { ownerWallet: wallet },
          },
          _avg: { rating: true },
          _sum: { rating: true },
          _count: { rating: true },
        });
        return {
          avgRating: reviews._avg.rating ?? 0,
          totalRatingSum: reviews._sum.rating ?? 0,
          ratingCount: reviews._count.rating ?? 0,
        };
      })(),

      // Off-chain: agent marketplace profile
      prisma.marketplaceAgent.findFirst({
        where: { ownerWallet: wallet },
      }),
    ]);

    // ── Compute display score ──────────────────────────────────

    const displayScore = (reputationScore / 100).toFixed(2); // 8500 → "85.00"

    const completionRate = jobStats.total > 0
      ? ((jobStats.completed / jobStats.total) * 100).toFixed(1)
      : '0.0';

    const proofReliability = proofStats.totalVerified > 0
      ? ((proofStats.totalMatched / proofStats.totalVerified) * 100).toFixed(1)
      : '100.0';

    return NextResponse.json({
      success: true,
      wallet,
      agentName: agent?.name ?? null,
      reputation: {
        compositeScore: reputationScore,       // 0-10000 raw
        displayScore: parseFloat(displayScore), // 0-100.00 human-readable
        tier: reputationTier,                   // 0-4
        tierLabel: TIER_LABELS[reputationTier] ?? 'Newcomer',
      },
      breakdown: {
        onChainRating: {
          weight: '30%',
          nexusAvgRating: onChainRating,       // 0-5
          description: 'NexusV2 on-chain worker rating average',
        },
        offChainRating: {
          weight: '25%',
          avgRating: reviewStats.avgRating,
          ratingCount: reviewStats.ratingCount,
          description: 'AgentReview marketplace ratings',
        },
        completionRate: {
          weight: '25%',
          completed: jobStats.completed,
          failed: jobStats.failed,
          total: jobStats.total,
          rate: parseFloat(completionRate),
          description: 'Job completion success rate',
        },
        proofReliability: {
          weight: '20%',
          matched: proofStats.totalMatched,
          verified: proofStats.totalVerified,
          slashed: proofStats.totalSlashed,
          reliability: parseFloat(proofReliability),
          description: 'AIProofRegistry verification match rate',
        },
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[api/reputation] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch reputation', details: error.message },
      { status: 500 },
    );
  }
}
