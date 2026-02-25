/**
 * Treasury Manager Agent - Comprehensive treasury operations
 *
 * All-in-one treasury management: scan balances across all tokens,
 * check vault deposits, audit allowances, collect fees, and provide
 * a complete financial overview. Reads from Tempo L1.
 */

import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getERC20, getMultisendV2, getShieldVaultV2, getNexusV2,
  explorerUrl, TOKENS, CONTRACTS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';
import { getStreamV1 } from '../utils/stream-settlement';
import { getProofStats } from '../utils/ai-proof';

export const manifest: AgentDescriptor = {
  id:           'treasury-manager',
  name:         'Treasury Manager',
  description:  'Comprehensive treasury overview and management. Scans all token balances, vault deposits, contract holdings, allowances, and protocol stats. Complete financial dashboard from Tempo L1.',
  category:     'admin',
  version:      '1.0.0',
  price:        5,
  capabilities: ['treasury-overview', 'balance-scan', 'vault-audit', 'protocol-stats', 'on-chain-read'],
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
    const wallet = getWallet();
    const provider = getProvider();
    console.log(`[treasury-manager] Running comprehensive treasury scan...`);

    // 1. Wallet balances
    const nativeBalance = await provider.getBalance(wallet.address);
    const tokenBalances: any[] = [];
    let totalUSD = 0;
    for (const t of ALL_TOKENS) {
      const token = getERC20(t.address);
      const bal = await token.balanceOf(wallet.address);
      const formatted = Number(ethers.formatUnits(bal, t.decimals));
      tokenBalances.push({ symbol: t.symbol, balance: formatted.toFixed(2), address: t.address });
      totalUSD += formatted;
    }

    // 2. Contract holdings (AlphaUSD held by each contract)
    const alphaToken = getERC20(TOKENS.AlphaUSD.address);
    const contractHoldings: any[] = [];
    const contracts = [
      { name: 'NexusV2', address: CONTRACTS.NEXUS_V2 },
      { name: 'ShieldVaultV2', address: CONTRACTS.SHIELD_VAULT_V2 },
      { name: 'MultisendV2', address: CONTRACTS.MULTISEND_V2 },
      { name: 'StreamV1', address: CONTRACTS.STREAM_V1 },
    ];
    let totalContractHoldings = 0;
    for (const c of contracts) {
      const bal = await alphaToken.balanceOf(c.address);
      const formatted = Number(ethers.formatUnits(bal, 6));
      contractHoldings.push({ contract: c.name, address: c.address, balance: formatted.toFixed(2) });
      totalContractHoldings += formatted;
    }

    // 3. MultisendV2 vault balance
    const multisend = getMultisendV2();
    const vaultBalance = await multisend.getVaultBalance(TOKENS.AlphaUSD.address);
    const depositBalance = await multisend.getDepositBalance(wallet.address, TOKENS.AlphaUSD.address);
    const batchCount = Number(await multisend.getBatchCount());

    // 4. NexusV2 stats
    const nexus = getNexusV2();
    const nextJobId = Number(await nexus.nextJobId());

    // 5. StreamV1 stats
    const streamV1 = getStreamV1();
    const streamCount = Number(await streamV1.streamCount());

    // 6. AIProofRegistry stats
    const proofStats = await getProofStats();

    // 7. Block info
    const blockNumber = await provider.getBlockNumber();

    console.log(`[treasury-manager] Scan complete - $${totalUSD.toFixed(2)} wallet, $${totalContractHoldings.toFixed(2)} in contracts`);

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'treasury-report', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      wallet: { address: wallet.address, nativeBalance: ethers.formatEther(nativeBalance), tokens: tokenBalances, totalTokenUSD: totalUSD.toFixed(2) },
      contractHoldings: { contracts: contractHoldings, totalAlphaUSD: totalContractHoldings.toFixed(2) },
      multisendVault: { vaultBalance: ethers.formatUnits(vaultBalance, 6), myDeposit: ethers.formatUnits(depositBalance, 6), totalBatches: batchCount },
      protocolStats: { totalEscrowJobs: nextJobId, totalStreams: streamCount, aiProofs: proofStats },
      blockNumber,
      explorerUrl: explorerUrl(wallet.address, 'address'),
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[treasury-manager] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Treasury scan failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
