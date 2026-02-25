/**
 * Gas Profiler Agent - Individual operation gas cost profiling
 *
 * Profiles gas cost of a single operation type on Tempo L1.
 * Useful for understanding the cost of specific contract interactions.
 * Real on-chain execution.
 */

import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getERC20, getNexusV2, ensureApproval,
  parseTokenAmount, explorerUrl,
  CONTRACTS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';
import { commitOnChain, generatePlanHash } from '../utils/ai-proof';

export const manifest: AgentDescriptor = {
  id:           'gas-profiler',
  name:         'Gas Profiler',
  description:  'Profile gas costs for specific PayPol operations. Tests individual contract interactions and measures actual gas consumption. Real on-chain profiling on Tempo L1.',
  category:     'analytics',
  version:      '1.0.0',
  price:        3,
  capabilities: ['gas-profiling', 'cost-analysis', 'benchmarking', 'on-chain-execution'],
};

type ProfileOperation = 'transfer' | 'approve' | 'escrow-create' | 'proof-commit' | 'all';

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  try {
    const operation: ProfileOperation = (job.payload?.operation as ProfileOperation) || 'all';
    const wallet = getWallet();
    const provider = getProvider();
    const profiles: any[] = [];

    console.log(`[gas-profiler] Profiling operation: ${operation}...`);

    const runProfile = async (name: string, fn: () => Promise<ethers.TransactionReceipt>) => {
      const opStart = Date.now();
      const receipt = await fn();
      const opTime = Date.now() - opStart;
      profiles.push({
        operation: name,
        gasUsed: Number(receipt.gasUsed),
        blockTime: opTime,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: explorerUrl(receipt.hash),
        tempoGasCost: '$0.00',
      });
      console.log(`[gas-profiler] ${name}: ${receipt.gasUsed} gas, ${opTime}ms`);
    };

    if (operation === 'transfer' || operation === 'all') {
      await runProfile('ERC20 Transfer (0.001 AlphaUSD)', async () => {
        const token = getERC20(DEFAULT_TOKEN.address);
        const nonce = await provider.getTransactionCount(wallet.address, 'pending');
        const tx = await token.transfer('0x0000000000000000000000000000000000000001', parseTokenAmount(0.001, DEFAULT_TOKEN.decimals), { nonce, gasLimit: 5_000_000, type: 0 });
        return await tx.wait(1);
      });
    }

    if (operation === 'approve' || operation === 'all') {
      await runProfile('ERC20 Approve (MaxUint256)', async () => {
        const token = getERC20(DEFAULT_TOKEN.address);
        const nonce = await provider.getTransactionCount(wallet.address, 'pending');
        const tx = await token.approve(CONTRACTS.NEXUS_V2, ethers.MaxUint256, { nonce, gasLimit: 5_000_000, type: 0 });
        return await tx.wait(1);
      });
    }

    if (operation === 'escrow-create' || operation === 'all') {
      await runProfile('NexusV2 createJob', async () => {
        await ensureApproval(DEFAULT_TOKEN.address, CONTRACTS.NEXUS_V2, parseTokenAmount(0.01, DEFAULT_TOKEN.decimals));
        const nexus = getNexusV2();
        const nonce = await provider.getTransactionCount(wallet.address, 'pending');
        const tx = await nexus.createJob(wallet.address, wallet.address, DEFAULT_TOKEN.address, parseTokenAmount(0.01, DEFAULT_TOKEN.decimals), 3600, { nonce, gasLimit: 5_000_000, type: 0 });
        return await tx.wait(1);
      });
    }

    if (operation === 'proof-commit' || operation === 'all') {
      await runProfile('AIProofRegistry commit', async () => {
        const hash = generatePlanHash(`gas-profile-${Date.now()}`);
        const registry = (await import('../utils/ai-proof')).getAIProofRegistry();
        const nonce = await provider.getTransactionCount(wallet.address, 'pending');
        const tx = await registry.commit(hash, 0, { nonce, gasLimit: 5_000_000, type: 0 });
        return await tx.wait(1);
      });
    }

    const totalGas = profiles.reduce((s, p) => s + p.gasUsed, 0);
    const avgBlockTime = profiles.reduce((s, p) => s + p.blockTime, 0) / profiles.length;

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'gas-profile-complete', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      profiles,
      summary: { operationsProfiled: profiles.length, totalGasUsed: totalGas, avgBlockTimeMs: Math.round(avgBlockTime), totalCostUSD: '$0.00 (Tempo is gas-free)' },
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[gas-profiler] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Gas profiling failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
