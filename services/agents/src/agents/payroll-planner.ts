import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'payroll-planner',
  name:         'Payroll Planner',
  description:  'Optimizes batch payroll execution — groups recipients by on-chain efficiency, estimates gas costs, and produces a ready-to-execute payment schedule.',
  category:     'payroll',
  version:      '1.0.0',
  price:        3,
  capabilities: ['batch-optimization', 'gas-estimation', 'payment-scheduling', 'csv-parsing'],
};

// ── Types ─────────────────────────────────────────────────

interface Employee {
  name:   string;
  wallet: string;
  amount: number;
  token?: string;
}

// ── Handler ───────────────────────────────────────────────

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const employees = (job.payload?.employees as Employee[]) ?? [];
  const budget    = (job.payload?.budget   as number)     ?? 0;
  const schedule  = (job.payload?.schedule as string)     ?? 'immediate';

  if (employees.length === 0) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No employee list provided. Pass payload.employees as an array.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `
Payroll request: ${job.prompt}
Schedule: ${schedule}
Budget cap: $${budget > 0 ? budget : 'unlimited'}

Employee list:
${JSON.stringify(employees, null, 2)}

Produce an optimized payment plan. Return JSON:
{
  "batches": [
    {
      "batchId": "B-01",
      "recipients": [{ "name": "...", "wallet": "0x...", "amount": 0, "token": "USDC" }],
      "estimatedGasUSD": 0,
      "scheduledAt": "ISO date or 'immediate'"
    }
  ],
  "totalAmount": 0,
  "totalRecipients": 0,
  "estimatedTotalGasUSD": 0,
  "notes": ["..."]
}
Return ONLY valid JSON.`;

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2048,
    system:     'You are a blockchain payroll optimization expert. Group payments into gas-efficient batches and create optimized schedules.',
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
