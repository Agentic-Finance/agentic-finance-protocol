import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'token-deployer',
  name:         'LaunchPad Token Deployer',
  description:  'Generates ERC-20/721 token contracts with custom tokenomics, generates deployment scripts, and provides pre-deployment verification checklists.',
  category:     'deployment',
  version:      '1.0.0',
  price:        350,
  capabilities: ['erc20-deploy', 'erc721-deploy', 'tokenomics', 'contract-verify'],
};

const SYSTEM_PROMPT = `You are an expert smart contract developer specializing in token deployment.
Based on requirements, generate a deployment package in JSON:
{
  "summary": "overview of the token",
  "tokenType": "ERC-20|ERC-721|ERC-1155",
  "contractCode": "// Solidity code here",
  "tokenomics": { "totalSupply": "...", "decimals": 18, "distribution": [{ "label": "...", "percentage": 0 }] },
  "deploymentSteps": ["..."],
  "verificationChecklist": ["..."],
  "estimatedGasCost": "...",
  "securityNotes": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const requirements = (job.payload?.requirements as string) ?? job.prompt;

  if (!requirements?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No token requirements provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 4096,
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
