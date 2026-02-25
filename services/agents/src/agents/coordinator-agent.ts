/**
 * Coordinator Agent - A2A Task Decomposer & Orchestrator
 *
 * The coordinator agent receives complex prompts, uses Claude to decompose them
 * into sub-tasks, and autonomously hires other agents to execute each sub-task.
 * Each sub-task gets its own NexusV2 escrow on Tempo L1.
 *
 * Example: "Audit my contract and deploy if safe"
 *   → Step 1: Hire contract-auditor → creates escrow → audit
 *   → Step 2: If audit passed → Hire contract-deploy-pro → creates escrow → deploy
 *   → Return aggregated results with all tx hashes
 *
 * This creates A2A chains: real on-chain transactions where agents hire agents.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentDescriptor, AgentHandler, JobResult,
  A2AJobResult, CoordinatorPlan, CoordinatorStep,
} from '../types';
import { A2AClient, A2AHireResult } from '../a2a-client';
import { getWallet, TEMPO_CHAIN_ID } from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'coordinator',
  name:         'A2A Coordinator',
  description:  'Decomposes complex tasks into sub-tasks and autonomously hires other agents to execute them. Creates Agent-to-Agent (A2A) chains with NexusV2 escrow for each sub-task. Real on-chain execution on Tempo L1.',
  category:     'orchestration',
  version:      '1.0.0',
  price:        20,
  capabilities: [
    'task-decomposition', 'a2a-hiring', 'multi-agent-orchestration',
    'on-chain-execution', 'escrow-management', 'conditional-branching',
  ],
};

// ── Available agents the coordinator can hire ──

const AVAILABLE_AGENTS = [
  { id: 'contract-auditor',    price: 10,  description: 'Audit Solidity contracts for vulnerabilities' },
  { id: 'contract-deploy-pro', price: 280, description: 'Compile and deploy Solidity contracts on Tempo L1' },
  { id: 'token-deployer',      price: 350, description: 'Deploy ERC-20 tokens on Tempo L1 with tokenomics' },
  { id: 'payroll-planner',     price: 3,   description: 'Batch payroll execution via MultisendVault' },
  { id: 'escrow-manager',      price: 5,   description: 'Create/settle NexusV2 escrow jobs' },
  { id: 'shield-executor',     price: 10,  description: 'Execute ZK-SNARK shielded payments' },
  { id: 'yield-optimizer',     price: 50,  description: 'DeFi APY strategy optimization' },
  { id: 'gas-predictor',       price: 2,   description: 'Optimal gas timing for transactions' },
  { id: 'risk-analyzer',       price: 30,  description: 'DeFi portfolio risk assessment' },
  { id: 'compliance-advisor',  price: 25,  description: 'Crypto regulatory compliance check' },
];

const SYSTEM_PROMPT = `You are a PayPol A2A Coordinator. Your job is to decompose complex user requests into a sequence of sub-tasks that other AI agents can execute.

Available agents you can hire:
${AVAILABLE_AGENTS.map(a => `- ${a.id} ($${a.price}): ${a.description}`).join('\n')}

Rules:
1. Each step must use exactly one agent from the list above.
2. Steps can depend on previous steps (use dependsOn array).
3. Each step needs a clear prompt that the target agent can understand.
4. Budget allocation per step should match the agent's price (or more for larger tasks).
5. Total budget = sum of all step budgets.
6. Keep chains short (2-4 steps max) for efficiency.
7. Only include agents that are truly needed for the task.

Return JSON:
{
  "steps": [
    {
      "stepIndex": 0,
      "agentId": "contract-auditor",
      "prompt": "Audit this Solidity contract for reentrancy, overflow, and access control vulnerabilities...",
      "budgetAllocation": 10,
      "dependsOn": []
    },
    {
      "stepIndex": 1,
      "agentId": "contract-deploy-pro",
      "prompt": "Deploy this audited contract on Tempo L1...",
      "budgetAllocation": 280,
      "dependsOn": [0]
    }
  ],
  "reasoning": "The user wants to audit and deploy a contract. Step 1 audits for vulnerabilities, Step 2 deploys only after audit passes."
}

Return ONLY valid JSON, no markdown fences.`;

// ── Handler ──

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const prompt = job.prompt;

  if (!prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No task description provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: Claude decomposes the task into a plan ──
    console.log(`[coordinator] 🧠 Phase 1: Decomposing task into sub-tasks...`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let planData: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      planData = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'Claude returned invalid JSON for task decomposition.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const a2aChainId = `chain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const steps: CoordinatorStep[] = planData.steps || [];
    const totalBudget = steps.reduce((sum: number, s: CoordinatorStep) => sum + (s.budgetAllocation || 0), 0);

    const plan: CoordinatorPlan = {
      chainId: a2aChainId,
      steps,
      totalBudget,
      reasoning: planData.reasoning || '',
    };

    console.log(`[coordinator] 📋 Plan: ${steps.length} steps, total budget: $${totalBudget}`);
    for (const step of steps) {
      console.log(`  Step ${step.stepIndex}: ${step.agentId} ($${step.budgetAllocation}) - depends on: [${step.dependsOn.join(', ')}]`);
    }

    // ── Phase 2: Execute sub-tasks via A2A ──
    console.log(`[coordinator] 🚀 Phase 2: Executing A2A chain...`);

    const a2aClient = new A2AClient();
    const childResults: A2AHireResult[] = [];
    const completedSteps = new Set<number>();

    // Determine A2A depth from parent context
    const parentDepth = (job.payload as any)?._a2a?.depth || 0;

    // Execute steps in dependency order
    for (const step of steps) {
      // Check dependencies
      const depsOk = step.dependsOn.every((dep: number) => completedSteps.has(dep));
      if (!depsOk) {
        console.warn(`[coordinator] ⏭️ Skipping step ${step.stepIndex}: dependencies not met`);
        continue;
      }

      // Check if previous step failed (conditional branching)
      if (step.dependsOn.length > 0) {
        const depResults = childResults.filter(r =>
          steps.find(s => s.stepIndex === step.dependsOn.find(d =>
            steps[d]?.agentId === r.agentId
          ))
        );
        const anyFailed = depResults.some(r => r.status === 'error');
        if (anyFailed) {
          console.warn(`[coordinator] ⏭️ Skipping step ${step.stepIndex}: dependency failed`);
          continue;
        }
      }

      // Enrich prompt with context from previous steps
      let enrichedPrompt = step.prompt;
      if (childResults.length > 0) {
        const lastResult = childResults[childResults.length - 1];
        if (lastResult.status === 'success' && lastResult.result) {
          const contextSnippet = JSON.stringify(lastResult.result).slice(0, 1000);
          enrichedPrompt += `\n\n[Context from previous agent (${lastResult.agentId}): ${contextSnippet}]`;
        }
      }

      // Hire the agent
      console.log(`[coordinator] 🔗 Step ${step.stepIndex}: Hiring ${step.agentId}...`);
      const result = await a2aClient.hireAgent({
        targetAgentId: step.agentId,
        prompt: enrichedPrompt,
        parentJobId: job.jobId,
        parentAgentId: 'coordinator',
        a2aChainId,
        depth: parentDepth + 1,
        budgetAllocation: step.budgetAllocation,
        callerWallet: job.callerWallet,
      });

      childResults.push(result);

      if (result.status === 'success') {
        completedSteps.add(step.stepIndex);
        console.log(`[coordinator] ✅ Step ${step.stepIndex} (${step.agentId}) completed`);
      } else {
        console.error(`[coordinator] ❌ Step ${step.stepIndex} (${step.agentId}) failed: ${result.error}`);
        // Don't break - let dependent steps be skipped naturally
      }
    }

    // ── Phase 3: Aggregate results ──
    const allSuccess = childResults.every(r => r.status === 'success');
    const totalExecTime = Date.now() - start;

    const a2aResult: A2AJobResult = {
      jobId: job.jobId,
      agentId: job.agentId,
      status: allSuccess ? 'success' : 'error',
      a2aChainId,
      childJobs: childResults.map(r => ({
        childJobId: r.jobId,
        childAgentId: r.agentId,
        status: r.status,
        onChainJobId: r.onChainJobId,
        result: r.result,
      })),
      result: {
        phase: 'a2a-chain-complete',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        a2a: {
          chainId: a2aChainId,
          plan,
          totalSteps: steps.length,
          completedSteps: completedSteps.size,
          totalBudget,
          childJobs: childResults.map(r => ({
            jobId: r.jobId,
            agentId: r.agentId,
            status: r.status,
            onChainJobId: r.onChainJobId,
            escrowTxHash: r.escrowTxHash,
            settleTxHash: r.settleTxHash,
            executionTimeMs: r.executionTimeMs,
          })),
          totalOnChainTxs: childResults.reduce((count, r) => {
            let txs = 0;
            if (r.escrowTxHash) txs++; // createJob
            if (r.settleTxHash) txs++; // settleJob
            return count + txs;
          }, 0),
        },
        summary: allSuccess
          ? `A2A chain completed: ${completedSteps.size}/${steps.length} steps executed, ${childResults.length} agents hired`
          : `A2A chain partially failed: ${completedSteps.size}/${steps.length} steps completed`,
      },
      executionTimeMs: totalExecTime,
      timestamp: Date.now(),
    };

    console.log(`[coordinator] ${allSuccess ? '✅' : '⚠️'} A2A chain ${a2aChainId}: ${completedSteps.size}/${steps.length} steps, ${totalExecTime}ms`);

    return a2aResult;

  } catch (err: any) {
    console.error(`[coordinator] ❌ Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Coordinator failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
