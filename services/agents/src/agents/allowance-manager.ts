/**
 * Allowance Manager Agent - ERC20 approval management for PayPol contracts
 *
 * Check, approve, and revoke token allowances for all PayPol smart contracts.
 * Helps users manage which contracts can spend their tokens.
 * Real on-chain execution on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getERC20, ensureApproval,
  explorerUrl, parseTokenAmount, sendTx,
  CONTRACTS, TOKENS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'allowance-manager',
  name:         'Allowance Manager',
  description:  'Manage ERC20 token allowances for all PayPol contracts. Check current approvals, approve new allowances, or revoke permissions. On-chain security management on Tempo L1.',
  category:     'security',
  version:      '1.0.0',
  price:        2,
  capabilities: ['check-allowance', 'approve-token', 'revoke-allowance', 'on-chain-execution'],
};

const CONTRACT_NAMES: Record<string, string> = {
  [CONTRACTS.NEXUS_V2]:       'NexusV2 (Escrow)',
  [CONTRACTS.SHIELD_VAULT_V2]:'ShieldVaultV2',
  [CONTRACTS.MULTISEND_V2]:   'MultisendVaultV2',
  [CONTRACTS.STREAM_V1]:      'StreamV1',
};

const SYSTEM_PROMPT = `You are a PayPol Allowance Manager agent on Tempo blockchain.
Parse the user's allowance management request.

Return JSON:
{
  "action": "check|approve|revoke|scan",
  "tokenSymbol": "AlphaUSD",
  "contract": "NexusV2|ShieldVaultV2|MultisendV2|StreamV1|all",
  "amount": 1000 (for approve only)
}

ACTIONS:
- check: Check current allowance for a specific contract
- approve: Approve a specific amount for a contract
- revoke: Set allowance to 0 for a contract
- scan: Check all allowances across all contracts and tokens

SUPPORTED TOKENS: AlphaUSD, pathUSD, BetaUSD, ThetaUSD
CONTRACTS: NexusV2, ShieldVaultV2, MultisendV2, StreamV1
Return ONLY valid JSON.`;

const CONTRACT_LOOKUP: Record<string, string> = {
  nexusv2:        CONTRACTS.NEXUS_V2,
  shieldvaultv2:  CONTRACTS.SHIELD_VAULT_V2,
  multisendv2:    CONTRACTS.MULTISEND_V2,
  streamv1:       CONTRACTS.STREAM_V1,
};

const TOKEN_LOOKUP: Record<string, { address: string; decimals: number; symbol: string }> = {
  alphausd: { ...TOKENS.AlphaUSD, symbol: 'AlphaUSD' },
  pathusd:  { ...TOKENS.pathUSD,  symbol: 'pathUSD' },
  betausd:  { ...TOKENS.BetaUSD,  symbol: 'BetaUSD' },
  thetausd: { ...TOKENS.ThetaUSD, symbol: 'ThetaUSD' },
};

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  if (!job.prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No allowance management request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Intent Parsing ──
    console.log(`[allowance-manager] Phase 1: Parsing allowance intent...`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: job.prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let intent: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      intent = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'Failed to parse allowance intent.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const { action } = intent;
    const wallet = getWallet();

    // ── Phase 2: On-Chain Execution ──

    if (action === 'scan') {
      // Scan all allowances across all tokens and contracts
      console.log(`[allowance-manager] Scanning all allowances...`);

      const allAllowances: any[] = [];
      for (const [tokenKey, tokenInfo] of Object.entries(TOKEN_LOOKUP)) {
        const token = getERC20(tokenInfo.address);
        for (const [contractAddr, contractName] of Object.entries(CONTRACT_NAMES)) {
          const allowance = await token.allowance(wallet.address, contractAddr);
          const formatted = ethers.formatUnits(allowance, tokenInfo.decimals);
          allAllowances.push({
            token: tokenInfo.symbol,
            tokenAddress: tokenInfo.address,
            contract: contractName,
            contractAddress: contractAddr,
            allowance: formatted,
            allowanceWei: allowance.toString(),
            isApproved: allowance > 0n,
          });
        }
      }

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'allowance-scan',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          wallet: wallet.address,
          allowances: allAllowances,
          summary: {
            totalChecked: allAllowances.length,
            approved: allAllowances.filter(a => a.isApproved).length,
            revoked: allAllowances.filter(a => !a.isApproved).length,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'check') {
      const tokenKey = (intent.tokenSymbol || 'AlphaUSD').toLowerCase();
      const tokenInfo = TOKEN_LOOKUP[tokenKey] || TOKEN_LOOKUP.alphausd;
      const contractKey = (intent.contract || 'NexusV2').toLowerCase().replace(/[^a-z0-9]/g, '');
      const contractAddr = CONTRACT_LOOKUP[contractKey];

      if (!contractAddr) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: `Unknown contract: ${intent.contract}`,
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      const token = getERC20(tokenInfo.address);
      const allowance = await token.allowance(wallet.address, contractAddr);
      const formatted = ethers.formatUnits(allowance, tokenInfo.decimals);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'allowance-checked',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          allowance: {
            token: tokenInfo.symbol,
            contract: CONTRACT_NAMES[contractAddr],
            contractAddress: contractAddr,
            currentAllowance: formatted,
            allowanceWei: allowance.toString(),
            isApproved: allowance > 0n,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'approve') {
      const tokenKey = (intent.tokenSymbol || 'AlphaUSD').toLowerCase();
      const tokenInfo = TOKEN_LOOKUP[tokenKey] || TOKEN_LOOKUP.alphausd;
      const contractKey = (intent.contract || 'NexusV2').toLowerCase().replace(/[^a-z0-9]/g, '');
      const contractAddr = CONTRACT_LOOKUP[contractKey];
      const amount = intent.amount;

      if (!contractAddr) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: `Unknown contract: ${intent.contract}`,
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      if (!amount || amount <= 0) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: `Invalid approval amount: ${amount}`,
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      const amountWei = parseTokenAmount(amount, tokenInfo.decimals);
      console.log(`[allowance-manager] Approving ${amount} ${tokenInfo.symbol} for ${CONTRACT_NAMES[contractAddr]}...`);

      const token = getERC20(tokenInfo.address);
      const result = await sendTx(token, 'approve', [contractAddr, amountWei]);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'allowance-approved',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          approval: {
            token: tokenInfo.symbol,
            contract: CONTRACT_NAMES[contractAddr],
            amount: `${amount} ${tokenInfo.symbol}`,
            amountWei: amountWei.toString(),
          },
          transaction: {
            hash: result.txHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            explorerUrl: result.explorerUrl,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'revoke') {
      const tokenKey = (intent.tokenSymbol || 'AlphaUSD').toLowerCase();
      const tokenInfo = TOKEN_LOOKUP[tokenKey] || TOKEN_LOOKUP.alphausd;
      const contractKey = (intent.contract || 'NexusV2').toLowerCase().replace(/[^a-z0-9]/g, '');
      const contractAddr = CONTRACT_LOOKUP[contractKey];

      if (!contractAddr) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: `Unknown contract: ${intent.contract}`,
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      console.log(`[allowance-manager] Revoking ${tokenInfo.symbol} allowance for ${CONTRACT_NAMES[contractAddr]}...`);

      const token = getERC20(tokenInfo.address);
      const result = await sendTx(token, 'approve', [contractAddr, 0n]);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'allowance-revoked',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          revocation: {
            token: tokenInfo.symbol,
            contract: CONTRACT_NAMES[contractAddr],
            previouslyApproved: true,
            newAllowance: '0',
          },
          transaction: {
            hash: result.txHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            explorerUrl: result.explorerUrl,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Unknown allowance action: ${action}. Supported: check, approve, revoke, scan.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

  } catch (err: any) {
    console.error(`[allowance-manager] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Allowance operation failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
