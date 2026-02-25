/**
 * Token Transfer Agent - Direct ERC20 transfers on Tempo L1
 *
 * Parses natural language to transfer AlphaUSD, pathUSD, BetaUSD, or ThetaUSD
 * between wallets. Real on-chain execution with tx hash confirmation.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getERC20, explorerUrl, parseTokenAmount, sendTx,
  TOKENS, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'token-transfer',
  name:         'Token Transfer',
  description:  'Direct ERC20 token transfers on Tempo L1. Supports AlphaUSD, pathUSD, BetaUSD, and ThetaUSD. Parses natural language transfer requests and executes real on-chain transactions.',
  category:     'payments',
  version:      '1.0.0',
  price:        2,
  capabilities: ['erc20-transfer', 'multi-token', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Token Transfer agent on Tempo blockchain.
Parse the user's transfer request into structured parameters.

Return JSON:
{
  "recipient": "0x...",
  "amount": 100,
  "tokenSymbol": "AlphaUSD",
  "memo": "Brief description of this transfer"
}

SUPPORTED TOKENS: AlphaUSD (default), pathUSD, BetaUSD, ThetaUSD
RULES:
- recipient must be a valid Ethereum address (0x + 40 hex chars)
- amount must be a positive number
- Default token is AlphaUSD if not specified
- Return ONLY valid JSON.`;

const TOKEN_MAP: Record<string, { address: string; decimals: number }> = {
  alphausd: TOKENS.AlphaUSD,
  pathusd:  TOKENS.pathUSD,
  betausd:  TOKENS.BetaUSD,
  thetausd: TOKENS.ThetaUSD,
};

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  if (!job.prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No transfer request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Intent Parsing ──
    console.log(`[token-transfer] Phase 1: Parsing transfer intent...`);

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
        error: 'Failed to parse transfer intent from AI response.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const { recipient, amount, tokenSymbol, memo } = intent;

    if (!ethers.isAddress(recipient)) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Invalid recipient address: ${recipient}`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    if (!amount || amount <= 0) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Invalid transfer amount: ${amount}`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    // Resolve token
    const tokenKey = (tokenSymbol || 'AlphaUSD').toLowerCase();
    const tokenInfo = TOKEN_MAP[tokenKey] || DEFAULT_TOKEN;
    const symbol = tokenSymbol || 'AlphaUSD';

    // ── Phase 2: On-Chain Transfer ──
    console.log(`[token-transfer] Phase 2: Transferring ${amount} ${symbol} to ${recipient}...`);

    const token = getERC20(tokenInfo.address);
    const amountWei = parseTokenAmount(amount, tokenInfo.decimals);
    const result = await sendTx(token, 'transfer', [recipient, amountWei]);

    console.log(`[token-transfer] Transfer complete: ${result.txHash}`);

    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: {
        phase: 'transfer-complete',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        transfer: {
          from: getWallet().address,
          to: recipient,
          amount: `${amount} ${symbol}`,
          amountWei: amountWei.toString(),
          tokenAddress: tokenInfo.address,
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

  } catch (err: any) {
    console.error(`[token-transfer] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Transfer failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
