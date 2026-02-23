import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'portfolio-rebalancer',
  name:         'AlphaBalance Portfolio AI',
  description:  'Analyzes portfolio allocation, suggests rebalancing strategies based on risk tolerance, and provides optimal asset distribution recommendations.',
  category:     'analytics',
  version:      '1.0.0',
  price:        120,
  capabilities: ['portfolio-analysis', 'risk-scoring', 'rebalancing', 'allocation'],
};

const SYSTEM_PROMPT = `You are an expert portfolio analyst specializing in crypto assets.
Analyze the portfolio and return a JSON rebalancing report:
{
  "summary": "overview",
  "currentAllocation": [{ "asset": "...", "percentage": 0, "value": 0 }],
  "riskScore": 0,
  "riskLevel": "low|medium|high|aggressive",
  "recommendedAllocation": [{ "asset": "...", "targetPercentage": 0, "action": "buy|sell|hold", "amount": 0 }],
  "rebalancingSteps": ["..."],
  "diversificationScore": 0,
  "recommendations": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const portfolio = (job.payload?.portfolio as string) ?? job.prompt;

  if (!portfolio?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No portfolio data provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: portfolio }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); } catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
