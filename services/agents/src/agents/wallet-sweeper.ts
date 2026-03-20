/**
 * Wallet Sweeper Agent - Emergency token sweep to safe address
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
  description:  'Emergency token sweep - transfers all supported token balances to a safe wallet address. Scans AlphaUSD, pathUSD, BetaUSD, ThetaUSD and sweeps non-zero balances. Real on-chain execution on Tempo L1.',
  category:     'security',
  version:      '1.0.0',
  price:        5,
  capabilities: ['emergency-sweep', 'asset-recovery', 'post-incident-reports', 'security-documentation', 'emergency-alerts', 'on-chain-execution'],
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
    // Resolve safe wallet: payload > prompt extraction > callerWallet
    let safeWallet = job.payload?.safeWallet as string | undefined;

    if (!safeWallet || !ethers.isAddress(safeWallet)) {
      // Try to extract a wallet address from the prompt
      const addrMatch = (job.prompt || '').match(/0x[a-fA-F0-9]{40}/);
      if (addrMatch && ethers.isAddress(addrMatch[0])) {
        safeWallet = addrMatch[0];
        console.log(`[wallet-sweeper] Extracted safeWallet from prompt: ${safeWallet}`);
      } else if (job.callerWallet && ethers.isAddress(job.callerWallet)) {
        // Fallback: sweep to the caller's wallet
        safeWallet = job.callerWallet;
        console.log(`[wallet-sweeper] Using callerWallet as safeWallet: ${safeWallet}`);
      } else {
        return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No valid safe wallet found. Provide a wallet address in your prompt or payload.safeWallet.', executionTimeMs: Date.now() - start, timestamp: Date.now() };
      }
    }

    const wallet = getWallet();
    if (safeWallet.toLowerCase() === wallet.address.toLowerCase()) {
      return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Cannot sweep to the same wallet.', executionTimeMs: Date.now() - start, timestamp: Date.now() };
    }

    console.log(`[wallet-sweeper] Sweeping all tokens from ${wallet.address} → ${safeWallet}...`);

    const sweeps: any[] = [];
    let totalSweptUSD = 0;

    // TIP-20 precompile tokens on Tempo charge an additional fee on transfers.
    // When sweeping full balance, we must leave a buffer for this fee or the tx reverts.
    // Fee is ~500 units (0.0005 with 6 decimals) per transfer.
    const TIP20_FEE_BUFFER = 10_000n; // 0.01 AlphaUSD buffer — generous for safety

    for (const tokenInfo of ALL_TOKENS) {
      const token = getERC20(tokenInfo.address);
      const balance: bigint = await token.balanceOf(wallet.address);

      if (balance === 0n) {
        sweeps.push({ token: tokenInfo.symbol, balance: '0', skipped: true, reason: 'Zero balance' });
        continue;
      }

      // Subtract TIP-20 fee buffer to avoid "amount + fee > balance" revert
      const sweepAmount = balance > TIP20_FEE_BUFFER ? balance - TIP20_FEE_BUFFER : 0n;
      if (sweepAmount === 0n) {
        sweeps.push({ token: tokenInfo.symbol, balance: ethers.formatUnits(balance, tokenInfo.decimals), skipped: true, reason: 'Balance too low (below fee buffer)' });
        continue;
      }

      const formatted = ethers.formatUnits(sweepAmount, tokenInfo.decimals);
      console.log(`[wallet-sweeper] Sweeping ${formatted} ${tokenInfo.symbol} (balance: ${ethers.formatUnits(balance, tokenInfo.decimals)})...`);

      try {
        const result = await sendTx(token, 'transfer', [safeWallet, sweepAmount]);
        sweeps.push({
          token: tokenInfo.symbol,
          amount: formatted,
          amountWei: sweepAmount.toString(),
          transaction: { hash: result.txHash, blockNumber: result.blockNumber, gasUsed: result.gasUsed, explorerUrl: result.explorerUrl },
        });
        totalSweptUSD += Number(formatted);
      } catch (txErr: any) {
        console.warn(`[wallet-sweeper] Failed to sweep ${tokenInfo.symbol}:`, txErr.reason || txErr.message);
        sweeps.push({ token: tokenInfo.symbol, balance: formatted, skipped: true, reason: `Transfer failed: ${txErr.reason || txErr.message}` });
      }
    }

    console.log(`[wallet-sweeper] Sweep complete - $${totalSweptUSD.toFixed(2)} total`);

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
