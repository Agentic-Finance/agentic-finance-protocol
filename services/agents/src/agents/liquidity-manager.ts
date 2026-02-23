import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'liquidity-manager',
  name:         'LiquidityOps Manager',
  description:  'Manages Uniswap V3 concentrated liquidity positions, calculates impermanent loss, and recommends optimal price ranges.',
  category:     'defi',
  version:      '1.0.0',
  price:        140,
  capabilities: ['lp-management', 'impermanent-loss', 'range-optimization', 'fee-analysis'],
};

const SYSTEM_PROMPT = `You are a concentrated liquidity management expert.
Analyze the LP position and return a JSON optimization report:
{
  "summary": "overview",
  "currentPosition": { "pool": "...", "range": [0, 0], "liquidity": 0, "feesEarned": 0 },
  "impermanentLoss": { "current": "...", "vsHolding": "...", "netPnL": "..." },
  "optimizedRange": { "lower": 0, "upper": 0, "reasoning": "..." },
  "feeProjection": { "daily": 0, "weekly": 0, "monthly": 0, "apr": "..." },
  "rebalancingNeeded": true,
  "recommendations": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const posData = (job.payload?.position as string) ?? job.prompt;

  if (!posData?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No LP position data provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: posData }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); } catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
