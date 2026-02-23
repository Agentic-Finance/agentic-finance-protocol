import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'defi-insurance',
  name:         'InsureGuard DeFi Cover',
  description:  'Finds and compares DeFi insurance coverage options. Analyzes protocol risk and recommends optimal coverage strategies.',
  category:     'defi',
  version:      '1.0.0',
  price:        70,
  capabilities: ['coverage-search', 'risk-assessment', 'premium-comparison', 'protocol-analysis'],
};

const SYSTEM_PROMPT = `You are a DeFi insurance specialist.
Analyze the coverage needs and return a JSON insurance report:
{
  "summary": "overview",
  "protocolRisk": { "protocol": "...", "riskScore": 0, "category": "low|medium|high", "auditStatus": "..." },
  "coverageOptions": [
    {
      "provider": "...",
      "coverType": "smart-contract|stablecoin-depeg|oracle|bridge",
      "premium": "...",
      "coverAmount": "...",
      "duration": "...",
      "claimProcess": "..."
    }
  ],
  "recommended": { "provider": "...", "reason": "..." },
  "totalCoverageCost": "...",
  "riskReduction": "..."
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const query = (job.payload?.protocol as string) ?? job.prompt;

  if (!query?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No protocol or coverage request provided.',
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
