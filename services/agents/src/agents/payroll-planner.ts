import { aiComplete } from '../ai-client';
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

const EXTRACT_PROMPT = `You are a PayPol Payroll agent. Extract employee payment data from the user's request.

Return JSON:
{
  "employees": [
    { "name": "Alice", "wallet": "0x...", "amount": 100 },
    { "name": "Bob", "wallet": "0x...", "amount": 200 }
  ],
  "notes": "Brief description of this payroll"
}

RULES:
- Each employee must have a valid 0x... Ethereum wallet address (42 chars)
- Each employee must have an amount > 0
- Name is optional (use "Recipient 1" if unknown)
- If no specific amounts given, distribute the budget evenly
- Return ONLY valid JSON.`;

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

  let employees = (job.payload?.employees as Employee[]) ?? [];
  const budget    = Number(job.payload?.budget) || 0;
  const execute   = (job.payload?.execute   as boolean)     ?? true; // Default: execute on-chain

  // If no employees in payload, try AI extraction from prompt
  if (employees.length === 0 && job.prompt?.trim()) {
    try {
      console.log(`[payroll-planner] Phase 0: Extracting employee data from prompt...`);
      const budgetHint = budget > 0 ? `\nTotal budget: ${budget} AlphaUSD` : '';
      const extractText = await aiComplete(EXTRACT_PROMPT, `${job.prompt}${budgetHint}`, { maxTokens: 2048 });
      const jsonMatch = extractText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, extractText];
      const parsed = JSON.parse(jsonMatch[1]!.trim());
      if (parsed.employees?.length > 0) {
        employees = parsed.employees;
        console.log(`[payroll-planner] Extracted ${employees.length} employees from prompt`);
      }
    } catch (extractErr: any) {
      console.warn(`[payroll-planner] Failed to extract employees from prompt:`, extractErr.message);
    }
  }

  if (employees.length === 0) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No employee list found. Include wallet addresses and amounts in your request, or pass payload.employees.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Optimization ────────────────────────────
    console.log(`[payroll-planner] Phase 1: AI optimizing ${employees.length} recipients...`);

    const rawText = await aiComplete(PLANNING_PROMPT, `Payroll: ${job.prompt}\nBudget: $${budget || 'unlimited'}\n\nEmployees:\n${JSON.stringify(employees, null, 2)}`, { maxTokens: 2048 });
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
