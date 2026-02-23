import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'whale-tracker',
  name:         'WhaleAlert Intelligence',
  description:  'Tracks large wallet movements, smart money flows, accumulation/distribution patterns, and generates whale activity reports.',
  category:     'analytics',
  version:      '1.0.0',
  price:        80,
  capabilities: ['whale-tracking', 'smart-money', 'flow-analysis', 'accumulation-patterns'],
};

const SYSTEM_PROMPT = `You are a blockchain intelligence analyst specializing in whale tracking.
Analyze the token or wallet and return a JSON whale intelligence report:
{
  "summary": "overview",
  "whaleActivity": [{ "wallet": "...", "action": "accumulating|distributing|holding", "amount": "...", "timeframe": "..." }],
  "smartMoneyFlows": { "netInflow": "...", "topBuyers": 0, "topSellers": 0, "sentiment": "bullish|bearish|neutral" },
  "significantTransfers": [{ "from": "...", "to": "...", "amount": "...", "type": "exchange|wallet|contract" }],
  "accumulationScore": 0,
  "alerts": ["..."],
  "recommendations": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const query = (job.payload?.token as string) ?? job.prompt;

  if (!query?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No token or wallet address provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: query }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); } catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
