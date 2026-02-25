/**
 * Escrow Batch Settler Agent - Settle/refund multiple escrows at once
 *
 * Batch process multiple NexusV2 escrow jobs - settle or refund them
 * in a single operation. Real on-chain execution on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getNexusV2, sendTx, explorerUrl, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'escrow-batch-settler',
  name:         'Escrow Batch Settler',
  description:  'Batch settle or refund multiple NexusV2 escrow jobs at once. Process multiple job completions in a single operation. Real on-chain execution on Tempo L1.',
  category:     'escrow',
  version:      '1.0.0',
  price:        8,
  capabilities: ['batch-settle', 'batch-refund', 'multi-escrow', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Escrow Batch Settler. Parse the user's request to settle or refund multiple escrow jobs.

Return JSON:
{
  "action": "settle|refund",
  "jobIds": [1, 2, 3, 4, 5],
  "reasoning": "Why these jobs should be settled/refunded"
}

RULES:
- Max 20 jobs per batch
- action must be "settle" or "refund"
- jobIds must be an array of on-chain job IDs
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  if (!job.prompt?.trim() && !job.payload?.jobIds) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No batch settle request.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

  try {
    let action: string;
    let jobIds: number[];
    let reasoning: string;

    if (job.payload?.jobIds && Array.isArray(job.payload.jobIds)) {
      action = (job.payload.action as string) || 'settle';
      jobIds = job.payload.jobIds as number[];
      reasoning = (job.payload.reasoning as string) || 'Direct batch request';
    } else {
      console.log(`[escrow-batch-settler] Phase 1: Parsing batch intent...`);
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 512, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: job.prompt }] });
      const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
      let intent: any;
      try { const m = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText]; intent = JSON.parse(m[1]!.trim()); } catch { return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Failed to parse intent.', executionTimeMs: Date.now() - start, timestamp: Date.now() }; }
      action = intent.action;
      jobIds = intent.jobIds;
      reasoning = intent.reasoning;
    }

    if (!jobIds?.length) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No job IDs provided.', executionTimeMs: Date.now() - start, timestamp: Date.now() };
    if (jobIds.length > 20) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Max 20 jobs per batch.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

    const method = action === 'refund' ? 'refundJob' : 'settleJob';
    const nexus = getNexusV2();
    const results: any[] = [];
    let successCount = 0;

    console.log(`[escrow-batch-settler] Phase 2: ${action}ing ${jobIds.length} jobs...`);

    for (const id of jobIds) {
      try {
        const result = await sendTx(nexus, method, [id]);
        results.push({ jobId: id, status: 'success', action, transaction: { hash: result.txHash, blockNumber: result.blockNumber, gasUsed: result.gasUsed, explorerUrl: result.explorerUrl } });
        successCount++;
        console.log(`[escrow-batch-settler] Job #${id} ${action}d: ${result.txHash}`);
      } catch (err: any) {
        results.push({ jobId: id, status: 'failed', error: err.reason || err.message });
        console.log(`[escrow-batch-settler] Job #${id} failed: ${err.reason || err.message}`);
      }
    }

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: `batch-${action}-complete`, onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      action, totalRequested: jobIds.length, succeeded: successCount, failed: jobIds.length - successCount,
      results, reasoning,
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[escrow-batch-settler] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Batch settle failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
