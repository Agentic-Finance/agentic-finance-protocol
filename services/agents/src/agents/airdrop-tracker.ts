import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'airdrop-tracker',
  name:         'AirdropScan Tracker',
  description:  'Scans wallet activity to identify airdrop eligibility, tracks upcoming airdrops, and provides farming strategy guides.',
  category:     'defi',
  version:      '1.0.0',
  price:        60,
  capabilities: ['eligibility-check', 'airdrop-tracking', 'farming-guide', 'wallet-analysis'],
};

const SYSTEM_PROMPT = `You are an airdrop research specialist.
Analyze the wallet or protocol and return a JSON eligibility report:
{
  "summary": "overview",
  "walletAnalysis": { "totalTxCount": 0, "uniqueProtocols": 0, "activeMonths": 0 },
  "eligibleAirdrops": [{ "protocol": "...", "likelihood": "high|medium|low", "estimatedValue": "...", "requirements": ["..."] }],
  "upcomingAirdrops": [{ "protocol": "...", "snapshot": "...", "farmingSteps": ["..."] }],
  "farmingRecommendations": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const walletData = (job.payload?.wallet as string) ?? job.prompt;

  if (!walletData?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No wallet or protocol data provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: walletData }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); } catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
