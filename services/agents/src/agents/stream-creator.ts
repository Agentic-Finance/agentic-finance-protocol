/**
 * Stream Creator Agent - Create milestone payment streams on StreamV1
 *
 * Parses job descriptions into milestone breakdowns and creates
 * progressive payment streams on-chain. Real Tempo L1 execution.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, explorerUrl, parseTokenAmount,
  DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';
import { createStreamOnChain } from '../utils/stream-settlement';

export const manifest: AgentDescriptor = {
  id:           'stream-creator',
  name:         'Stream Creator',
  description:  'Creates milestone-based payment streams on PayPolStreamV1. AI breaks job descriptions into milestones with budgets, then deploys the stream on-chain. Progressive escrow with real Tempo L1 execution.',
  category:     'streams',
  version:      '1.0.0',
  price:        8,
  capabilities: ['create-stream', 'milestone-planning', 'progressive-escrow', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Stream Creator agent. Break the user's job description into milestones for a progressive payment stream.

Return JSON:
{
  "agentWallet": "0x...",
  "milestones": [
    { "deliverable": "Description of milestone 1", "amount": 100 },
    { "deliverable": "Description of milestone 2", "amount": 150 }
  ],
  "deadlineHours": 168,
  "tokenSymbol": "AlphaUSD",
  "summary": "Brief description of this stream"
}

RULES:
- Max 10 milestones per stream
- Each milestone must have a clear deliverable and amount
- deadlineHours is the total stream deadline (default: 168 = 7 days)
- Default token: AlphaUSD
- agentWallet is the worker/agent who will deliver the milestones
- Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  if (!job.prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No stream creation request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Milestone Planning ──
    console.log(`[stream-creator] Phase 1: Planning milestones...`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1024,
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
        error: 'Failed to parse milestone plan from AI response.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const { agentWallet, milestones, deadlineHours, summary } = intent;

    if (!ethers.isAddress(agentWallet)) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Invalid agent wallet: ${agentWallet}`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    if (!milestones || milestones.length === 0 || milestones.length > 10) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Invalid milestone count: ${milestones?.length || 0}. Must be 1-10.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    // ── Phase 2: On-Chain Stream Creation ──
    const milestoneAmounts = milestones.map((m: any) => m.amount);
    const totalBudget = milestoneAmounts.reduce((s: number, a: number) => s + a, 0);
    const deadlineSeconds = (deadlineHours || 168) * 3600;

    console.log(`[stream-creator] Phase 2: Creating stream - ${milestones.length} milestones, ${totalBudget} AlphaUSD, ${deadlineHours || 168}h deadline...`);

    const result = await createStreamOnChain(
      agentWallet,
      DEFAULT_TOKEN.address,
      milestoneAmounts,
      deadlineSeconds,
      DEFAULT_TOKEN.decimals,
    );

    console.log(`[stream-creator] Stream created: #${result.streamId} - TX: ${result.txHash}`);

    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: {
        phase: 'stream-created',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        stream: {
          onChainStreamId: result.streamId,
          client: getWallet().address,
          agent: agentWallet,
          totalBudget: `${totalBudget} AlphaUSD`,
          milestoneCount: milestones.length,
          milestones: milestones.map((m: any, i: number) => ({
            index: i,
            deliverable: m.deliverable,
            amount: `${m.amount} AlphaUSD`,
            status: 'PENDING',
          })),
          deadlineHours: deadlineHours || 168,
          status: 'ACTIVE',
        },
        transaction: {
          hash: result.txHash,
          explorerUrl: result.explorerUrl,
        },
        summary,
      },
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    } satisfies JobResult;

  } catch (err: any) {
    console.error(`[stream-creator] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Stream creation failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
