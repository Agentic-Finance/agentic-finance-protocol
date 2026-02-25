/**
 * Vault Inspector Agent — ShieldVaultV2 state inspection
 *
 * Inspect ShieldVaultV2 deposit states, commitment registrations,
 * nullifier usage, and payout history. Deep on-chain analysis.
 * Reads real data from Tempo L1.
 */

import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getShieldVaultV2, getERC20,
  explorerUrl, CONTRACTS, TOKENS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'vault-inspector',
  name:         'Vault Inspector',
  description:  'Inspect ShieldVaultV2 on-chain state. Check deposit balances, commitment registrations, nullifier usage, and vault holdings. Deep privacy vault analysis on Tempo L1.',
  category:     'privacy',
  version:      '1.0.0',
  price:        2,
  capabilities: ['vault-inspection', 'commitment-check', 'nullifier-check', 'on-chain-read'],
};

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  try {
    console.log(`[vault-inspector] Inspecting ShieldVaultV2...`);
    const vault = getShieldVaultV2();
    const wallet = getWallet();
    const provider = getProvider();

    // Check vault's total token holdings across all tokens
    const tokenHoldings: any[] = [];
    const allTokens = [
      { symbol: 'AlphaUSD', ...TOKENS.AlphaUSD },
      { symbol: 'pathUSD',  ...TOKENS.pathUSD },
      { symbol: 'BetaUSD',  ...TOKENS.BetaUSD },
      { symbol: 'ThetaUSD', ...TOKENS.ThetaUSD },
    ];

    let totalVaultUSD = 0;
    for (const t of allTokens) {
      const token = getERC20(t.address);
      const balance = await token.balanceOf(CONTRACTS.SHIELD_VAULT_V2);
      const formatted = Number(ethers.formatUnits(balance, t.decimals));
      tokenHoldings.push({ symbol: t.symbol, balance: formatted.toFixed(2), address: t.address });
      totalVaultUSD += formatted;
    }

    // Check specific commitments if provided
    const commitmentChecks: any[] = [];
    if (job.payload?.commitments && Array.isArray(job.payload.commitments)) {
      for (const commitment of job.payload.commitments as string[]) {
        try {
          const isRegistered = await vault.isCommitmentRegistered(commitment);
          let amount = '0';
          if (isRegistered) {
            const amountWei = await vault.getCommitmentAmount(commitment);
            amount = ethers.formatUnits(amountWei, DEFAULT_TOKEN.decimals);
          }
          commitmentChecks.push({ commitment, isRegistered, amount });
        } catch { commitmentChecks.push({ commitment, error: 'Failed to check' }); }
      }
    }

    // Check nullifiers if provided
    const nullifierChecks: any[] = [];
    if (job.payload?.nullifiers && Array.isArray(job.payload.nullifiers)) {
      for (const nullifier of job.payload.nullifiers as string[]) {
        try {
          const isUsed = await vault.isNullifierUsed(nullifier);
          nullifierChecks.push({ nullifier, isUsed, status: isUsed ? 'SPENT' : 'UNSPENT' });
        } catch { nullifierChecks.push({ nullifier, error: 'Failed to check' }); }
      }
    }

    const blockNumber = await provider.getBlockNumber();

    console.log(`[vault-inspector] Vault holds $${totalVaultUSD.toFixed(2)} total`);

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'vault-inspected', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      vault: { address: CONTRACTS.SHIELD_VAULT_V2, explorerUrl: explorerUrl(CONTRACTS.SHIELD_VAULT_V2, 'address') },
      holdings: { tokens: tokenHoldings, totalUSD: totalVaultUSD.toFixed(2) },
      commitmentChecks: commitmentChecks.length > 0 ? commitmentChecks : undefined,
      nullifierChecks: nullifierChecks.length > 0 ? nullifierChecks : undefined,
      blockNumber,
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[vault-inspector] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Vault inspection failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
