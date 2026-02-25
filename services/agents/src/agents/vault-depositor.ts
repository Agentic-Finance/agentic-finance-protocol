/**
 * Vault Depositor Agent - ShieldVaultV2 deposits & public payouts
 *
 * Deposits funds into the ShieldVault and executes public (non-ZK) payouts.
 * Complements shield-executor which handles ZK-shielded payments.
 * Real on-chain execution on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getShieldVaultV2, getERC20,
  ensureApproval, explorerUrl, parseTokenAmount, sendTx,
  CONTRACTS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'vault-depositor',
  name:         'Vault Depositor',
  description:  'Manages ShieldVaultV2 operations - deposit funds and execute public payouts. For non-ZK vault transactions on Tempo L1. Real on-chain execution.',
  category:     'privacy',
  version:      '1.0.0',
  price:        5,
  capabilities: ['vault-deposit', 'public-payout', 'shield-vault', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Vault Depositor agent for ShieldVaultV2 on Tempo blockchain.
Parse the user's vault operation request.

Return JSON:
{
  "action": "deposit|payout",
  "amount": 100,
  "recipient": "0x..." (required for payout only),
  "tokenSymbol": "AlphaUSD",
  "memo": "Brief description"
}

ACTIONS:
- deposit: Deposit tokens into ShieldVaultV2 for later payouts
- payout: Execute a public (non-shielded) payout from the vault

RULES:
- Default token: AlphaUSD
- For deposit: amount is required
- For payout: amount and recipient are required
- Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  if (!job.prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No vault operation request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Intent Parsing ──
    console.log(`[vault-depositor] Phase 1: Parsing vault intent...`);

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
        error: 'Failed to parse vault operation intent.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const { action, amount, recipient, memo } = intent;
    const vault = getShieldVaultV2();
    const wallet = getWallet();

    if (!amount || amount <= 0) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Invalid amount: ${amount}`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const amountWei = parseTokenAmount(amount, DEFAULT_TOKEN.decimals);

    // ── Phase 2: On-Chain Execution ──

    if (action === 'deposit') {
      console.log(`[vault-depositor] Depositing ${amount} AlphaUSD into ShieldVaultV2...`);

      // Approve vault to spend tokens
      const approvalTx = await ensureApproval(DEFAULT_TOKEN.address, CONTRACTS.SHIELD_VAULT_V2, amountWei);
      if (approvalTx) {
        console.log(`[vault-depositor] ERC20 approved: ${approvalTx}`);
      }

      // Deposit
      const result = await sendTx(vault, 'deposit', [DEFAULT_TOKEN.address, amountWei]);

      console.log(`[vault-depositor] Deposit complete: ${result.txHash}`);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'vault-deposited',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          deposit: {
            depositor: wallet.address,
            amount: `${amount} AlphaUSD`,
            amountWei: amountWei.toString(),
            vaultAddress: CONTRACTS.SHIELD_VAULT_V2,
            memo,
          },
          transaction: {
            hash: result.txHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            explorerUrl: result.explorerUrl,
          },
          approvalTxHash: approvalTx,
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'payout') {
      if (!ethers.isAddress(recipient)) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: `Invalid recipient address: ${recipient}`,
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      console.log(`[vault-depositor] Executing public payout: ${amount} AlphaUSD → ${recipient}...`);

      const result = await sendTx(vault, 'executePublicPayout', [
        recipient,
        DEFAULT_TOKEN.address,
        amountWei,
      ]);

      console.log(`[vault-depositor] Payout complete: ${result.txHash}`);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'payout-executed',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          payout: {
            from: wallet.address,
            to: recipient,
            amount: `${amount} AlphaUSD`,
            amountWei: amountWei.toString(),
            vaultAddress: CONTRACTS.SHIELD_VAULT_V2,
            memo,
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
        error: `Unknown vault action: ${action}. Supported: deposit, payout.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

  } catch (err: any) {
    console.error(`[vault-depositor] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Vault operation failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
