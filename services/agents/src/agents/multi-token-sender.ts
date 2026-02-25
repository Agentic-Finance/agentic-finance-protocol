/**
 * Multi-Token Sender Agent - Send multiple token types to one recipient
 *
 * Transfer AlphaUSD, pathUSD, BetaUSD, and/or ThetaUSD to a single
 * recipient in one operation. Executes each as a real ERC20 transfer
 * on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getERC20, explorerUrl, parseTokenAmount, sendTx,
  TOKENS, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'multi-token-sender',
  name:         'Multi-Token Sender',
  description:  'Send multiple token types to a single recipient in one operation. Transfer any combination of AlphaUSD, pathUSD, BetaUSD, ThetaUSD. Each transfer is a real on-chain ERC20 transaction on Tempo L1.',
  category:     'payments',
  version:      '1.0.0',
  price:        4,
  capabilities: ['multi-token-transfer', 'batch-send', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Multi-Token Sender. Parse the user's request to send multiple tokens to one recipient.

Return JSON:
{
  "recipient": "0x...",
  "transfers": [
    { "token": "AlphaUSD", "amount": 100 },
    { "token": "pathUSD", "amount": 50 }
  ],
  "memo": "Brief description"
}

SUPPORTED TOKENS: AlphaUSD, pathUSD, BetaUSD, ThetaUSD
Return ONLY valid JSON.`;

const TOKEN_MAP: Record<string, { address: string; decimals: number; symbol: string }> = {
  alphausd: { ...TOKENS.AlphaUSD, symbol: 'AlphaUSD' },
  pathusd:  { ...TOKENS.pathUSD,  symbol: 'pathUSD' },
  betausd:  { ...TOKENS.BetaUSD,  symbol: 'BetaUSD' },
  thetausd: { ...TOKENS.ThetaUSD, symbol: 'ThetaUSD' },
};

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  if (!job.prompt?.trim()) {
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No transfer request provided.', executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }

  try {
    console.log(`[multi-token-sender] Phase 1: Parsing multi-token intent...`);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 512, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: job.prompt }] });
    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let intent: any;
    try { const m = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText]; intent = JSON.parse(m[1]!.trim()); } catch { return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Failed to parse intent.', executionTimeMs: Date.now() - start, timestamp: Date.now() }; }

    if (!ethers.isAddress(intent.recipient)) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Invalid recipient: ${intent.recipient}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
    if (!intent.transfers?.length) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No transfers specified.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

    console.log(`[multi-token-sender] Phase 2: Executing ${intent.transfers.length} token transfers...`);
    const txResults: any[] = [];

    for (const t of intent.transfers) {
      const tokenInfo = TOKEN_MAP[(t.token || 'AlphaUSD').toLowerCase()];
      if (!tokenInfo) { txResults.push({ token: t.token, error: 'Unknown token' }); continue; }
      const token = getERC20(tokenInfo.address);
      const amountWei = parseTokenAmount(t.amount, tokenInfo.decimals);
      const result = await sendTx(token, 'transfer', [intent.recipient, amountWei]);
      txResults.push({ token: tokenInfo.symbol, amount: `${t.amount} ${tokenInfo.symbol}`, transaction: { hash: result.txHash, blockNumber: result.blockNumber, gasUsed: result.gasUsed, explorerUrl: result.explorerUrl } });
      console.log(`[multi-token-sender] Sent ${t.amount} ${tokenInfo.symbol}: ${result.txHash}`);
    }

    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: { phase: 'multi-transfer-complete', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID, recipient: intent.recipient, transfers: txResults, totalTransactions: txResults.length, memo: intent.memo },
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    } satisfies JobResult;
  } catch (err: any) {
    console.error(`[multi-token-sender] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Multi-token transfer failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
