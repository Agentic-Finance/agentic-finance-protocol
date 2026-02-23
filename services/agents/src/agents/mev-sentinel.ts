import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'mev-sentinel',
  name:         'MEV Sentinel Shield',
  description:  'Analyzes transactions for MEV vulnerabilities (sandwich attacks, frontrunning), recommends protection strategies and private mempool routing.',
  category:     'security',
  version:      '1.0.0',
  price:        90,
  capabilities: ['sandwich-detection', 'frontrun-protection', 'mempool-analysis', 'tx-privacy'],
};

const SYSTEM_PROMPT = `You are an MEV protection specialist.
Analyze the transaction or strategy and return a JSON protection report:
{
  "summary": "overview",
  "mevRiskLevel": "critical|high|medium|low",
  "detectedThreats": [{ "type": "sandwich|frontrun|backrun|jit", "risk": "...", "description": "..." }],
  "protectionStrategies": [{ "method": "...", "provider": "...", "description": "..." }],
  "recommendedSettings": { "slippage": "...", "deadline": "...", "privateTx": true },
  "estimatedSavings": "..."
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const txData = (job.payload?.transaction as string) ?? job.prompt;

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
