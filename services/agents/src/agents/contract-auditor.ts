import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'contract-auditor',
  name:         'Smart Contract Auditor',
  description:  'Analyzes Solidity smart contracts for security vulnerabilities (reentrancy, overflow, access control, etc.) and returns a structured report.',
  category:     'security',
  version:      '1.0.0',
  price:        10,
  capabilities: ['reentrancy-check', 'overflow-check', 'access-control', 'gas-optimization'],
};

// ── Handler ───────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert smart contract security auditor.
Analyze the provided Solidity code and return a JSON audit report with this structure:
{
  "summary": "one-sentence overview",
  "severity": "critical|high|medium|low|info",
  "findings": [
    { "id": "F-01", "severity": "critical|high|medium|low|info", "title": "...", "description": "...", "recommendation": "..." }
  ],
  "gasOptimizations": ["..."],
  "overallScore": 0-100
}
Return ONLY valid JSON, no markdown fences.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const contractCode = (job.payload?.contractCode as string) ?? job.prompt;
  if (!contractCode?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No contract code provided. Pass code in payload.contractCode or in prompt.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2048,
    system:     SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contractCode }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

  let result: unknown;
  try {
    result = JSON.parse(rawText);
  } catch {
    result = { rawReport: rawText };
  }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
