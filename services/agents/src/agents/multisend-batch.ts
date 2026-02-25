/**
 * Multisend Batch Agent - Batch token transfers via MultisendVaultV2
 *
 * Execute batch payments to multiple recipients in a single transaction.
 * Deposits funds into MultisendV2 vault, then executes a public batch.
 * Real on-chain execution on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getMultisendV2, getERC20,
  ensureApproval, explorerUrl, parseTokenAmount, sendTx,
  CONTRACTS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'multisend-batch',
  name:         'Multisend Batch',
  description:  'Execute batch token transfers via MultisendVaultV2. Send payments to multiple recipients in a single on-chain transaction. Gas-efficient batch processing on Tempo L1.',
  category:     'payments',
  version:      '1.0.0',
  price:        8,
  capabilities: ['batch-transfer', 'multisend', 'gas-efficient', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Multisend Batch agent for MultisendVaultV2 on Tempo blockchain.
Parse the user's batch payment request into a list of recipients.

Return JSON:
{
  "recipients": [
    { "wallet": "0x...", "amount": 100, "label": "Alice" },
    { "wallet": "0x...", "amount": 200, "label": "Bob" }
  ],
  "tokenSymbol": "AlphaUSD",
  "memo": "Brief description of this batch"
}

RULES:
- Max 50 recipients per batch
- Each recipient needs a valid wallet address and amount
- Default token: AlphaUSD
- label is optional (for reference)
- Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  if (!job.prompt?.trim() && !job.payload?.recipients) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No batch payment request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    let recipients: { wallet: string; amount: number; label?: string }[];
    let memo: string;

    // Allow direct payload OR AI parsing
    if (job.payload?.recipients && Array.isArray(job.payload.recipients)) {
      recipients = job.payload.recipients as any;
      memo = (job.payload.memo as string) || 'Direct batch payment';
    } else {
      // ── Phase 1: AI Intent Parsing ──
      console.log(`[multisend-batch] Phase 1: Parsing batch payment intent...`);

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6', max_tokens: 2048,
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
          error: 'Failed to parse batch payment intent.',
          result: { rawResponse: rawText },
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      recipients = intent.recipients;
      memo = intent.memo || 'AI-parsed batch payment';
    }

    // Validate recipients
    if (!recipients || recipients.length === 0) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'No recipients provided for batch payment.',
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    if (recipients.length > 50) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Too many recipients: ${recipients.length}. Max 50 per batch.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    for (const r of recipients) {
      if (!ethers.isAddress(r.wallet)) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: `Invalid wallet address: ${r.wallet}`,
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }
    }

    // ── Phase 2: On-Chain Batch Execution ──
    const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);
    const totalWei = parseTokenAmount(totalAmount, DEFAULT_TOKEN.decimals);
    const multisend = getMultisendV2();
    const provider = getProvider();
    const wallet = getWallet();

    console.log(`[multisend-batch] Phase 2: Batch payment - ${recipients.length} recipients, ${totalAmount} AlphaUSD total...`);

    // Step 1: Approve MultisendV2
    const approvalTx = await ensureApproval(DEFAULT_TOKEN.address, CONTRACTS.MULTISEND_V2, totalWei);
    if (approvalTx) {
      console.log(`[multisend-batch] ERC20 approved: ${approvalTx}`);
    }

    // Step 2: Deposit into MultisendV2
    const nonceDep = await provider.getTransactionCount(wallet.address, 'pending');
    const txDep = await multisend.depositFunds(totalWei, {
      nonce: nonceDep, gasLimit: 5_000_000, type: 0,
    });
    const receiptDep = await txDep.wait(1);
    console.log(`[multisend-batch] Deposited: ${receiptDep.hash}`);

    // Step 3: Execute batch
    const wallets = recipients.map(r => r.wallet);
    const amounts = recipients.map(r => parseTokenAmount(r.amount, DEFAULT_TOKEN.decimals));
    const batchId = ethers.keccak256(ethers.toUtf8Bytes(`batch-${job.jobId}-${Date.now()}`));

    const nonceBatch = await provider.getTransactionCount(wallet.address, 'pending');
    const txBatch = await multisend.executePublicBatch(wallets, amounts, batchId, {
      nonce: nonceBatch, gasLimit: 5_000_000, type: 0,
    });
    const receiptBatch = await txBatch.wait(1);

    console.log(`[multisend-batch] Batch executed: ${receiptBatch.hash}`);

    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: {
        phase: 'batch-complete',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        batch: {
          batchId,
          recipientCount: recipients.length,
          totalAmount: `${totalAmount} AlphaUSD`,
          recipients: recipients.map(r => ({
            wallet: r.wallet,
            amount: `${r.amount} AlphaUSD`,
            label: r.label,
          })),
          memo,
        },
        transactions: {
          deposit: {
            hash: receiptDep.hash,
            blockNumber: receiptDep.blockNumber,
            gasUsed: receiptDep.gasUsed.toString(),
            explorerUrl: explorerUrl(receiptDep.hash),
          },
          batch: {
            hash: receiptBatch.hash,
            blockNumber: receiptBatch.blockNumber,
            gasUsed: receiptBatch.gasUsed.toString(),
            explorerUrl: explorerUrl(receiptBatch.hash),
          },
        },
        approvalTxHash: approvalTx,
      },
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    } satisfies JobResult;

  } catch (err: any) {
    console.error(`[multisend-batch] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Batch payment failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
