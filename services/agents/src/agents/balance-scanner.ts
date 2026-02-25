/**
 * Balance Scanner Agent — On-chain portfolio analysis
 *
 * Scans wallet balances across all PayPol-supported tokens,
 * checks contract allowances, and provides a comprehensive
 * on-chain portfolio overview. Reads from Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getERC20, getBalance,
  explorerUrl, TOKENS, CONTRACTS, TEMPO_CHAIN_ID,
} from '../utils/chain';
import { getStreamV1 } from '../utils/stream-settlement';

export const manifest: AgentDescriptor = {
  id:           'balance-scanner',
  name:         'Balance Scanner',
  description:  'Comprehensive on-chain portfolio scanner. Reads wallet balances across all PayPol tokens (AlphaUSD, pathUSD, BetaUSD, ThetaUSD), checks contract states, and provides portfolio analytics. Reads real data from Tempo L1.',
  category:     'analytics',
  version:      '1.0.0',
  price:        2,
  capabilities: ['balance-check', 'portfolio-scan', 'multi-token', 'on-chain-read'],
};

const TOKEN_LIST = [
  { symbol: 'AlphaUSD', ...TOKENS.AlphaUSD },
  { symbol: 'pathUSD',  ...TOKENS.pathUSD  },
  { symbol: 'BetaUSD',  ...TOKENS.BetaUSD  },
  { symbol: 'ThetaUSD', ...TOKENS.ThetaUSD },
];

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  try {
    // Determine which wallet to scan
    let targetWallet: string;

    if (job.payload?.wallet && ethers.isAddress(job.payload.wallet as string)) {
      targetWallet = job.payload.wallet as string;
    } else if (job.callerWallet && ethers.isAddress(job.callerWallet)) {
      targetWallet = job.callerWallet;
    } else {
      // Default to daemon wallet
      targetWallet = getWallet().address;
    }

    console.log(`[balance-scanner] Scanning wallet: ${targetWallet}...`);

    const provider = getProvider();

    // ── Phase 1: Read native balance ──
    const nativeBalance = await provider.getBalance(targetWallet);
    const nativeFormatted = ethers.formatEther(nativeBalance);

    // ── Phase 2: Read all token balances ──
    const tokenBalances: any[] = [];
    let totalValueUSD = 0;

    for (const tokenInfo of TOKEN_LIST) {
      const token = getERC20(tokenInfo.address);
      const balance = await token.balanceOf(targetWallet);
      const formatted = ethers.formatUnits(balance, tokenInfo.decimals);
      const valueUSD = Number(formatted); // 1:1 stablecoins

      tokenBalances.push({
        symbol: tokenInfo.symbol,
        address: tokenInfo.address,
        balance: formatted,
        balanceWei: balance.toString(),
        decimals: tokenInfo.decimals,
        valueUSD: valueUSD.toFixed(2),
      });

      totalValueUSD += valueUSD;
    }

    // ── Phase 3: Check contract allowances ──
    const contractAllowances: any[] = [];
    const contractEntries = [
      { name: 'NexusV2',         address: CONTRACTS.NEXUS_V2 },
      { name: 'ShieldVaultV2',   address: CONTRACTS.SHIELD_VAULT_V2 },
      { name: 'MultisendVaultV2',address: CONTRACTS.MULTISEND_V2 },
      { name: 'StreamV1',        address: CONTRACTS.STREAM_V1 },
    ];

    // Check AlphaUSD allowances for all contracts
    const alphaToken = getERC20(TOKENS.AlphaUSD.address);
    for (const contract of contractEntries) {
      const allowance = await alphaToken.allowance(targetWallet, contract.address);
      const formatted = ethers.formatUnits(allowance, TOKENS.AlphaUSD.decimals);
      contractAllowances.push({
        contract: contract.name,
        address: contract.address,
        allowance: formatted,
        isApproved: allowance > 0n,
      });
    }

    // ── Phase 4: Get block info for context ──
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);

    console.log(`[balance-scanner] Scan complete — ${tokenBalances.length} tokens, $${totalValueUSD.toFixed(2)} total`);

    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: {
        phase: 'scan-complete',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        wallet: targetWallet,
        walletExplorerUrl: explorerUrl(targetWallet, 'address'),
        nativeBalance: {
          symbol: 'TEMPO',
          balance: nativeFormatted,
          balanceWei: nativeBalance.toString(),
        },
        tokenBalances,
        contractAllowances,
        portfolio: {
          totalTokenValueUSD: totalValueUSD.toFixed(2),
          tokenCount: tokenBalances.filter(t => Number(t.balance) > 0).length,
          approvedContracts: contractAllowances.filter(a => a.isApproved).length,
        },
        blockInfo: {
          blockNumber,
          timestamp: block?.timestamp ? new Date(block.timestamp * 1000).toISOString() : null,
        },
      },
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    } satisfies JobResult;

  } catch (err: any) {
    console.error(`[balance-scanner] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Balance scan failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
