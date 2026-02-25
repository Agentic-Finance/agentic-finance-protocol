/**
 * Stream Manager Agent — Manage stream lifecycle on StreamV1
 *
 * Submit milestones, approve/reject deliverables, cancel streams,
 * and inspect on-chain stream state. Real Tempo L1 execution.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import { TEMPO_CHAIN_ID } from '../utils/chain';
import {
  submitMilestoneOnChain, approveMilestoneOnChain,
  rejectMilestoneOnChain, cancelStreamOnChain,
  getStreamOnChain, getMilestoneOnChain, generateProofHash,
} from '../utils/stream-settlement';

export const manifest: AgentDescriptor = {
  id:           'stream-manager',
  name:         'Stream Manager',
  description:  'Manages PayPolStreamV1 lifecycle — submit milestones with proof hashes, approve/reject deliverables, cancel streams. Full on-chain execution on Tempo L1.',
  category:     'streams',
  version:      '1.0.0',
  price:        5,
  capabilities: ['submit-milestone', 'approve-milestone', 'reject-milestone', 'cancel-stream', 'stream-status', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Stream Manager agent for PayPolStreamV1 on Tempo blockchain.
Parse the user's request into a stream management action.

Return JSON:
{
  "action": "submit|approve|reject|cancel|status",
  "streamId": 1,
  "milestoneIndex": 0,
  "deliverable": "Description of completed work (for submit only)",
  "reason": "Reason for rejection (for reject only)"
}

ACTIONS:
- submit: Agent submits a milestone deliverable with proof hash
- approve: Client approves a submitted milestone (releases payment)
- reject: Client rejects a submitted milestone
- cancel: Client cancels the entire stream (refunds remaining)
- status: Check stream and milestone status on-chain

RULES:
- streamId is required for all actions
- milestoneIndex is required for submit, approve, reject
- deliverable is required for submit (will be hashed as proof)
- Return ONLY valid JSON.`;

const STATUS_NAMES = ['Active', 'Completed', 'Cancelled'];
const MILESTONE_STATUS_NAMES = ['Pending', 'Submitted', 'Approved', 'Rejected'];

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  if (!job.prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No stream management request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Intent Parsing ──
    console.log(`[stream-manager] Phase 1: Parsing stream management intent...`);

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
        error: 'Failed to parse stream management intent.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const { action, streamId, milestoneIndex, deliverable, reason } = intent;

    if (streamId == null) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'streamId is required for all stream operations.',
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    // ── Phase 2: On-Chain Execution ──

    if (action === 'submit') {
      if (milestoneIndex == null || !deliverable) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: 'milestoneIndex and deliverable are required for submit.',
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      const proofHash = generateProofHash(deliverable);
      console.log(`[stream-manager] Submitting milestone ${milestoneIndex} for stream #${streamId}...`);
      const result = await submitMilestoneOnChain(streamId, milestoneIndex, proofHash);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'milestone-submitted',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          streamId, milestoneIndex,
          deliverable, proofHash,
          transaction: { hash: result.txHash, explorerUrl: result.explorerUrl },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'approve') {
      if (milestoneIndex == null) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: 'milestoneIndex is required for approve.',
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      console.log(`[stream-manager] Approving milestone ${milestoneIndex} for stream #${streamId}...`);
      const result = await approveMilestoneOnChain(streamId, milestoneIndex);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'milestone-approved',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          streamId, milestoneIndex,
          agentPayout: result.agentPayout,
          platformFee: result.fee,
          transaction: { hash: result.txHash, explorerUrl: result.explorerUrl },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'reject') {
      if (milestoneIndex == null) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: 'milestoneIndex is required for reject.',
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      console.log(`[stream-manager] Rejecting milestone ${milestoneIndex} for stream #${streamId}...`);
      const result = await rejectMilestoneOnChain(streamId, milestoneIndex);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'milestone-rejected',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          streamId, milestoneIndex,
          reason: reason || 'Deliverable did not meet requirements',
          transaction: { hash: result.txHash, explorerUrl: result.explorerUrl },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'cancel') {
      console.log(`[stream-manager] Cancelling stream #${streamId}...`);
      const result = await cancelStreamOnChain(streamId);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'stream-cancelled',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          streamId,
          transaction: { hash: result.txHash, explorerUrl: result.explorerUrl },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'status') {
      console.log(`[stream-manager] Checking stream #${streamId} status...`);
      const streamData = await getStreamOnChain(streamId);
      const milestones = [];

      for (let i = 0; i < streamData.milestoneCount; i++) {
        const ms = await getMilestoneOnChain(streamId, i);
        milestones.push({
          index: i,
          amount: ms.amount,
          proofHash: ms.proofHash,
          status: MILESTONE_STATUS_NAMES[ms.status] || 'Unknown',
        });
      }

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'status-check',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          stream: {
            streamId,
            client: streamData.client,
            agent: streamData.agent,
            token: streamData.token,
            totalBudget: streamData.totalBudget,
            releasedAmount: streamData.releasedAmount,
            status: STATUS_NAMES[streamData.status] || 'Unknown',
            approvedCount: streamData.approvedCount,
            milestoneCount: streamData.milestoneCount,
            deadline: streamData.deadline,
          },
          milestones,
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Unknown stream action: ${action}. Supported: submit, approve, reject, cancel, status.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

  } catch (err: any) {
    console.error(`[stream-manager] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Stream operation failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
