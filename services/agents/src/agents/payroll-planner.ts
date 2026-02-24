import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getMultisend, getERC20, ensureApproval,
  explorerUrl, parseTokenAmount, CONTRACTS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'payroll-planner',
  name:         'Payroll Planner',
  description:  'Optimizes batch payroll and EXECUTES real on-chain payments via MultisendVault on Tempo L1. Claude plans the batches, then ethers.js sends funds to all recipients in a single transaction.',
  category:     'payroll',
  version:      '2.0.0',
  price:        3,
  capabilities: ['batch-optimization', 'on-chain-batch-transfer', 'gas-estimation', 'csv-parsing'],
};

interface Employee {
  name:   string;
  wallet: string;
  amount: number;
  token?: string;
}

const PLANNING_PROMPT = `You are a blockchain payroll optimization expert.
Given an employee list, group payments into gas-efficient batches.

Return JSON:
{
  "batches": [
    {
      "batchId": "B-01",
      "recipients": [{ "name": "...", "wallet": "0x...", "amount": 100 }]
    }
  ],
  "totalAmount": 0,
  "totalRecipients": 0,
  "notes": ["..."]
}

RULES:
- Each batch should have max 50 recipients (gas limit safety)
- All wallets must be valid 0x... Ethereum addresses (42 chars)
- Remove any duplicates
- Sort by amount descending within each batch
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const employees = (job.payload?.employees as Employee[]) ?? [];
  const budget    = (job.payload?.budget    as number)      ?? 0;
  const execute   = (job.payload?.execute   as boolean)     ?? true; // Default: execute on-chain

  if (employees.length === 0) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No employee list provided. Pass payload.employees as an array of {name, wallet, amount}.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Optimization ────────────────────────────
    console.log(`[payroll-planner] 🧠 Phase 1: Claude optimizing ${employees.length} recipients...`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2048,
      system: PLANNING_PROMPT,
      messages: [{
        role: 'user',
        content: `Payroll: ${job.prompt}\nBudget: $${budget || 'unlimited'}\n\nEmployees:\n${JSON.stringify(employees, null, 2)}`,
      }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let plan: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      plan = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'Claude returned invalid JSON for payroll plan.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    // If execute=false, return plan only (preview mode)
    if (!execute) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: { phase: 'planned', onChain: false, plan },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;
    }

    // ── Phase 2: On-Chain Batch Execution ───────────────────
    console.log(`[payroll-planner] 🚀 Phase 2: Executing ${plan.batches?.length || 0} batches on Tempo...`);

    const multisend = getMultisend();
    const tokenAddress = DEFAULT_TOKEN.address;
    const tokenDecimals = DEFAULT_TOKEN.decimals;

    // Calculate total amount needed
    let totalWei = BigInt(0);
    for (const batch of plan.batches || []) {
      for (const r of batch.recipients || []) {
        totalWei += parseTokenAmount(r.amount, tokenDecimals);
      }
    }

    // Ensure ERC20 approval for MultisendVault
    console.log(`[payroll-planner] 💰 Total payroll: ${ethers.formatUnits(totalWei, tokenDecimals)} AlphaUSD`);
    const approvalTx = await ensureApproval(tokenAddress, CONTRACTS.MULTISEND, totalWei);
    if (approvalTx) {
      console.log(`[payroll-planner] ✅ ERC20 approved: ${approvalTx}`);
    }

    // Execute each batch
    const batchResults: any[] = [];
    const provider = getProvider();
    const wallet = getWallet();

    for (const batch of plan.batches || []) {
      const recipients: string[] = [];
      const amounts: bigint[] = [];

      for (const r of batch.recipients || []) {
        if (!ethers.isAddress(r.wallet)) {
          console.warn(`[payroll-planner] ⚠️ Invalid address: ${r.wallet}, skipping`);
          continue;
        }
        recipients.push(r.wallet);
        amounts.push(parseTokenAmount(r.amount, tokenDecimals));
      }

      if (recipients.length === 0) continue;

      // Generate unique batch ID
      const batchIdBytes = ethers.id(`payroll-${batch.batchId}-${Date.now()}`);

      const nonce = await provider.getTransactionCount(wallet.address, 'pending');

      console.log(`[payroll-planner] 📤 Sending batch ${batch.batchId}: ${recipients.length} recipients...`);

      const tx = await multisend.executePublicBatch(
        recipients,
        amounts,
        batchIdBytes,
        { nonce, gasLimit: 3_000_000, type: 0 },
      );

      const receipt = await tx.wait(1);

      batchResults.push({
        batchId: batch.batchId,
        recipients: recipients.length,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: explorerUrl(receipt.hash),
      });

      console.log(`[payroll-planner] ✅ Batch ${batch.batchId} confirmed: ${receipt.hash}`);
    }

    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: {
        phase: 'executed',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        plan,
        execution: {
          batchResults,
          totalBatches: batchResults.length,
          totalRecipients: batchResults.reduce((s, b) => s + b.recipients, 0),
          totalAmount: ethers.formatUnits(totalWei, tokenDecimals) + ' AlphaUSD',
          approvalTxHash: approvalTx,
        },
      },
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    } satisfies JobResult;

  } catch (err: any) {
    console.error(`[payroll-planner] ❌ Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Payroll execution failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
