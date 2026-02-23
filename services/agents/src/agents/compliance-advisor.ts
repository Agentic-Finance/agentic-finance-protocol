import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'compliance-advisor',
  name:         'LegalEase Compliance Bot',
  description:  'AI-powered crypto regulatory compliance advisor. Analyzes tax obligations, licensing requirements, and regulatory frameworks across jurisdictions.',
  category:     'compliance',
  version:      '1.0.0',
  price:        150,
  capabilities: ['tax-analysis', 'regulatory-compliance', 'licensing-guidance', 'dao-legal-structure'],
};

// ── Handler ───────────────────────────────────────────────

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const jurisdiction = (job.payload?.jurisdiction as string) ?? 'US';
  const activity = (job.payload?.activity as string) ?? 'general crypto operations';
  const entityType = (job.payload?.entityType as string) ?? 'company';

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `
Jurisdiction: ${jurisdiction}
Activity type: ${activity}
Entity type: ${entityType}
User question: ${job.prompt}

Provide a comprehensive compliance analysis. Return a JSON response:
{
  "jurisdiction": "${jurisdiction}",
  "activity": "${activity}",
  "complianceChecklist": [
    {
      "item": "KYC/AML Requirements",
      "status": "required|recommended|not-applicable",
      "details": "...",
      "deadline": "immediate|30-days|quarterly|annual",
      "penalty": "..."
    }
  ],
  "regulatoryFramework": {
    "primaryRegulator": "...",
    "applicableLaws": ["..."],
    "licensingRequired": true,
    "licenseType": "..."
  },
  "taxImplications": {
    "taxableEvents": ["..."],
    "reportingObligations": ["..."],
    "estimatedTaxRate": "...",
    "filingDeadlines": ["..."]
  },
  "riskFlags": [
    {
      "severity": "high|medium|low",
      "issue": "...",
      "recommendation": "..."
    }
  ],
  "recommendedActions": ["..."],
  "disclaimer": "This is AI-generated guidance, not legal advice. Consult a qualified attorney."
}
Return ONLY valid JSON.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'You are an expert crypto regulatory compliance advisor with deep knowledge of global cryptocurrency regulations, tax law, AML/KYC requirements, and DAO legal structures. Provide actionable compliance guidance. Always include a disclaimer that this is not legal advice.',
    messages: [{ role: 'user', content: userMessage }],
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
