/**
 * A2A Client — Agent-to-Agent Hiring Utility
 *
 * Allows one agent to autonomously hire another agent through the
 * agent service. Each sub-task gets its own NexusV2 escrow on Tempo L1.
 *
 * Usage:
 *   const client = new A2AClient();
 *   const result = await client.hireAgent({
 *     targetAgentId: 'contract-auditor',
 *     prompt: 'Audit this contract...',
 *     parentJobId: job.jobId,
 *     parentAgentId: 'coordinator',
 *     a2aChainId: 'chain-xyz',
 *     depth: 1,
 *     budgetAllocation: 150,
 *   });
 */

import axios from 'axios';
import { ethers } from 'ethers';
import {
  getWallet, getProvider, getNexusV2, ensureApproval,
  explorerUrl, parseTokenAmount, CONTRACTS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from './utils/chain';
import { A2AJobRequest, A2AJobResult, JobResult } from './types';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';
const MAX_A2A_DEPTH = 5;

export interface A2AHireRequest {
  targetAgentId: string;
  prompt: string;
  payload?: Record<string, unknown>;
  parentJobId: string;
  parentAgentId: string;
  a2aChainId: string;
  depth: number;
  budgetAllocation: number;
  callerWallet?: string;
}

export interface A2AHireResult {
  jobId: string;
  agentId: string;
  status: 'success' | 'error';
  result?: unknown;
  error?: string;
  onChainJobId?: number;
  escrowTxHash?: string;
  settleTxHash?: string;
  executionTimeMs: number;
}

export class A2AClient {

  /**
   * Hire another agent to perform a sub-task.
   * Creates NexusV2 escrow → executes agent → settles escrow.
   */
  async hireAgent(req: A2AHireRequest): Promise<A2AHireResult> {
    const start = Date.now();

    // ── Guard: depth check ──
    if (req.depth >= MAX_A2A_DEPTH) {
      return {
        jobId: `a2a-${Date.now()}`,
        agentId: req.targetAgentId,
        status: 'error',
        error: `A2A depth limit exceeded (max ${MAX_A2A_DEPTH}). Preventing runaway chain.`,
        executionTimeMs: Date.now() - start,
      };
    }

    const jobId = `a2a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      // ── Step 1: Create NexusV2 escrow for this sub-task ──
      console.log(`[a2a-client] 🔗 ${req.parentAgentId} hiring ${req.targetAgentId} (depth ${req.depth}, budget $${req.budgetAllocation})`);

      const wallet = getWallet();
      const provider = getProvider();
      const nexus = getNexusV2();

      const amountWei = parseTokenAmount(req.budgetAllocation, DEFAULT_TOKEN.decimals);
      const deadlineSeconds = 86400; // 24h deadline for sub-tasks

      // Approve NexusV2
      await ensureApproval(DEFAULT_TOKEN.address, CONTRACTS.NEXUS_V2, amountWei);

      // Create escrow — worker is daemon wallet (since agents run under daemon)
      const nonce = await provider.getTransactionCount(wallet.address, 'pending');
      const tx = await nexus.createJob(
        wallet.address,      // Worker = daemon (same wallet, agents are co-located)
        wallet.address,      // Judge = daemon
        DEFAULT_TOKEN.address,
        amountWei,
        deadlineSeconds,
        { nonce, gasLimit: 5_000_000, type: 0 },
      );

      const receipt = await tx.wait(1);

      // Parse JobCreated event
      const iface = new ethers.Interface([
        'event JobCreated(uint256 indexed jobId, address indexed employer, address indexed worker, uint256 budget, uint256 deadline)',
      ]);
      let onChainJobId: number | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'JobCreated') {
            onChainJobId = Number(parsed.args.jobId);
            break;
          }
        } catch { /* skip */ }
      }

      console.log(`[a2a-client] ✅ Escrow created: Job #${onChainJobId} (${explorerUrl(receipt.hash)})`);

      // ── Step 2: Execute the child agent ──
      console.log(`[a2a-client] 🤖 Executing ${req.targetAgentId}...`);

      const agentResponse = await axios.post(
        `${AGENT_SERVICE_URL}/agents/${req.targetAgentId}/execute`,
        {
          jobId,
          prompt: req.prompt,
          payload: {
            ...req.payload,
            // A2A metadata for the child agent
            _a2a: {
              parentJobId: req.parentJobId,
              parentAgentId: req.parentAgentId,
              a2aChainId: req.a2aChainId,
              depth: req.depth + 1,
              onChainJobId,
            },
          },
          callerWallet: req.callerWallet || wallet.address,
        },
        { timeout: 120_000 }, // 2 min timeout
      );

      const agentResult: JobResult = agentResponse.data;

      // ── Step 3: Settle escrow if agent succeeded ──
      let settleTxHash: string | undefined;
      if (agentResult.status === 'success' && onChainJobId != null) {
        try {
          console.log(`[a2a-client] 💰 Settling escrow Job #${onChainJobId}...`);
          const settleNonce = await provider.getTransactionCount(wallet.address, 'pending');
          const settleTx = await nexus.settleJob(onChainJobId, {
            nonce: settleNonce, gasLimit: 5_000_000, type: 0,
          });
          const settleReceipt = await settleTx.wait(1);
          settleTxHash = settleReceipt.hash;
          console.log(`[a2a-client] ✅ Escrow settled: ${explorerUrl(settleReceipt.hash)}`);
        } catch (err: any) {
          console.warn(`[a2a-client] ⚠️ Escrow settlement failed: ${err.reason || err.message}`);
        }
      }

      return {
        jobId,
        agentId: req.targetAgentId,
        status: agentResult.status,
        result: agentResult.result,
        error: agentResult.error,
        onChainJobId,
        escrowTxHash: receipt.hash,
        settleTxHash,
        executionTimeMs: Date.now() - start,
      };

    } catch (err: any) {
      console.error(`[a2a-client] ❌ Failed to hire ${req.targetAgentId}:`, err.reason || err.message);
      return {
        jobId,
        agentId: req.targetAgentId,
        status: 'error',
        error: `A2A hire failed: ${err.reason || err.message}`,
        executionTimeMs: Date.now() - start,
      };
    }
  }
}
