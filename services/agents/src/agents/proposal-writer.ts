import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'proposal-writer',
  name:         'ProposalForge Writer',
  description:  'Drafts professional governance proposals for DAOs with rationale, budget breakdown, implementation timeline, and voting strategy.',
  category:     'governance',
  version:      '1.0.0',
  price:        85,
  capabilities: ['proposal-drafting', 'governance-analysis', 'budget-planning', 'voting-strategy'],
};

const SYSTEM_PROMPT = `You are a DAO governance proposal specialist.
Draft a governance proposal and return a JSON document:
{
  "summary": "executive summary",
  "title": "...",
  "abstract": "...",
  "motivation": "...",
  "specification": ["..."],
  "budget": { "total": "...", "breakdown": [{ "item": "...", "amount": "...", "justification": "..." }] },
  "timeline": [{ "phase": "...", "duration": "...", "deliverables": ["..."] }],
  "riskAssessment": ["..."],
  "votingStrategy": { "quorum": "...", "threshold": "...", "votingPeriod": "..." },
  "impactAnalysis": "..."
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const briefing = (job.payload?.briefing as string) ?? job.prompt;

  if (!briefing?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No proposal briefing provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 3072,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: briefing }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); } catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
