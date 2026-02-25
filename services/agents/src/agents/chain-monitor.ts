/**
 * Chain Monitor Agent - Tempo L1 health & activity monitoring
 *
 * Monitors chain health: block times, transaction throughput,
 * contract activity, and wallet transaction history.
 * Reads real on-chain data from Tempo L1.
 */

import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getNexusV2, getMultisendV2,
  explorerUrl, CONTRACTS, TEMPO_CHAIN_ID,
} from '../utils/chain';
import { getStreamV1 } from '../utils/stream-settlement';
import { getAIProofRegistry } from '../utils/ai-proof';

export const manifest: AgentDescriptor = {
  id:           'chain-monitor',
  name:         'Chain Monitor',
  description:  'Monitor Tempo L1 chain health and activity. Tracks block times, transaction throughput, contract activity counters, and provides network health diagnostics. Real on-chain monitoring.',
  category:     'analytics',
  version:      '1.0.0',
  price:        2,
  capabilities: ['chain-health', 'block-monitor', 'activity-tracking', 'on-chain-read'],
};

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  try {
    console.log(`[chain-monitor] Monitoring Tempo L1 chain health...`);
    const provider = getProvider();
    const wallet = getWallet();

    // Block info
    const latestBlock = await provider.getBlock('latest');
    const blockNumber = latestBlock!.number;
    const blockTimestamp = latestBlock!.timestamp;

    // Get previous blocks for timing analysis
    const blockTimes: number[] = [];
    let prevTimestamp = blockTimestamp;
    for (let i = 1; i <= 5; i++) {
      try {
        const block = await provider.getBlock(blockNumber - i);
        if (block) {
          blockTimes.push(prevTimestamp - block.timestamp);
          prevTimestamp = block.timestamp;
        }
      } catch { /* skip */ }
    }

    const avgBlockTime = blockTimes.length > 0 ? blockTimes.reduce((s, t) => s + t, 0) / blockTimes.length : 0;

    // Network info
    const network = await provider.getNetwork();
    const feeData = await provider.getFeeData();

    // Wallet tx count (nonce = total tx sent)
    const txCount = await provider.getTransactionCount(wallet.address);
    const pendingTxCount = await provider.getTransactionCount(wallet.address, 'pending');
    const pendingDiff = pendingTxCount - txCount;

    // Contract activity counters
    const nexus = getNexusV2();
    const nextJobId = Number(await nexus.nextJobId());

    const multisend = getMultisendV2();
    const batchCount = Number(await multisend.getBatchCount());

    const stream = getStreamV1();
    const streamCount = Number(await stream.streamCount());

    const registry = getAIProofRegistry();
    const totalCommitments = Number(await registry.totalCommitments());

    // Wallet native balance
    const nativeBalance = await provider.getBalance(wallet.address);

    console.log(`[chain-monitor] Block ${blockNumber}, avg block time ${avgBlockTime.toFixed(1)}s`);

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'chain-monitored', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      chain: {
        name: network.name,
        chainId: Number(network.chainId),
        latestBlock: blockNumber,
        blockTimestamp: new Date(blockTimestamp * 1000).toISOString(),
        avgBlockTime: `${avgBlockTime.toFixed(1)}s`,
        recentBlockTimes: blockTimes.map(t => `${t}s`),
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A',
      },
      wallet: {
        address: wallet.address,
        nativeBalance: ethers.formatEther(nativeBalance),
        totalTransactions: txCount,
        pendingTransactions: pendingDiff,
      },
      contractActivity: {
        nexusV2Jobs: nextJobId,
        multisendV2Batches: batchCount,
        streamV1Streams: streamCount,
        aiProofCommitments: totalCommitments,
        totalOnChainOperations: nextJobId + batchCount + streamCount + totalCommitments,
      },
      health: {
        chainResponsive: true,
        blockProduction: avgBlockTime < 10 ? 'HEALTHY' : avgBlockTime < 30 ? 'SLOW' : 'DEGRADED',
        pendingTxBacklog: pendingDiff === 0 ? 'CLEAR' : pendingDiff < 5 ? 'LOW' : 'HIGH',
      },
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[chain-monitor] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Chain monitoring failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
