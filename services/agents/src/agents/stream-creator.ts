/**
 * Stream Creator Agent - Create milestone payment streams on StreamV1
 *
 * Parses job descriptions into milestone breakdowns and creates
 * progressive payment streams on-chain. Real Tempo L1 execution.
 */

import { aiComplete } from '../ai-client';
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
  description:  'Creates milestone-based payment streams on Agentic FinanceStreamV1. AI breaks job descriptions into milestones with budgets, then deploys the stream on-chain. Progressive escrow with real Tempo L1 execution.',
  category:     'streams',
  version:      '1.0.0',
  price:        8,
  capabilities: ['create-stream', 'milestone-planning', 'progressive-escrow', 'on-chain-execution'],
};

/**
 * Build system prompt with budget context so the AI knows how much to allocate.
 */
function buildSystemPrompt(budget: number): string {
  return `You are a Agentic Finance Stream Creator agent. Break the user's job description into milestones for a progressive payment stream.

TOTAL BUDGET: ${budget} AlphaUSD — You MUST distribute this exact amount across milestones.

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
- Each milestone must have a clear deliverable and a non-zero amount
- The sum of all milestone amounts MUST equal exactly ${budget} AlphaUSD
- Every milestone amount must be greater than 0
- deadlineHours is the total stream deadline (default: 168 = 7 days)
- Default token: AlphaUSD
- agentWallet is the worker/agent who will deliver the milestones
- Return ONLY valid JSON.`;
}

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
    const budget = Number(job.payload?.budget) || 0;
    const taskDescription = (job.payload?.taskDescription as string) || '';

    console.log(`[stream-creator] Phase 1: Planning milestones... (budget: ${budget} AlphaUSD)`);

    if (budget <= 0) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Invalid budget: ${budget}. Budget must be greater than 0.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    // Build user message with full context
    const userMessage = taskDescription
      ? `${job.prompt}\n\nTask Details: ${taskDescription}\nBudget: ${budget} AlphaUSD`
      : `${job.prompt}\nBudget: ${budget} AlphaUSD`;

    const rawText = await aiComplete(buildSystemPrompt(budget), userMessage, { maxTokens: 1024 });
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

    // ── Phase 1.5: Validate & Fix Milestone Amounts ──
    let milestoneAmounts: number[] = milestones.map((m: any) => Number(m.amount) || 0);
    let totalFromAI = milestoneAmounts.reduce((s: number, a: number) => s + a, 0);

    // If AI returned all zeros or total is 0, redistribute budget evenly
    if (totalFromAI <= 0) {
      console.warn(`[stream-creator] AI returned 0 total budget — redistributing ${budget} evenly across ${milestones.length} milestones`);
      const perMilestone = Math.round((budget / milestones.length) * 100) / 100;
      milestoneAmounts = milestones.map((_: any, i: number) =>
        i === milestones.length - 1
          ? Math.round((budget - perMilestone * (milestones.length - 1)) * 100) / 100
          : perMilestone
      );
      totalFromAI = milestoneAmounts.reduce((s: number, a: number) => s + a, 0);
      // Update milestone objects for the result
      milestones.forEach((m: any, i: number) => { m.amount = milestoneAmounts[i]; });
    }

    // If amounts don't match budget, scale proportionally
    if (Math.abs(totalFromAI - budget) > 0.01) {
      console.warn(`[stream-creator] AI total (${totalFromAI}) != budget (${budget}) — scaling amounts`);
      const scale = budget / totalFromAI;
      milestoneAmounts = milestoneAmounts.map((a, i) => {
        if (i === milestoneAmounts.length - 1) {
          // Last milestone absorbs rounding difference
          const sumPrev = milestoneAmounts.slice(0, -1).reduce((s, v) => s + Math.round(v * scale * 100) / 100, 0);
          return Math.round((budget - sumPrev) * 100) / 100;
        }
        return Math.round(a * scale * 100) / 100;
      });
      milestones.forEach((m: any, i: number) => { m.amount = milestoneAmounts[i]; });
    }

    // Final safety check: every amount must be > 0
    if (milestoneAmounts.some(a => a <= 0)) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Invalid milestone amounts after adjustment: [${milestoneAmounts.join(', ')}]. Cannot create stream with zero-amount milestones.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    // ── Phase 2: On-Chain Stream Creation ──
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
