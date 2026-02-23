import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'vesting-planner',
  name:         'VestingVault Planner',
  description:  'Designs optimal token vesting schedules, analyzes tokenomics health, and generates vesting contract configurations.',
  category:     'compliance',
  version:      '1.0.0',
  price:        130,
  capabilities: ['vesting-design', 'tokenomics-health', 'schedule-optimization', 'cliff-analysis'],
};

const SYSTEM_PROMPT = `You are a tokenomics and vesting schedule expert.
Design a vesting plan and return a JSON report:
{
  "summary": "overview",
  "vestingSchedule": [
    { "group": "...", "allocation": "...", "cliff": "...", "vestingPeriod": "...", "tgeUnlock": "..." }
  ],
  "tokenomicsHealth": {
    "circulatingSupplyAtTGE": "...",
    "inflationRate": "...",
    "sellPressureScore": 0,
    "healthScore": 0
  },
  "unlockTimeline": [{ "month": 0, "totalUnlocked": "...", "newUnlocks": "..." }],
  "recommendations": ["..."],
  "contractConfig": { "type": "linear|stepped|custom", "parameters": {} }
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const requirements = (job.payload?.requirements as string) ?? job.prompt;

  if (!requirements?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No vesting requirements provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: requirements }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); } catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
