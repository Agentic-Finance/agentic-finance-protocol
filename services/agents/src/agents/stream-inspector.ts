/**
 * Stream Inspector Agent - Deep on-chain stream analysis
 *
 * Reads all active streams, analyzes milestone progress, checks deadlines,
 * calculates completion rates, and provides comprehensive stream analytics.
 * Reads real data from Tempo L1.
 */

import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, explorerUrl, TEMPO_CHAIN_ID, DEFAULT_TOKEN,
} from '../utils/chain';
import { getStreamV1, getStreamOnChain, getMilestoneOnChain } from '../utils/stream-settlement';

export const manifest: AgentDescriptor = {
  id:           'stream-inspector',
  name:         'Stream Inspector',
  description:  'Deep on-chain stream analysis for PayPolStreamV1. Reads stream state, milestone progress, deadlines, timeout status, and calculates completion analytics. Real on-chain reads from Tempo L1.',
  category:     'analytics',
  version:      '1.0.0',
  price:        2,
  capabilities: ['stream-analysis', 'milestone-tracking', 'deadline-check', 'on-chain-read'],
};

const STATUS_NAMES = ['Active', 'Completed', 'Cancelled'];
const MS_STATUS = ['Pending', 'Submitted', 'Approved', 'Rejected'];

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  try {
    const streamV1 = getStreamV1();
    const streamCount = Number(await streamV1.streamCount());

    // If specific stream requested
    const requestedId = job.payload?.streamId as number | undefined;

    if (requestedId != null) {
      console.log(`[stream-inspector] Inspecting stream #${requestedId}...`);
      const stream = await getStreamOnChain(requestedId);
      const milestones = [];
      for (let i = 0; i < stream.milestoneCount; i++) {
        const ms = await getMilestoneOnChain(requestedId, i);
        milestones.push({ index: i, amount: ethers.formatUnits(ms.amount, DEFAULT_TOKEN.decimals), proofHash: ms.proofHash, status: MS_STATUS[ms.status] || 'Unknown' });
      }
      const isTimedOut = await streamV1.isTimedOut(requestedId);
      const remaining = await streamV1.getRemainingBalance(requestedId);
      const progress = stream.milestoneCount > 0 ? (stream.approvedCount / stream.milestoneCount * 100) : 0;

      return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
        phase: 'stream-inspected', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
        stream: { streamId: requestedId, client: stream.client, agent: stream.agent, token: stream.token, totalBudget: ethers.formatUnits(stream.totalBudget, DEFAULT_TOKEN.decimals), releasedAmount: ethers.formatUnits(stream.releasedAmount, DEFAULT_TOKEN.decimals), remainingBalance: ethers.formatUnits(remaining, DEFAULT_TOKEN.decimals), milestoneCount: stream.milestoneCount, approvedCount: stream.approvedCount, status: STATUS_NAMES[stream.status] || 'Unknown', deadline: new Date(stream.deadline * 1000).toISOString(), isTimedOut, progress: `${progress.toFixed(1)}%` },
        milestones,
      }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
    }

    // Scan all recent streams
    console.log(`[stream-inspector] Scanning ${streamCount} total streams...`);
    const maxScan = Math.min(streamCount, 20);
    const streams: any[] = [];

    for (let id = streamCount - 1; id >= Math.max(0, streamCount - maxScan); id--) {
      try {
        const stream = await getStreamOnChain(id);
        const isTimedOut = await streamV1.isTimedOut(id);
        const remaining = await streamV1.getRemainingBalance(id);
        const progress = stream.milestoneCount > 0 ? (stream.approvedCount / stream.milestoneCount * 100) : 0;
        streams.push({ streamId: id, client: stream.client, agent: stream.agent, totalBudget: ethers.formatUnits(stream.totalBudget, DEFAULT_TOKEN.decimals), released: ethers.formatUnits(stream.releasedAmount, DEFAULT_TOKEN.decimals), remaining: ethers.formatUnits(remaining, DEFAULT_TOKEN.decimals), milestones: `${stream.approvedCount}/${stream.milestoneCount}`, status: STATUS_NAMES[stream.status] || 'Unknown', isTimedOut, progress: `${progress.toFixed(1)}%` });
      } catch { /* skip invalid */ }
    }

    const active = streams.filter(s => s.status === 'Active');
    const completed = streams.filter(s => s.status === 'Completed');
    const timedOut = streams.filter(s => s.isTimedOut);

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'streams-scanned', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      totalOnChain: streamCount, scanned: streams.length, streams,
      summary: { active: active.length, completed: completed.length, cancelled: streams.filter(s => s.status === 'Cancelled').length, timedOut: timedOut.length },
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[stream-inspector] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Stream inspection failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
