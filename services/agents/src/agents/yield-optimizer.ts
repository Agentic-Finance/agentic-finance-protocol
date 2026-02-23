import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'yield-optimizer',
  name:         'DeFi Yield Optimizer',
  description:  'Fetches live APY data from DeFiLlama and uses AI to recommend the best yield strategy for a given token and risk profile.',
  category:     'defi',
  version:      '1.0.0',
  price:        5,
  capabilities: ['apy-comparison', 'risk-scoring', 'strategy-recommendation'],
};

// ── DeFiLlama helpers ─────────────────────────────────────

interface Pool {
  project: string;
  symbol:  string;
  apy:     number;
  tvlUsd:  number;
  chain:   string;
}

async function fetchTopYields(token: string): Promise<Pool[]> {
  const { data } = await axios.get<{ data: Pool[] }>('https://yields.llama.fi/pools');
  return data.data
    .filter(p => p.symbol.toUpperCase().includes(token.toUpperCase()) && p.apy > 0)
    .sort((a, b) => b.apy - a.apy)
    .slice(0, 10);
}

// ── Handler ───────────────────────────────────────────────

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const token     = (job.payload?.token as string)     ?? 'USDC';
  const amount    = (job.payload?.amount as number)    ?? 1000;
  const riskLevel = (job.payload?.riskLevel as string) ?? 'medium';

  let pools: Pool[] = [];
  try {
    pools = await fetchTopYields(token);
  } catch {
    pools = [];
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `
Token: ${token}
Amount: $${amount}
Risk tolerance: ${riskLevel}
User request: ${job.prompt}

Live DeFiLlama data (top 10 pools):
${JSON.stringify(pools, null, 2)}

Return a JSON response:
{
  "topStrategies": [
    { "rank": 1, "protocol": "...", "chain": "...", "apy": 0.0, "tvlUsd": 0, "estimatedYearlyUSD": 0, "riskLevel": "low|medium|high", "rationale": "..." }
  ],
  "recommendation": "one clear recommendation",
  "warnings": ["..."]
}
Return ONLY valid JSON.`;

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1024,
    system:     'You are a DeFi yield optimization expert. Analyze yield opportunities and recommend strategies based on risk profile.',
    messages:   [{ role: 'user', content: userMessage }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); }
  catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
