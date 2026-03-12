/**
 * Recurring Payment Agent - Create multiple streams for recurring payments
 *
 * Sets up recurring payment schedules by creating multiple payment streams,
 * each representing a payment period. Each stream has single milestones.
 * Real on-chain execution on Tempo L1.
 */

import { aiComplete } from '../ai-client';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, explorerUrl, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';
import { createStreamOnChain } from '../utils/stream-settlement';

export const manifest: AgentDescriptor = {
  id:           'recurring-payment',
  name:         'Recurring Payment',
  description:  'Set up recurring payment schedules using multiple StreamV1 streams. Each stream represents a payment period with automatic milestone-based release. Real on-chain execution on Tempo L1.',
  category:     'payments',
  version:      '1.0.0',
  price:        12,
  capabilities: ['recurring-payment', 'scheduled-streams', 'payroll-schedule', 'on-chain-execution'],
};

/**
 * Build system prompt with budget context so the AI knows how much to allocate.
 */
function buildSystemPrompt(budget: number): string {
  const budgetLine = budget > 0
    ? `\nTOTAL BUDGET: ${budget} AlphaUSD — You MUST distribute this across the periods so amountPerPeriod * periods = ${budget}.`
    : '';
  return `You are a PayPol Recurring Payment agent. Set up a series of payment streams for recurring payments.
${budgetLine}
Return JSON:
{
  "recipient": "0x...",
  "amountPerPeriod": 100,
  "periods": 4,
  "periodDurationHours": 168,
  "tokenSymbol": "AlphaUSD",
  "description": "Monthly payment for developer work"
}

RULES:
- Max 6 periods (streams)
- Each period becomes one stream with a single milestone
- amountPerPeriod MUST be greater than 0${budget > 0 ? `\n- amountPerPeriod * periods MUST equal exactly ${budget}` : ''}
- periodDurationHours is the deadline for each payment (default: 168 = 1 week)
- Default token: AlphaUSD
Return ONLY valid JSON.`;
}

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  if (!job.prompt?.trim()) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No recurring payment request.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

  try {
    // Extract budget from payload (forwarded by index.ts from dashboard)
    const budget = Number(job.payload?.budget) || 0;

    console.log(`[recurring-payment] Phase 1: Parsing recurring payment intent... (budget: ${budget} AlphaUSD)`);
    // Build user message with budget context
    const userMessage = budget > 0
      ? `${job.prompt}\nBudget: ${budget} AlphaUSD`
      : job.prompt;

    const rawText = await aiComplete(buildSystemPrompt(budget), userMessage, { maxTokens: 512 });
    let intent: any;
    try { const m = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText]; intent = JSON.parse(m[1]!.trim()); } catch { return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Failed to parse intent.', executionTimeMs: Date.now() - start, timestamp: Date.now() }; }

    let { recipient, amountPerPeriod, periods, periodDurationHours, description } = intent;
    if (!ethers.isAddress(recipient)) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Invalid recipient: ${recipient}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
    if (!periods || periods < 1 || periods > 6) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Invalid periods: ${periods}. Max 6.`, executionTimeMs: Date.now() - start, timestamp: Date.now() };

    // ── Validate & Fix amountPerPeriod ──
    amountPerPeriod = Number(amountPerPeriod) || 0;

    // If AI returned 0 but we have a budget, auto-calculate
    if (amountPerPeriod <= 0 && budget > 0) {
      amountPerPeriod = Math.round((budget / periods) * 100) / 100;
      console.warn(`[recurring-payment] AI returned amountPerPeriod=0 — auto-calculated ${amountPerPeriod} from budget ${budget}/${periods}`);
    }

    // If total doesn't match budget, adjust amountPerPeriod
    if (budget > 0 && Math.abs(amountPerPeriod * periods - budget) > 0.01) {
      amountPerPeriod = Math.round((budget / periods) * 100) / 100;
      console.warn(`[recurring-payment] Adjusted amountPerPeriod to ${amountPerPeriod} to match budget ${budget}`);
    }

    // Final safety: amountPerPeriod must be > 0
    if (amountPerPeriod <= 0) {
      return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Invalid amountPerPeriod: ${amountPerPeriod}. Must be > 0. Provide a budget in your request.`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
    }

    const durationHours = periodDurationHours || 168;
    const durationSeconds = durationHours * 3600;
    const totalBudget = Math.round(amountPerPeriod * periods * 100) / 100;

    console.log(`[recurring-payment] Phase 2: Creating ${periods} recurring streams...`);
    const streams: any[] = [];

    for (let i = 0; i < periods; i++) {
      const result = await createStreamOnChain(
        recipient,
        DEFAULT_TOKEN.address,
        [amountPerPeriod],
        durationSeconds,
        DEFAULT_TOKEN.decimals,
      );
      streams.push({
        period: i + 1,
        streamId: result.streamId,
        amount: `${amountPerPeriod} AlphaUSD`,
        deadline: `${durationHours}h from creation`,
        transaction: { hash: result.txHash, explorerUrl: result.explorerUrl },
      });
      console.log(`[recurring-payment] Stream #${result.streamId} (period ${i + 1}/${periods}): ${result.txHash}`);
    }

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'recurring-setup-complete', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      schedule: { recipient, amountPerPeriod: `${amountPerPeriod} AlphaUSD`, periods, periodDuration: `${durationHours}h`, totalBudget: `${totalBudget} AlphaUSD`, description },
      streams, totalStreamsCreated: streams.length,
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[recurring-payment] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Recurring payment failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
