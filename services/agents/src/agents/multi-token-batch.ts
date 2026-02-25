/**
 * Multi-Token Batch Agent - Batch payments with different token types
 *
 * Execute batch transfers using MultisendV2.executeMultiTokenBatch(),
 * allowing payments in any supported token (not just the default).
 * Real on-chain execution on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getMultisendV2, getERC20,
  ensureApproval, explorerUrl, parseTokenAmount,
  CONTRACTS, TOKENS, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'multi-token-batch',
  name:         'Multi-Token Batch',
  description:  'Batch payments using any supported token via MultisendVaultV2.executeMultiTokenBatch(). Pay multiple recipients with pathUSD, BetaUSD, ThetaUSD, or AlphaUSD. Real on-chain execution.',
  category:     'payments',
  version:      '1.0.0',
  price:        10,
  capabilities: ['multi-token-batch', 'batch-payment', 'any-token', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Multi-Token Batch agent. Parse batch payment with a specific token.

Return JSON:
{
  "token": "pathUSD",
  "recipients": [
    { "wallet": "0x...", "amount": 100, "label": "Alice" },
    { "wallet": "0x...", "amount": 50, "label": "Bob" }
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
  if (!job.prompt?.trim()) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No batch request.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

  try {
    console.log(`[multi-token-batch] Phase 1: Parsing intent...`);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 2048, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: job.prompt }] });
    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let intent: any;
    try { const m = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText]; intent = JSON.parse(m[1]!.trim()); } catch { return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'Failed to parse intent.', executionTimeMs: Date.now() - start, timestamp: Date.now() }; }

    const tokenInfo = TOKEN_MAP[(intent.token || 'AlphaUSD').toLowerCase()];
    if (!tokenInfo) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Unknown token: ${intent.token}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
    if (!intent.recipients?.length) return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: 'No recipients.', executionTimeMs: Date.now() - start, timestamp: Date.now() };

    const totalAmount = intent.recipients.reduce((s: number, r: any) => s + r.amount, 0);
    const totalWei = parseTokenAmount(totalAmount, tokenInfo.decimals);
    const multisend = getMultisendV2();
    const provider = getProvider();
    const wallet = getWallet();

    console.log(`[multi-token-batch] Phase 2: Batch ${intent.recipients.length} recipients, ${totalAmount} ${tokenInfo.symbol}...`);

    // Approve and deposit
    await ensureApproval(tokenInfo.address, CONTRACTS.MULTISEND_V2, totalWei);
    const nonceDep = await provider.getTransactionCount(wallet.address, 'pending');
    const txDep = await multisend.depositToken(tokenInfo.address, totalWei, { nonce: nonceDep, gasLimit: 5_000_000, type: 0 });
    const receiptDep = await txDep.wait(1);

    // Execute multi-token batch
    const wallets = intent.recipients.map((r: any) => r.wallet);
    const amounts = intent.recipients.map((r: any) => parseTokenAmount(r.amount, tokenInfo.decimals));
    const batchId = ethers.keccak256(ethers.toUtf8Bytes(`mtb-${job.jobId}-${Date.now()}`));
    const nonceBatch = await provider.getTransactionCount(wallet.address, 'pending');
    const txBatch = await multisend.executeMultiTokenBatch(tokenInfo.address, wallets, amounts, batchId, { nonce: nonceBatch, gasLimit: 5_000_000, type: 0 });
    const receiptBatch = await txBatch.wait(1);

    console.log(`[multi-token-batch] Batch complete: ${receiptBatch.hash}`);

    return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: {
      phase: 'multi-token-batch-complete', onChain: true, network: 'Tempo Moderato Testnet', chainId: TEMPO_CHAIN_ID,
      token: tokenInfo.symbol, batchId, recipientCount: intent.recipients.length, totalAmount: `${totalAmount} ${tokenInfo.symbol}`,
      recipients: intent.recipients.map((r: any) => ({ wallet: r.wallet, amount: `${r.amount} ${tokenInfo.symbol}`, label: r.label })),
      transactions: {
        deposit: { hash: receiptDep.hash, blockNumber: receiptDep.blockNumber, gasUsed: receiptDep.gasUsed.toString(), explorerUrl: explorerUrl(receiptDep.hash) },
        batch: { hash: receiptBatch.hash, blockNumber: receiptBatch.blockNumber, gasUsed: receiptBatch.gasUsed.toString(), explorerUrl: explorerUrl(receiptBatch.hash) },
      },
      memo: intent.memo,
    }, executionTimeMs: Date.now() - start, timestamp: Date.now() } satisfies JobResult;
  } catch (err: any) {
    console.error(`[multi-token-batch] Failed:`, err.reason || err.message);
    return { jobId: job.jobId, agentId: job.agentId, status: 'error', error: `Multi-token batch failed: ${err.reason || err.message}`, executionTimeMs: Date.now() - start, timestamp: Date.now() };
  }
};
