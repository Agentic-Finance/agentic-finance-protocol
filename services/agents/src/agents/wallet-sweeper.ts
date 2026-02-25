/**
 * Wallet Sweeper Agent — Emergency token sweep to safe address
 *
 * Scans all supported token balances and transfers them to a specified
 * safe wallet address. Useful for emergency fund recovery or wallet migration.
 * Real on-chain execution on Tempo L1.
 */

import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getERC20, sendTx,
  explorerUrl, TOKENS, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'wallet-sweeper',
  name:         'Wallet Sweeper',
  description:  'Emergency token sweep — transfers all supported token balances to a safe wallet address. Scans AlphaUSD, pathUSD, BetaUSD, ThetaUSD and sweeps non-zero balances. Real on-chain execution on Tempo L1.',
  category:     'security',
  version:      '1.0.0',
  price:        5,
  capabilities: ['token-sweep', 'emergency-recovery', 'wallet-migration', 'on-chain-execution'],
};

const ALL_TOKENS = [
  { symbol: 'AlphaUSD', ...TOKENS.AlphaUSD },
  { symbol: 'pathUSD',  ...TOKENS.pathUSD },
  { symbol: 'BetaUSD',  ...TOKENS.BetaUSD },
  { symbol: 'ThetaUSD', ...TOKENS.ThetaUSD },
];

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  try {
    const safeWallet = job.payload?.safeWallet as string;
    if (!safeWallet || !ethers.isAddress(safeWallet)) {
      return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'payload.safeWallet (valid address) is required for sweep.', executionTimeMs: Date.now() - start, timestamp: Date.now() };
    }

    const wallet = getWallet();
    if (safeWallet.toLowerCase() === wallet.address.toLowerCase()) {
      return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Cannot sweep to the same wallet.', executionTimeMs: Date.now() - start, timestamp: Date.now() };
    }

    console.log(`[wallet-sweeper] Sweeping all tokens from ${wallet.address} → ${safeWallet}...`);

    const sweeps: any[] = [];
    let totalSweptUSD = 0;

    for (const tokenInfo of ALL_TOKENS) {
      const token = getERC20(tokenInfo.address);
      const balance: bigint = await token.balanceOf(wallet.address);

      if (balance === 0n) {
        sweeps.push({ token: tokenInfo.symbol, balance: '0', skipped: true, reason: 'Zero balance' });
        continue;
      }

      const formatted = ethers.formatUnits(balance, tokenInfo.decimals);
      console.log(`[wallet-sweeper] Sweeping ${formatted} ${tokenInfo.symbol}...`);

      const result = await sendTx(token, 'transfer', [safeWallet, balance]);
      sweeps.push({
        token: tokenInfo.symbol,
        amount: formatted,
        amountWei: balance.toString(),
        transaction: { hash: result.txHash, blockNumber: result.blockNumber, gasUsed: result.gasUsed, explorerUrl: result.explorerUrl },
      });
      totalSweptUSD += Number(formatted);
    }

    console.log(`[wallet-sweeper] Sweep complete — $${totalSweptUSD.toFixed(2)} total`);

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'sweep-complete', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      from: wallet.address, to: safeWallet,
      sweeps, totalSweptUSD: totalSweptUSD.toFixed(2),
      summary: { tokensSwept: sweeps.filter(s => !s.skipped).length, tokensSkipped: sweeps.filter(s => s.skipped).length },
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[wallet-sweeper] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Wallet sweep failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
