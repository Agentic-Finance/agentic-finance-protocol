/**
 * Contract Reader Agent - Read all PayPol contract states
 *
 * Comprehensive on-chain state reader. Reads NexusV2 job count,
 * MultisendV2 batch history, StreamV1 stream count, worker ratings,
 * and batch records. Real on-chain reads from Tempo L1.
 */

import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getNexusV2, getMultisendV2,
  explorerUrl, CONTRACTS, DEFAULT_TOKEN, TOKENS, TEMPO_CHAIN_ID,
} from '../utils/chain';
import { getStreamV1 } from '../utils/stream-settlement';
import { getAIProofRegistry } from '../utils/ai-proof';

export const manifest: AgentDescriptor = {
  id:           'contract-reader',
  name:         'Contract Reader',
  description:  'Read all PayPol smart contract states. NexusV2 job counters, MultisendV2 batch history, StreamV1 stream count, worker ratings, and AI proof stats. Comprehensive on-chain data from Tempo L1.',
  category:     'analytics',
  version:      '1.0.0',
  price:        2,
  capabilities: ['contract-state', 'job-counter', 'batch-history', 'rating-check', 'on-chain-read'],
};

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  try {
    console.log(`[contract-reader] Reading all contract states...`);
    const provider = getProvider();
    const wallet = getWallet();

    // NexusV2
    const nexus = getNexusV2();
    const nextJobId = Number(await nexus.nextJobId());
    const workerRating = await nexus.getWorkerRating(wallet.address);

    // Read recent jobs
    const recentJobs: any[] = [];
    const STATUS_NAMES = ['Created', 'Executing', 'Completed', 'Disputed', 'Settled', 'Refunded'];
    for (let id = Math.max(0, nextJobId - 5); id < nextJobId; id++) {
      try {
        const jobData = await nexus.getJob(id);
        const isTimedOut = await nexus.isTimedOut(id);
        recentJobs.push({ jobId: id, employer: jobData.employer, worker: jobData.worker, budget: ethers.formatUnits(jobData.budget, DEFAULT_TOKEN.decimals), status: STATUS_NAMES[Number(jobData.status)] || 'Unknown', isTimedOut, rated: jobData.rated });
      } catch { /* skip */ }
    }

    // MultisendV2
    const multisend = getMultisendV2();
    const batchCount = Number(await multisend.getBatchCount());
    const recentBatches: any[] = [];
    for (let i = Math.max(0, batchCount - 5); i < batchCount; i++) {
      try {
        const batch = await multisend.getBatchRecord(i);
        recentBatches.push({ index: i, batchId: batch.batchId, token: batch.token, recipients: Number(batch.totalRecipients), totalAmount: ethers.formatUnits(batch.totalAmount, 6), executor: batch.executor, executedAt: new Date(Number(batch.executedAt) * 1000).toISOString() });
      } catch { /* skip */ }
    }

    // StreamV1
    const stream = getStreamV1();
    const streamCount = Number(await stream.streamCount());

    // AIProofRegistry
    const registry = getAIProofRegistry();
    const totalCommitments = Number(await registry.totalCommitments());
    const totalVerified = Number(await registry.totalVerified());

    const blockNumber = await provider.getBlockNumber();

    console.log(`[contract-reader] Read complete - ${nextJobId} jobs, ${batchCount} batches, ${streamCount} streams`);

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'contracts-read', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      nexusV2: { address: CONTRACTS.NEXUS_V2, totalJobs: nextJobId, myWorkerRating: Number(workerRating), recentJobs },
      multisendV2: { address: CONTRACTS.MULTISEND_V2, totalBatches: batchCount, recentBatches },
      streamV1: { address: CONTRACTS.STREAM_V1, totalStreams: streamCount },
      aiProofRegistry: { address: CONTRACTS.AI_PROOF_REGISTRY, totalCommitments, totalVerified },
      blockNumber,
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[contract-reader] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Contract read failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
