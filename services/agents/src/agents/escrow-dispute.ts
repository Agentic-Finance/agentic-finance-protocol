/**
 * Escrow Dispute Agent - NexusV2 dispute resolution
 *
 * Handles escrow disputes as the judge (daemon wallet). Can dispute jobs,
 * check timeout status, and claim timed-out escrows.
 * Real on-chain execution on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getNexusV2, sendTx, explorerUrl,
  DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'escrow-dispute',
  name:         'Escrow Dispute',
  description:  'Handles NexusV2 escrow dispute resolution. As the judge, can raise disputes, check timeout status, and claim timed-out escrows. On-chain arbitration on Tempo L1.',
  category:     'escrow',
  version:      '1.0.0',
  price:        5,
  capabilities: ['dispute-job', 'claim-timeout', 'check-timeout', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Escrow Dispute agent for NexusV2 on Tempo blockchain.
Parse the user's dispute request.

Return JSON:
{
  "action": "dispute|timeout-check|claim-timeout",
  "jobId": 1,
  "reasoning": "Why this dispute action is warranted"
}

ACTIONS:
- dispute: Raise a dispute on an active escrow job
- timeout-check: Check if a job has timed out
- claim-timeout: Claim a timed-out job (refunds employer)
Return ONLY valid JSON.`;

const STATUS_NAMES = ['Created', 'Executing', 'Completed', 'Disputed', 'Settled', 'Refunded'];

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  if (!job.prompt?.trim()) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No dispute request provided.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

  try {
    console.log(`[escrow-dispute] Phase 1: Parsing dispute intent...`);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 512, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: job.prompt }] });
    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let intent: any;
    try { const m = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText]; intent = JSON.parse(m[1]!.trim()); } catch { return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Failed to parse dispute intent.', executionTimeMs: Date.now() - start, timestamp: Date.now() }; }

    const { action, jobId: onChainJobId, reasoning } = intent;
    const nexus = getNexusV2();
    if (onChainJobId == null) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'jobId is required.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

    if (action === 'dispute') {
      console.log(`[escrow-dispute] Disputing job #${onChainJobId}...`);
      const result = await sendTx(nexus, 'disputeJob', [onChainJobId]);
      return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: { phase: 'job-disputed', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID, onChainJobId, newStatus: 'Disputed', reasoning, transaction: { hash: result.txHash, blockNumber: result.blockNumber, gasUsed: result.gasUsed, explorerUrl: result.explorerUrl } }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;

    } else if (action === 'timeout-check') {
      console.log(`[escrow-dispute] Checking timeout for job #${onChainJobId}...`);
      const isTimedOut = await nexus.isTimedOut(onChainJobId);
      const jobData = await nexus.getJob(onChainJobId);
      return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: { phase: 'timeout-check', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID, onChainJobId, isTimedOut, currentStatus: STATUS_NAMES[Number(jobData.status)] || 'Unknown', deadline: new Date(Number(jobData.deadline) * 1000).toISOString() }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;

    } else if (action === 'claim-timeout') {
      console.log(`[escrow-dispute] Claiming timeout for job #${onChainJobId}...`);
      const result = await sendTx(nexus, 'claimTimeout', [onChainJobId]);
      return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: { phase: 'timeout-claimed', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID, onChainJobId, reasoning, transaction: { hash: result.txHash, blockNumber: result.blockNumber, gasUsed: result.gasUsed, explorerUrl: result.explorerUrl } }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;

    } else {
      return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Unknown action: ${action}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
    }
  } catch (err: any) {
    console.error(`[escrow-dispute] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Dispute failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
