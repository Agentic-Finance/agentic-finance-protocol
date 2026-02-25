/**
 * Workflow Engine - Manages multi-step agent workflows
 *
 * Supports:
 * - Single-agent execution
 * - Multi-agent sequential chains
 * - Conditional branching (if audit passes → deploy)
 * - Result aggregation
 */

import { ParsedIntent } from './intent-parser';
import { AgentRouter, AgentExecutionResult, AgentManifest } from './agent-router';
import { EscrowManager, EscrowRecord } from './escrow-manager';

// ── Types ────────────────────────────────────────────────────

export type WorkflowStatus = 'created' | 'running' | 'completed' | 'failed' | 'settled';

export interface WorkflowStep {
  stepId: number;
  agentId: string;
  prompt: string;
  payload?: Record<string, unknown>;
  condition?: string;        // e.g., 'previous.auditResult.passed === true'
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  result?: AgentExecutionResult;
  escrow?: EscrowRecord;
}

export interface Workflow {
  id: string;
  intent: ParsedIntent;
  callerWallet: string;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  createdAt: number;
  completedAt?: number;
  totalCost: number;
  results: AgentExecutionResult[];
}

// ── Workflow Engine Class ────────────────────────────────────

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private router: AgentRouter;
  private escrowManager: EscrowManager;

  constructor(router: AgentRouter, escrowManager: EscrowManager) {
    this.router = router;
    this.escrowManager = escrowManager;
  }

  /**
   * Create a workflow from a parsed intent.
   */
  async createWorkflow(intent: ParsedIntent, callerWallet: string): Promise<Workflow> {
    const agents = await this.router.resolveAgents(intent);
    const workflowId = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Build workflow steps
    const steps = this.buildSteps(intent, agents);

    const workflow: Workflow = {
      id: workflowId,
      intent,
      callerWallet,
      steps,
      status: 'created',
      createdAt: Date.now(),
      totalCost: this.router.calculateCost(agents),
      results: [],
    };

    this.workflows.set(workflowId, workflow);
    console.log(`[workflow] Created workflow ${workflowId} with ${steps.length} steps`);

    return workflow;
  }

  /**
   * Execute a workflow end-to-end.
   */
  async executeWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow '${workflowId}' not found`);

    workflow.status = 'running';
    console.log(`[workflow] Executing workflow ${workflowId}...`);

    for (const step of workflow.steps) {
      // Check condition (if any)
      if (step.condition && !this.evaluateCondition(step.condition, workflow)) {
        step.status = 'skipped';
        console.log(`[workflow] Step ${step.stepId} (${step.agentId}) skipped - condition not met`);
        continue;
      }

      step.status = 'running';

      // Create escrow for this step (if wallet connected)
      if (workflow.callerWallet) {
        try {
          const escrow = await this.escrowManager.lockEscrowForStep(
            step.agentId,
            workflow.callerWallet,
            step.stepId,
          );
          step.escrow = escrow;
        } catch (err: any) {
          console.warn(`[workflow] Escrow lock failed for step ${step.stepId}: ${err.message}`);
          // Continue without escrow - not blocking
        }
      }

      // Enrich prompt with context from previous steps
      const enrichedPrompt = this.enrichPrompt(step, workflow);
      const enrichedPayload = this.enrichPayload(step, workflow);

      // Execute agent
      const result = await this.router.executeAgent(
        step.agentId,
        enrichedPrompt,
        enrichedPayload,
        workflow.callerWallet,
      );

      step.result = result;
      workflow.results.push(result);

      if (result.status === 'success') {
        step.status = 'completed';
        console.log(`[workflow] Step ${step.stepId} (${step.agentId}) completed`);
      } else {
        step.status = 'failed';
        console.error(`[workflow] Step ${step.stepId} (${step.agentId}) failed: ${result.error}`);
        workflow.status = 'failed';
        break;
      }
    }

    // If all steps completed
    if (workflow.status !== 'failed') {
      workflow.status = 'completed';
      workflow.completedAt = Date.now();

      // Settle all escrows
      for (const step of workflow.steps) {
        if (step.escrow && step.status === 'completed') {
          try {
            await this.escrowManager.settleEscrow(step.escrow);
          } catch (err: any) {
            console.warn(`[workflow] Escrow settlement failed for step ${step.stepId}: ${err.message}`);
          }
        }
      }

      workflow.status = 'settled';
    }

    console.log(`[workflow] Workflow ${workflowId} finished: ${workflow.status}`);
    return workflow;
  }

  /**
   * Get workflow status.
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * List all workflows.
   */
  listWorkflows(): Workflow[] {
    return [...this.workflows.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  // ── Private Helpers ────────────────────────────────────────

  private buildSteps(intent: ParsedIntent, agents: AgentManifest[]): WorkflowStep[] {
    const steps: WorkflowStep[] = [];

    // Common multi-step patterns
    if (intent.isMultiStep && intent.requiredAgents.includes('contract-auditor') && intent.requiredAgents.includes('contract-deploy-pro')) {
      // Audit → Deploy (conditional)
      steps.push({
        stepId: 1,
        agentId: 'contract-auditor',
        prompt: intent.entities.contractSource
          ? `Audit this contract:\n${intent.entities.contractSource}`
          : `Audit contract: ${intent.summary}`,
        payload: intent.entities.contractSource ? { requirements: intent.entities.contractSource } : undefined,
        status: 'pending',
      });

      steps.push({
        stepId: 2,
        agentId: 'contract-deploy-pro',
        prompt: `Deploy the audited contract: ${intent.summary}`,
        payload: intent.entities.contractSource ? { sourceCode: intent.entities.contractSource } : undefined,
        condition: 'previous.result.auditResult?.passed !== false',
        status: 'pending',
      });

      return steps;
    }

    // Default: single step per agent in order
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      steps.push({
        stepId: i + 1,
        agentId: agent.id,
        prompt: intent.summary || `Execute: ${intent.action}`,
        payload: this.buildPayloadForAgent(agent.id, intent),
        status: 'pending',
      });
    }

    return steps;
  }

  private buildPayloadForAgent(agentId: string, intent: ParsedIntent): Record<string, unknown> | undefined {
    switch (agentId) {
      case 'payroll-planner':
        return {
          employees: intent.entities.recipients || [],
          budget: intent.estimatedBudget,
          execute: true,
        };
      case 'token-deployer':
        return { requirements: intent.summary };
      case 'contract-deploy-pro':
        return {
          requirements: intent.entities.contractSource || intent.summary,
          sourceCode: intent.entities.contractSource,
        };
      case 'escrow-manager':
        return {
          workerWallet: intent.entities.recipient,
          amount: intent.entities.amount,
          deadlineHours: intent.entities.duration || 48,
        };
      default:
        return undefined;
    }
  }

  private enrichPrompt(step: WorkflowStep, workflow: Workflow): string {
    const prevResults = workflow.results;
    if (prevResults.length === 0) return step.prompt;

    const lastResult = prevResults[prevResults.length - 1];
    const contextNote = lastResult.status === 'success'
      ? `\n\n[Context from previous step: ${JSON.stringify(lastResult.result).slice(0, 500)}]`
      : '';

    return step.prompt + contextNote;
  }

  private enrichPayload(step: WorkflowStep, workflow: Workflow): Record<string, unknown> | undefined {
    const prevResults = workflow.results;
    if (prevResults.length === 0) return step.payload;

    const lastResult = prevResults[prevResults.length - 1];
    return {
      ...step.payload,
      previousAgentResult: lastResult.result,
    };
  }

  private evaluateCondition(condition: string, workflow: Workflow): boolean {
    try {
      const lastResult = workflow.results[workflow.results.length - 1];
      if (!lastResult || lastResult.status === 'error') return false;

      // Simple condition evaluation
      if (condition.includes('passed') && condition.includes('false')) {
        // "previous.result.auditResult?.passed !== false"
        const auditResult = (lastResult.result as any)?.auditResult;
        return auditResult?.passed !== false;
      }

      // Default: proceed if previous succeeded
      return lastResult.status === 'success';
    } catch {
      return true; // If condition evaluation fails, proceed anyway
    }
  }
}
