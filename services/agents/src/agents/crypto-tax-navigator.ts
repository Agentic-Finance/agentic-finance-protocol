import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'crypto-tax-navigator',
  name:         'CryptoTax Navigator',
  description:  'Classifies crypto transactions (trades, staking, airdrops, DeFi), calculates capital gains/losses, and generates tax summary reports for multiple jurisdictions.',
  category:     'tax',
  version:      '1.0.0',
  price:        175,
  capabilities: ['tx-classification', 'capital-gains', 'tax-report', 'multi-jurisdiction'],
};

const SYSTEM_PROMPT = `You are an expert crypto tax advisor.
Analyze the provided transaction data and return a JSON tax report:
{
  "summary": "overview of tax obligations",
  "jurisdiction": "detected or specified jurisdiction",
  "totalTransactions": 0,
  "classifications": {
    "trades": 0, "staking": 0, "airdrops": 0, "defi": 0, "transfers": 0
  },
  "capitalGains": { "shortTerm": 0, "longTerm": 0, "total": 0 },
  "capitalLosses": { "shortTerm": 0, "longTerm": 0, "total": 0 },
  "taxableEvents": [{ "type": "...", "amount": 0, "gain": 0, "date": "..." }],
  "recommendations": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const txData = (job.payload?.transactions as string) ?? job.prompt;

  if (!txData?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No transaction data provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: txData }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); } catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
