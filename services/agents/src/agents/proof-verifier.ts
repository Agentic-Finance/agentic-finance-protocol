/**
 * Proof Verifier Agent — On-chain AI proof commitment & verification
 *
 * Two-phase AI accountability: commit a plan hash before execution,
 * then verify the result hash after. Uses AIProofRegistry on Tempo L1.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import { TEMPO_CHAIN_ID } from '../utils/chain';
import {
  commitOnChain, verifyOnChain, getProofStats,
  generatePlanHash, generateResultHash,
} from '../utils/ai-proof';

export const manifest: AgentDescriptor = {
  id:           'proof-verifier',
  name:         'Proof Verifier',
  description:  'On-chain AI proof commitment and verification via AIProofRegistry. Commit plan hashes before execution, verify result hashes after. Ensures AI accountability with immutable on-chain proofs.',
  category:     'verification',
  version:      '1.0.0',
  price:        3,
  capabilities: ['proof-commit', 'proof-verify', 'ai-accountability', 'on-chain-execution'],
};

const SYSTEM_PROMPT = `You are a PayPol Proof Verifier agent for AIProofRegistry on Tempo blockchain.
Parse the user's proof request.

Return JSON:
{
  "action": "commit|verify|stats",
  "plan": "Description of the AI plan to commit (for commit only)",
  "commitmentId": "ID from previous commit (for verify only)",
  "result": "Execution result to verify against commitment (for verify only)",
  "nexusJobId": 0 (optional job ID to link the proof to)
}

ACTIONS:
- commit: Commit a plan hash on-chain before execution begins
- verify: Verify a result hash against a previous commitment
- stats: Get AIProofRegistry statistics

Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  if (!job.prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No proof request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Intent Parsing ──
    console.log(`[proof-verifier] Phase 1: Parsing proof intent...`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: job.prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let intent: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      intent = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'Failed to parse proof intent.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const { action } = intent;

    // ── Phase 2: On-Chain Execution ──

    if (action === 'commit') {
      const plan = intent.plan;
      if (!plan) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: 'Plan description is required for commit.',
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      const planHash = generatePlanHash(plan);
      const nexusJobId = intent.nexusJobId || 0;

      console.log(`[proof-verifier] Committing plan hash on-chain...`);
      const result = await commitOnChain(planHash, nexusJobId);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'proof-committed',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          proof: {
            commitmentId: result.commitmentId,
            planHash,
            plan,
            nexusJobId,
          },
          transaction: {
            hash: result.txHash,
            explorerUrl: result.explorerUrl,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'verify') {
      const { commitmentId, result: executionResult } = intent;
      if (!commitmentId || !executionResult) {
        return {
          jobId: job.jobId, agentId: job.agentId, status: 'error',
          error: 'commitmentId and result are required for verification.',
          executionTimeMs: Date.now() - start, timestamp: Date.now(),
        };
      }

      const resultHash = generateResultHash(executionResult);

      console.log(`[proof-verifier] Verifying result against commitment ${commitmentId}...`);
      const result = await verifyOnChain(commitmentId, resultHash);

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'proof-verified',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          verification: {
            commitmentId,
            resultHash,
            matched: result.matched,
            verdict: result.matched ? 'AI execution matches committed plan' : 'MISMATCH — AI deviated from committed plan',
          },
          transaction: {
            hash: result.txHash,
            explorerUrl: result.explorerUrl,
          },
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else if (action === 'stats') {
      console.log(`[proof-verifier] Fetching AIProofRegistry stats...`);
      const stats = await getProofStats();

      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'stats-retrieved',
          onChain: true,
          network: 'Tempo Moderato Testnet',
          chainId: TEMPO_CHAIN_ID,
          registryStats: stats,
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;

    } else {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Unknown proof action: ${action}. Supported: commit, verify, stats.`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

  } catch (err: any) {
    console.error(`[proof-verifier] Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Proof operation failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
