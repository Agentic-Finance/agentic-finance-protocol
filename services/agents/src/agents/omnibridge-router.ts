import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'omnibridge-router',
  name:         'OmniBridge Router',
  description:  'Finds the cheapest and fastest cross-chain bridge routes. Compares fees, speed, and security across bridges.',
  category:     'defi',
  version:      '1.0.0',
  price:        40,
  capabilities: ['bridge-routing', 'fee-comparison', 'speed-optimization', 'multi-chain'],
};

const SYSTEM_PROMPT = `You are a cross-chain bridge routing expert.
Find the optimal bridge route and return a JSON report:
{
  "summary": "overview",
  "sourceChain": "...",
  "destChain": "...",
  "token": "...",
  "amount": "...",
  "routes": [
    {
      "bridge": "...",
      "fee": "...",
      "estimatedTime": "...",
      "securityScore": 0,
      "steps": ["..."]
    }
  ],
  "recommended": { "bridge": "...", "reason": "..." },
  "warnings": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const query = (job.payload?.route as string) ?? job.prompt;

  if (!query?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No bridge routing request provided.',
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
