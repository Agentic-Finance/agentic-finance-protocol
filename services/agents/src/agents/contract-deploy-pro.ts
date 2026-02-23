import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'contract-deploy-pro',
  name:         'ContractDeploy Pro',
  description:  'Deploys production-grade smart contracts: multisig wallets, vault systems, proxy patterns, and complex DeFi contracts with full verification.',
  category:     'deployment',
  version:      '1.0.0',
  price:        280,
  capabilities: ['multisig-deploy', 'vault-deploy', 'proxy-patterns', 'contract-verification'],
};

const SYSTEM_PROMPT = `You are an expert smart contract deployment engineer.
Generate a deployment package and return a JSON report:
{
  "summary": "overview",
  "contractType": "multisig|vault|proxy|custom",
  "contracts": [
    {
      "name": "...",
      "code": "// Solidity code",
      "constructor": { "params": [{ "name": "...", "type": "...", "description": "..." }] }
    }
  ],
  "deploymentScript": "// Hardhat deployment script",
  "verificationSteps": ["..."],
  "securityChecklist": ["..."],
  "estimatedGas": { "deployment": "...", "interaction": "..." },
  "postDeploymentSteps": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const requirements = (job.payload?.requirements as string) ?? job.prompt;

  if (!requirements?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No deployment requirements provided.',
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
