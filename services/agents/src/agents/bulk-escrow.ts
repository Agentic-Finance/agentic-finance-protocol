/**
 * Bulk Escrow Agent - Create multiple NexusV2 escrow jobs at once
 *
 * Batch-create escrow jobs for hiring multiple workers simultaneously.
 * Each job gets its own on-chain escrow with independent lifecycle.
 * Real on-chain execution on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getNexusV2, ensureApproval,
  explorerUrl, parseTokenAmount, CONTRACTS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'bulk-escrow',
  name:         'Bulk Escrow',
  description:  'Create multiple NexusV2 escrow jobs in one operation. Batch-hire workers with independent escrows for each. Real on-chain execution on Tempo L1.',
  category:     'escrow',
  version:      '1.0.0',
  price:        10,
  capabilities: ['bulk-create-escrow', 'batch-hiring', 'multi-job', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Bulk Escrow agent. Parse the user's request into multiple escrow job specifications.

Return JSON:
{
  "jobs": [
    { "workerWallet": "0x...", "amount": 100, "description": "Task description", "deadlineHours": 48 },
    { "workerWallet": "0x...", "amount": 200, "description": "Another task", "deadlineHours": 72 }
  ],
  "memo": "Brief description of this bulk hire"
}

RULES:
- Max 10 jobs per batch
- Each job needs workerWallet, amount, description
- Default deadline: 48 hours
- Default token: AlphaUSD
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  if (!job.prompt?.trim()) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No bulk escrow request.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

  try {
    console.log(`[bulk-escrow] Phase 1: Parsing bulk escrow intent...`);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 2048, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: job.prompt }] });
    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let intent: any;
    try { const m = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText]; intent = JSON.parse(m[1]!.trim()); } catch { return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Failed to parse bulk escrow intent.', executionTimeMs: Date.now() - start, timestamp: Date.now() }; }

    const jobs = intent.jobs;
    if (!jobs?.length) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No jobs specified.', executionTimeMs: Date.now() - start, timestamp: Date.now() };
    if (jobs.length > 10) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Max 10 jobs per batch.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

    const totalAmount = jobs.reduce((s: number, j: any) => s + (j.amount || 0), 0);
    const totalWei = parseTokenAmount(totalAmount, DEFAULT_TOKEN.decimals);

    // Approve total amount
    console.log(`[bulk-escrow] Phase 2: Creating ${jobs.length} escrow jobs, total ${totalAmount} AlphaUSD...`);
    await ensureApproval(DEFAULT_TOKEN.address, CONTRACTS.NEXUS_V2, totalWei);

    const nexus = getNexusV2();
    const wallet = getWallet();
    const provider = getProvider();
    const results: any[] = [];

    const iface = new ethers.Interface(['event JobCreated(uint256 indexed jobId, address indexed employer, address indexed worker, uint256 budget, uint256 deadline)']);

    for (const j of jobs) {
      if (!ethers.isAddress(j.workerWallet)) { results.push({ worker: j.workerWallet, error: 'Invalid address' }); continue; }
      const amountWei = parseTokenAmount(j.amount, DEFAULT_TOKEN.decimals);
      const deadline = (j.deadlineHours || 48) * 3600;
      const nonce = await provider.getTransactionCount(wallet.address, 'pending');
      const tx = await nexus.createJob(j.workerWallet, wallet.address, DEFAULT_TOKEN.address, amountWei, deadline, { nonce, gasLimit: 5_000_000, type: 0 });
      const receipt = await tx.wait(1);

      let onChainJobId: string | null = null;
      for (const log of receipt.logs) { try { const p = iface.parseLog({ topics: log.topics as string[], data: log.data }); if (p?.name === 'JobCreated') { onChainJobId = p.args.jobId.toString(); break; } } catch {} }

      results.push({ onChainJobId, worker: j.workerWallet, amount: `${j.amount} AlphaUSD`, description: j.description, deadline: `${j.deadlineHours || 48}h`, transaction: { hash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString(), explorerUrl: explorerUrl(receipt.hash) } });
      console.log(`[bulk-escrow] Job #${onChainJobId} created: ${j.amount} AlphaUSD → ${j.workerWallet}`);
    }

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'bulk-escrow-complete', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      totalJobs: results.length, totalBudget: `${totalAmount} AlphaUSD`, escrows: results, memo: intent.memo,
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[bulk-escrow] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Bulk escrow failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
