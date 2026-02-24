import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getNexusV2, getERC20, ensureApproval,
  explorerUrl, parseTokenAmount, sendTx,
  CONTRACTS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'escrow-manager',
  name:         'Escrow Manager',
  description:  'Creates and manages NexusV2 escrow jobs on Tempo L1. Locks funds trustlessly, supports full lifecycle: create → start → complete → settle. Real on-chain execution with tx hashes.',
  category:     'escrow',
  version:      '1.0.0',
  price:        5,
  capabilities: ['create-escrow', 'settle-escrow', 'refund-escrow', 'dispute', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Escrow Manager for the NexusV2 smart contract on Tempo blockchain.
Analyze the user's request and determine the escrow parameters.

Return JSON:
{
  "action": "create|settle|refund|dispute|status",
  "summary": "What this escrow is for",
  "params": {
    "workerWallet": "0x...",
    "tokenSymbol": "AlphaUSD",
    "amount": 100,
    "deadlineHours": 48,
    "jobId": null
  },
  "reasoning": "Why these parameters make sense"
}

RULES:
- For "create": workerWallet, amount, deadlineHours are required
- For "settle", "refund", "dispute", "status": jobId is required
- Default deadline: 48 hours
- Default token: AlphaUSD
- Judge is always the daemon wallet (agent executor)
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const prompt = job.prompt;

  if (!prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No escrow request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Intent Parsing ──────────────────────────
    console.log(`[escrow-manager] 🧠 Phase 1: Parsing escrow intent...`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let intent: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      intent = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'Claude returned invalid JSON for escrow intent.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const action = intent.action;
    const params = intent.params || {};
    const nexus = getNexusV2();
    const wallet = getWallet();
    const provider = getProvider();

    // ── Phase 2: On-Chain Execution ─────────────────────────

    if (action === 'create') {
      // Create new escrow job
      const workerWallet = params.workerWallet;
      const amount = params.amount || 100;
      const deadlineHours = params.deadlineHours || 48;
      const tokenAddress = DEFAULT_TOKEN.address;
      const tokenDecimals = DEFAULT_TOKEN.decimals;

      if (!ethers.isAddress(workerWallet)) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: `Invalid worker wallet: ${workerWallet}`,
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      const amountWei = parseTokenAmount(amount, tokenDecimals);
      const deadlineSeconds = deadlineHours * 3600;

      console.log(`[escrow-manager] 🚀 Creating escrow: ${amount} AlphaUSD → ${workerWallet}, deadline: ${deadlineHours}h`);

      // Step 1: Approve NexusV2 to spend tokens
      const approvalTx = await ensureApproval(tokenAddress, CONTRACTS.NEXUS_V2, amountWei);
      if (approvalTx) {
        console.log(`[escrow-manager] ✅ ERC20 approved: ${approvalTx}`);
      }

      // Step 2: Create job
      const nonce = await provider.getTransactionCount(wallet.address, 'pending');
      const tx = await nexus.createJob(
        workerWallet,
        wallet.address,  // Judge = daemon wallet
        tokenAddress,
        amountWei,
        deadlineSeconds,
        { nonce, gasLimit: 5_000_000, type: 0 },
      );

      console.log(`[escrow-manager] ⏳ TX sent: ${tx.hash}`);
      const receipt = await tx.wait(1);

      // Parse JobCreated event to get jobId
      const iface = new ethers.Interface(CONTRACTS.NEXUS_V2 ? [
        'event JobCreated(uint256 indexed jobId, address indexed employer, address indexed worker, uint256 budget, uint256 deadline)',
      ] : []);
      let onChainJobId: string | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'JobCreated') {
            onChainJobId = parsed.args.jobId.toString();
            break;
          }
        } catch { /* skip non-matching logs */ }
      }

      console.log(`[escrow-manager] ✅ Escrow created! Job ID: ${onChainJobId}`);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'escrow-created',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          escrow: {
            onChainJobId,
            employer: wallet.address,
            worker: workerWallet,
            judge: wallet.address,
            amount: `${amount} AlphaUSD`,
            amountWei: amountWei.toString(),
            deadlineHours,
            status: 'Created',
          },
          transaction: {
            hash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            explorerUrl: explorerUrl(receipt.hash),
          },
          approvalTxHash: approvalTx,
          summary: intent.summary,
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'settle') {
      // Settle an existing job
      const onChainJobId = params.jobId;
      if (onChainJobId == null) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: 'jobId is required for settlement.',
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      console.log(`[escrow-manager] 💰 Settling job #${onChainJobId}...`);
      const result = await sendTx(nexus, 'settleJob', [onChainJobId]);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'escrow-settled',
          onChain: true,
          onChainJobId,
          transaction: result,
          summary: intent.summary,
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'refund') {
      const onChainJobId = params.jobId;
      if (onChainJobId == null) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: 'jobId is required for refund.',
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      console.log(`[escrow-manager] 🔄 Refunding job #${onChainJobId}...`);
      const result = await sendTx(nexus, 'refundJob', [onChainJobId]);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'escrow-refunded',
          onChain: true,
          onChainJobId,
          transaction: result,
          summary: intent.summary,
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'status') {
      const onChainJobId = params.jobId;
      if (onChainJobId == null) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: 'jobId is required for status check.',
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      console.log(`[escrow-manager] 🔍 Checking job #${onChainJobId}...`);
      const jobData = await nexus.getJob(onChainJobId);
      const statusNames = ['Created', 'Executing', 'Completed', 'Disputed', 'Settled', 'Refunded'];

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'status-check',
          onChain: true,
          onChainJobId,
          jobDetails: {
            employer: jobData.employer,
            worker: jobData.worker,
            judge: jobData.judge,
            token: jobData.token,
            budget: ethers.formatUnits(jobData.budget, DEFAULT_TOKEN.decimals),
            platformFee: ethers.formatUnits(jobData.platformFee, DEFAULT_TOKEN.decimals),
            deadline: new Date(Number(jobData.deadline) * 1000).toISOString(),
            status: statusNames[Number(jobData.status)] || 'Unknown',
            rated: jobData.rated,
          },
          summary: intent.summary,
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Unknown escrow action: ${action}. Supported: create, settle, refund, dispute, status.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

  } catch (err: any) {
    console.error(`[escrow-manager] ❌ Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Escrow operation failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
