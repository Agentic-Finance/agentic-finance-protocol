/**
 * Escrow Lifecycle Agent - NexusV2 job progression
 *
 * Handles the middle stages of NexusV2 escrow lifecycle:
 * start jobs, mark complete, and rate workers.
 * Complements escrow-manager which handles create/settle/refund.
 * Real on-chain execution on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getNexusV2,
  sendTx, explorerUrl, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'escrow-lifecycle',
  name:         'Escrow Lifecycle',
  description:  'Manages NexusV2 escrow job progression - start execution, mark jobs complete, and rate workers. Handles the mid-lifecycle steps complementing the Escrow Manager. Real on-chain execution on Tempo L1.',
  category:     'escrow',
  version:      '1.0.0',
  price:        3,
  capabilities: ['start-job', 'complete-job', 'rate-worker', 'job-status', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Escrow Lifecycle agent for NexusV2 on Tempo blockchain.
Parse the user's escrow lifecycle request.

Return JSON:
{
  "action": "start|complete|rate|status",
  "jobId": 1,
  "rating": 5 (1-5 stars, for rate action only),
  "reasoning": "Brief explanation"
}

ACTIONS:
- start: Start a created job (employer confirms work can begin)
- complete: Mark a job as completed (worker signals delivery)
- rate: Rate the worker after job settlement (1-5 stars)
- status: Check current job status on-chain

RULES:
- jobId is required for all actions
- rating must be 1-5 (for rate only)
- Only the employer can start, only the worker can complete
- Rating is only possible after settlement
- Return ONLY valid JSON.`;

const STATUS_NAMES = ['Created', 'Executing', 'Completed', 'Disputed', 'Settled', 'Refunded'];

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  if (!job.prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No escrow lifecycle request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Intent Parsing ──
    console.log(`[escrow-lifecycle] Phase 1: Parsing escrow lifecycle intent...`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: job.prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let intent: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      intent = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'Failed to parse escrow lifecycle intent.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const { action, jobId: onChainJobId, rating, reasoning } = intent;
    const nexus = getNexusV2();

    if (onChainJobId == null) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'jobId is required for all escrow lifecycle operations.',
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    // ── Phase 2: On-Chain Execution ──

    if (action === 'start') {
      console.log(`[escrow-lifecycle] Starting job #${onChainJobId}...`);
      const result = await sendTx(nexus, 'startJob', [onChainJobId]);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'job-started',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          onChainJobId,
          newStatus: 'Executing',
          reasoning,
          transaction: {
            hash: result.txHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            explorerUrl: result.explorerUrl,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'complete') {
      console.log(`[escrow-lifecycle] Completing job #${onChainJobId}...`);
      const result = await sendTx(nexus, 'completeJob', [onChainJobId]);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'job-completed',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          onChainJobId,
          newStatus: 'Completed',
          reasoning,
          transaction: {
            hash: result.txHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            explorerUrl: result.explorerUrl,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'rate') {
      if (!rating || rating < 1 || rating > 5) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: `Invalid rating: ${rating}. Must be 1-5.`,
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      console.log(`[escrow-lifecycle] Rating worker on job #${onChainJobId}: ${rating}/5 stars...`);
      const result = await sendTx(nexus, 'rateWorker', [onChainJobId, rating]);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'worker-rated',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          onChainJobId,
          rating: `${rating}/5`,
          reasoning,
          transaction: {
            hash: result.txHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            explorerUrl: result.explorerUrl,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'status') {
      console.log(`[escrow-lifecycle] Checking job #${onChainJobId} status...`);
      const jobData = await nexus.getJob(onChainJobId);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'status-check',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          onChainJobId,
          jobDetails: {
            employer: jobData.employer,
            worker: jobData.worker,
            judge: jobData.judge,
            token: jobData.token,
            budget: ethers.formatUnits(jobData.budget, DEFAULT_TOKEN.decimals),
            platformFee: ethers.formatUnits(jobData.platformFee, DEFAULT_TOKEN.decimals),
            deadline: new Date(Number(jobData.deadline) * 1000).toISOString(),
            status: STATUS_NAMES[Number(jobData.status)] || 'Unknown',
            rated: jobData.rated,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Unknown lifecycle action: ${action}. Supported: start, complete, rate, status.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

  } catch (err: any) {
    console.error(`[escrow-lifecycle] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Escrow lifecycle failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
