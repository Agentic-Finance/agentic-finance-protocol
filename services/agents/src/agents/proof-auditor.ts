/**
 * Proof Auditor Agent - AIProofRegistry deep audit
 *
 * Reads commitment history, verification rates, match/mismatch ratios,
 * and provides comprehensive AI accountability audit from on-chain data.
 * Reads real data from Tempo L1.
 */

import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import { TEMPO_CHAIN_ID } from '../utils/chain';
import {
  getAIProofRegistry, getProofStats,
  AI_PROOF_REGISTRY_ADDRESS,
} from '../utils/ai-proof';

export const manifest: AgentDescriptor = {
  id:           'proof-auditor',
  name:         'Proof Auditor',
  description:  'Deep audit of AIProofRegistry on-chain data. Reads commitment statistics, verification rates, match/mismatch ratios, slashing records. Complete AI accountability audit from Tempo L1.',
  category:     'verification',
  version:      '1.0.0',
  price:        3,
  capabilities: ['proof-audit', 'verification-stats', 'accountability', 'on-chain-read'],
};

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  try {
    console.log(`[proof-auditor] Running AIProofRegistry audit...`);

    const registry = getAIProofRegistry();

    // Get global stats
    const stats = await getProofStats();
    const totalCommitments = await registry.totalCommitments();
    const totalVerified = await registry.totalVerified();

    // Calculate rates
    const verificationRate = stats.totalCommitments > 0 ? (stats.totalVerified / stats.totalCommitments * 100) : 0;
    const matchRate = stats.totalVerified > 0 ? (stats.totalMatched / stats.totalVerified * 100) : 0;
    const mismatchRate = stats.totalVerified > 0 ? (stats.totalMismatched / stats.totalVerified * 100) : 0;
    const slashRate = stats.totalCommitments > 0 ? (stats.totalSlashed / stats.totalCommitments * 100) : 0;
    const pendingVerification = stats.totalCommitments - stats.totalVerified;

    // Sample recent commitments if any exist
    const recentCommitments: any[] = [];
    if (stats.totalCommitments > 0) {
      // Try to read a few known commitment IDs by checking recent job commitments
      for (let jobId = 0; jobId < Math.min(5, stats.totalCommitments); jobId++) {
        try {
          const commitId = await registry.getJobCommitment(jobId);
          if (commitId && commitId !== ethers.ZeroHash) {
            const commitment = await registry.getCommitment(commitId);
            recentCommitments.push({
              commitmentId: commitId,
              planHash: commitment.planHash,
              agent: commitment.agent,
              nexusJobId: Number(commitment.nexusJobId),
              verified: commitment.verified,
              matched: commitment.matched,
              committedAt: new Date(Number(commitment.committedAt) * 1000).toISOString(),
              verifiedAt: commitment.verifiedAt > 0 ? new Date(Number(commitment.verifiedAt) * 1000).toISOString() : null,
            });
          }
        } catch { /* skip */ }
      }
    }

    console.log(`[proof-auditor] Audit complete: ${stats.totalCommitments} commitments, ${verificationRate.toFixed(1)}% verified`);

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'proof-audit-complete', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      registryAddress: AI_PROOF_REGISTRY_ADDRESS,
      stats: {
        totalCommitments: stats.totalCommitments,
        totalVerified: stats.totalVerified,
        totalMatched: stats.totalMatched,
        totalMismatched: stats.totalMismatched,
        totalSlashed: stats.totalSlashed,
        pendingVerification,
      },
      rates: {
        verificationRate: `${verificationRate.toFixed(1)}%`,
        matchRate: `${matchRate.toFixed(1)}%`,
        mismatchRate: `${mismatchRate.toFixed(1)}%`,
        slashRate: `${slashRate.toFixed(1)}%`,
      },
      accountability: {
        trustScore: matchRate >= 90 ? 'HIGH' : matchRate >= 70 ? 'MEDIUM' : 'LOW',
        aiReliability: stats.totalMismatched === 0 ? 'PERFECT' : stats.totalMismatched <= 2 ? 'GOOD' : 'NEEDS_REVIEW',
      },
      recentCommitments,
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[proof-auditor] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Proof audit failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
