/**
 * Fee Collector Agent — Platform fee withdrawal from PayPol contracts
 *
 * Collects accumulated platform fees from NexusV2, MultisendV2,
 * and StreamV1 contracts. Admin-only operation.
 * Real on-chain execution on Tempo L1.
 */

import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getNexusV2, getMultisendV2, getERC20,
  sendTx, explorerUrl, CONTRACTS, DEFAULT_TOKEN, TOKENS, TEMPO_CHAIN_ID,
} from '../utils/chain';
import { getStreamV1 } from '../utils/stream-settlement';

export const manifest: AgentDescriptor = {
  id:           'fee-collector',
  name:         'Fee Collector',
  description:  'Collects accumulated platform fees from PayPol smart contracts (NexusV2, MultisendV2, StreamV1). Admin operation that withdraws protocol revenue. Real on-chain execution on Tempo L1.',
  category:     'admin',
  version:      '1.0.0',
  price:        3,
  capabilities: ['withdraw-fees', 'revenue-collection', 'admin', 'on-chain-execution'],
};

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  try {
    const wallet = getWallet();
    const provider = getProvider();
    const tokenAddress = DEFAULT_TOKEN.address;
    const tokenDecimals = DEFAULT_TOKEN.decimals;

    console.log(`[fee-collector] Collecting platform fees from all contracts...`);

    const collections: any[] = [];
    const errors: string[] = [];

    // ── Collect from NexusV2 ──
    try {
      console.log(`[fee-collector] Checking NexusV2 fees...`);
      const nexus = getNexusV2();

      // Try to get accumulated fees (read the contract balance as proxy)
      const nexusToken = getERC20(tokenAddress);
      const nexusBalance = await nexusToken.balanceOf(CONTRACTS.NEXUS_V2);
      const nexusFormatted = ethers.formatUnits(nexusBalance, tokenDecimals);

      if (nexusBalance > 0n) {
        try {
          const result = await sendTx(nexus, 'withdrawFees', [tokenAddress]);
          collections.push({
            contract: 'NexusV2 (Escrow)',
            address: CONTRACTS.NEXUS_V2,
            amount: nexusFormatted,
            amountWei: nexusBalance.toString(),
            transaction: {
              hash: result.txHash,
              blockNumber: result.blockNumber,
              gasUsed: result.gasUsed,
              explorerUrl: result.explorerUrl,
            },
          });
          console.log(`[fee-collector] NexusV2: Collected ${nexusFormatted} AlphaUSD`);
        } catch (e: any) {
          errors.push(`NexusV2: ${e.reason || e.message}`);
        }
      } else {
        collections.push({
          contract: 'NexusV2 (Escrow)',
          address: CONTRACTS.NEXUS_V2,
          amount: '0',
          skipped: true,
          reason: 'No fees to collect',
        });
      }
    } catch (e: any) {
      errors.push(`NexusV2 read: ${e.reason || e.message}`);
    }

    // ── Collect from StreamV1 ──
    try {
      console.log(`[fee-collector] Checking StreamV1 fees...`);
      const stream = getStreamV1();

      const streamToken = getERC20(tokenAddress);
      const streamBalance = await streamToken.balanceOf(CONTRACTS.STREAM_V1);
      const streamFormatted = ethers.formatUnits(streamBalance, tokenDecimals);

      if (streamBalance > 0n) {
        try {
          const result = await sendTx(stream, 'withdrawFees', [tokenAddress]);
          collections.push({
            contract: 'StreamV1',
            address: CONTRACTS.STREAM_V1,
            amount: streamFormatted,
            amountWei: streamBalance.toString(),
            transaction: {
              hash: result.txHash,
              blockNumber: result.blockNumber,
              gasUsed: result.gasUsed,
              explorerUrl: result.explorerUrl,
            },
          });
          console.log(`[fee-collector] StreamV1: Collected ${streamFormatted} AlphaUSD`);
        } catch (e: any) {
          errors.push(`StreamV1: ${e.reason || e.message}`);
        }
      } else {
        collections.push({
          contract: 'StreamV1',
          address: CONTRACTS.STREAM_V1,
          amount: '0',
          skipped: true,
          reason: 'No fees to collect',
        });
      }
    } catch (e: any) {
      errors.push(`StreamV1 read: ${e.reason || e.message}`);
    }

    // ── Collect from MultisendV2 ──
    try {
      console.log(`[fee-collector] Checking MultisendV2 fees...`);
      const multisend = getMultisendV2();

      const msToken = getERC20(tokenAddress);
      const msBalance = await msToken.balanceOf(CONTRACTS.MULTISEND_V2);
      const msFormatted = ethers.formatUnits(msBalance, tokenDecimals);

      if (msBalance > 0n) {
        try {
          const result = await sendTx(multisend, 'withdrawFees', [tokenAddress]);
          collections.push({
            contract: 'MultisendVaultV2',
            address: CONTRACTS.MULTISEND_V2,
            amount: msFormatted,
            amountWei: msBalance.toString(),
            transaction: {
              hash: result.txHash,
              blockNumber: result.blockNumber,
              gasUsed: result.gasUsed,
              explorerUrl: result.explorerUrl,
            },
          });
          console.log(`[fee-collector] MultisendV2: Collected ${msFormatted} AlphaUSD`);
        } catch (e: any) {
          errors.push(`MultisendV2: ${e.reason || e.message}`);
        }
      } else {
        collections.push({
          contract: 'MultisendVaultV2',
          address: CONTRACTS.MULTISEND_V2,
          amount: '0',
          skipped: true,
          reason: 'No fees to collect',
        });
      }
    } catch (e: any) {
      errors.push(`MultisendV2 read: ${e.reason || e.message}`);
    }

    const totalCollected = collections
      .filter(c => !c.skipped)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    console.log(`[fee-collector] Done! Total collected: ${totalCollected} AlphaUSD from ${collections.filter(c => !c.skipped).length} contracts`);

    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: {
        phase: 'fees-collected',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        collector: wallet.address,
        collections,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalCollected: `${totalCollected} AlphaUSD`,
          contractsCollected: collections.filter(c => !c.skipped).length,
          contractsSkipped: collections.filter(c => c.skipped).length,
        },
      },
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    } satisfies JobResult;

  } catch (err: any) {
    console.error(`[fee-collector] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Fee collection failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
