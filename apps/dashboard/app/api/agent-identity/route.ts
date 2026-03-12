/**
 * Agent Identity (DID) API
 *
 * GET  /api/agent-identity?wallet=0x...  → Full identity profile
 * POST /api/agent-identity               → Generate DID for agent
 *
 * Combines on-chain data (ReputationRegistry, SecurityDeposit, NexusV2)
 * with off-chain marketplace data to create a verifiable agent identity.
 *
 * DID Format: did:paypol:tempo:42431:<wallet-address>
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import prisma from '@/app/lib/prisma';
import {
  RPC_URL,
  PAYPOL_NEXUS_V2_ADDRESS,
  NEXUS_V2_ABI,
  AI_PROOF_REGISTRY_ADDRESS,
  AI_PROOF_REGISTRY_ABI,
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
  SECURITY_DEPOSIT_ADDRESS,
  SECURITY_DEPOSIT_ABI,
} from '@/app/lib/constants';

const REPUTATION_TIERS = ['Newcomer', 'Rising', 'Trusted', 'Elite', 'Legend'] as const;
const DEPOSIT_TIERS = ['None', 'Bronze', 'Silver', 'Gold'] as const;

/**
 * GET /api/agent-identity?wallet=0x...
 *
 * Returns comprehensive agent identity profile:
 * - DID (Decentralized Identifier)
 * - On-chain reputation (score, tier, breakdown)
 * - Security deposit (amount, tier, fee discount)
 * - Marketplace profile (skills, ratings, history)
 * - Verifiable credentials (what this agent can prove)
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet');
    if (!wallet || !ethers.isAddress(wallet)) {
      return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
    }

    const w = wallet.toLowerCase();
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // ── Parallel reads ──────────────────────────────────────

    const [
      reputationData,
      depositData,
      nexusRating,
      proofStats,
      agents,
      jobStats,
      reviewStats,
    ] = await Promise.all([
      // On-chain ReputationRegistry
      (async () => {
        try {
          const rep = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, provider);
          const [data, score, tier] = await Promise.all([
            rep.getReputation(w),
            rep.getCompositeScore(w),
            rep.getTier(w),
          ]);
          return {
            compositeScore: Number(score),
            tier: Number(tier),
            tierLabel: REPUTATION_TIERS[Number(tier)] ?? 'Newcomer',
            nexusRatingSum: Number(data.nexusRatingSum),
            nexusRatingCount: Number(data.nexusRatingCount),
            offChainRatingSum: Number(data.offChainRatingSum),
            offChainRatingCount: Number(data.offChainRatingCount),
            totalJobsCompleted: Number(data.totalJobsCompleted),
            totalJobsFailed: Number(data.totalJobsFailed),
            proofCommitments: Number(data.proofCommitments),
            proofVerified: Number(data.proofVerified),
            proofMatched: Number(data.proofMatched),
            proofSlashed: Number(data.proofSlashed),
            updatedAt: Number(data.updatedAt),
          };
        } catch {
          return null;
        }
      })(),

      // On-chain SecurityDeposit
      (async () => {
        try {
          const vault = new ethers.Contract(SECURITY_DEPOSIT_ADDRESS, SECURITY_DEPOSIT_ABI, provider);
          const [amount, depositedAt, slashCount, totalSlashed, tier, feeDiscount, lockExpired] =
            await vault.getDeposit(w);
          return {
            amount: Number(ethers.formatUnits(amount, 6)),
            depositedAt: Number(depositedAt),
            slashCount: Number(slashCount),
            totalSlashed: Number(ethers.formatUnits(totalSlashed, 6)),
            tier: Number(tier),
            tierLabel: DEPOSIT_TIERS[Number(tier)] ?? 'None',
            feeDiscountBps: Number(feeDiscount),
            lockExpired,
          };
        } catch {
          return null;
        }
      })(),

      // NexusV2 on-chain rating
      (async () => {
        try {
          const nexus = new ethers.Contract(PAYPOL_NEXUS_V2_ADDRESS, NEXUS_V2_ABI, provider);
          return Number(await nexus.getWorkerRating(w));
        } catch { return 0; }
      })(),

      // AIProofRegistry global stats
      (async () => {
        try {
          const reg = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, provider);
          const s = await reg.getStats();
          return {
            totalCommitments: Number(s[0]),
            totalVerified: Number(s[1]),
            totalMatched: Number(s[2]),
            totalMismatched: Number(s[3]),
            totalSlashed: Number(s[4]),
          };
        } catch {
          return { totalCommitments: 0, totalVerified: 0, totalMatched: 0, totalMismatched: 0, totalSlashed: 0 };
        }
      })(),

      // Off-chain marketplace agents
      prisma.marketplaceAgent.findMany({
        where: { ownerWallet: w },
        select: {
          id: true, name: true, description: true, category: true,
          skills: true, basePrice: true, isVerified: true,
          totalJobs: true, successRate: true, avgRating: true,
          ratingCount: true, responseTime: true, nativeAgentId: true,
          avatarEmoji: true, createdAt: true,
        },
      }),

      // Off-chain job stats
      (async () => {
        const [completed, failed, total] = await Promise.all([
          prisma.agentJob.count({ where: { clientWallet: w, status: 'COMPLETED' } }),
          prisma.agentJob.count({ where: { clientWallet: w, status: 'FAILED' } }),
          prisma.agentJob.count({ where: { clientWallet: w } }),
        ]);
        return { completed, failed, total };
      })(),

      // Off-chain reviews
      prisma.agentReview.aggregate({
        where: { agent: { ownerWallet: w } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    // ── Build DID Document ──────────────────────────────────

    const did = `did:paypol:tempo:42431:${w}`;
    const agentNames = agents.map(a => a.name);
    const agentSkills = agents.flatMap(a => {
      try { return JSON.parse(a.skills); } catch { return []; }
    });

    // Compute verifiable credentials the agent can claim
    const credentials: string[] = [];
    if (reputationData && reputationData.compositeScore > 0) credentials.push('on-chain-reputation');
    if (reputationData && reputationData.tier >= 2) credentials.push('trusted-agent');
    if (reputationData && reputationData.tier >= 4) credentials.push('legend-status');
    if (depositData && depositData.amount > 0) credentials.push('staked-agent');
    if (depositData && depositData.tier >= 2) credentials.push('silver-staker');
    if (depositData && depositData.tier >= 3) credentials.push('gold-staker');
    if (reputationData && reputationData.proofCommitments > 0) credentials.push('ai-proof-verified');
    if (reputationData && reputationData.proofSlashed === 0 && reputationData.proofVerified > 5) credentials.push('zero-slash-record');
    if (reputationData && reputationData.totalJobsCompleted >= 100) credentials.push('centurion');
    if (agents.some(a => a.isVerified)) credentials.push('marketplace-verified');
    if (nexusRating > 0) credentials.push('nexus-rated');

    return NextResponse.json({
      did,
      wallet: w,
      chainId: 42431,
      network: 'Tempo Moderato Testnet',

      identity: {
        names: agentNames,
        skills: [...new Set(agentSkills)],
        categories: [...new Set(agents.map(a => a.category))],
        isVerified: agents.some(a => a.isVerified),
        registeredSince: agents.length > 0
          ? agents.reduce((min, a) => a.createdAt < min ? a.createdAt : min, agents[0].createdAt).toISOString()
          : null,
        agentCount: agents.length,
      },

      reputation: reputationData ? {
        compositeScore: reputationData.compositeScore,
        displayScore: (reputationData.compositeScore / 100).toFixed(2),
        tier: reputationData.tier,
        tierLabel: reputationData.tierLabel,
        breakdown: {
          nexusRating: {
            sum: reputationData.nexusRatingSum,
            count: reputationData.nexusRatingCount,
            average: reputationData.nexusRatingCount > 0
              ? (reputationData.nexusRatingSum / reputationData.nexusRatingCount).toFixed(2)
              : '0',
          },
          offChainRating: {
            average: reviewStats._avg.rating ?? 0,
            count: reviewStats._count.rating,
          },
          completion: {
            completed: reputationData.totalJobsCompleted,
            failed: reputationData.totalJobsFailed,
            rate: (reputationData.totalJobsCompleted + reputationData.totalJobsFailed) > 0
              ? ((reputationData.totalJobsCompleted / (reputationData.totalJobsCompleted + reputationData.totalJobsFailed)) * 100).toFixed(1)
              : '100.0',
          },
          aiProof: {
            commitments: reputationData.proofCommitments,
            verified: reputationData.proofVerified,
            matched: reputationData.proofMatched,
            slashed: reputationData.proofSlashed,
          },
        },
        lastSyncedAt: reputationData.updatedAt > 0
          ? new Date(reputationData.updatedAt * 1000).toISOString()
          : null,
      } : null,

      securityDeposit: depositData ? {
        amount: depositData.amount,
        tier: depositData.tier,
        tierLabel: depositData.tierLabel,
        feeDiscountBps: depositData.feeDiscountBps,
        feeDiscountPct: `${(depositData.feeDiscountBps / 100).toFixed(1)}%`,
        slashCount: depositData.slashCount,
        totalSlashed: depositData.totalSlashed,
        lockExpired: depositData.lockExpired,
      } : null,

      verifiableCredentials: credentials,

      marketplace: {
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          category: a.category,
          skills: (() => { try { return JSON.parse(a.skills); } catch { return []; } })(),
          basePrice: a.basePrice,
          isVerified: a.isVerified,
          totalJobs: a.totalJobs,
          successRate: a.successRate,
          avgRating: a.avgRating,
          responseTime: a.responseTime,
          nativeAgentId: a.nativeAgentId,
        })),
        aggregateStats: {
          totalJobs: jobStats.total,
          completed: jobStats.completed,
          failed: jobStats.failed,
          successRate: jobStats.total > 0
            ? ((jobStats.completed / jobStats.total) * 100).toFixed(1)
            : '100.0',
        },
      },

      contracts: {
        ReputationRegistry: REPUTATION_REGISTRY_ADDRESS,
        SecurityDeposit: SECURITY_DEPOSIT_ADDRESS,
        NexusV2: PAYPOL_NEXUS_V2_ADDRESS,
        AIProofRegistry: AI_PROOF_REGISTRY_ADDRESS,
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err: any) {
    console.error('[agent-identity] Error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch agent identity' }, { status: 500 });
  }
}
