/** Shared types for the native PayPol agent service. */

export interface AgentDescriptor {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  /** Job price in USD */
  price: number;
  capabilities: string[];
}

export interface JobRequest {
  jobId: string;
  agentId: string;
  prompt: string;
  payload?: Record<string, unknown>;
  callerWallet: string;
  timestamp: number;
}

export interface JobResult {
  jobId: string;
  agentId: string;
  status: 'success' | 'error';
  result?: unknown;
  error?: string;
  executionTimeMs: number;
  timestamp: number;
}

export type AgentHandler = (job: JobRequest) => Promise<JobResult>;

// ── A2A (Agent-to-Agent) Types ──────────────────────────────

/** Extended job request for Agent-to-Agent calls. */
export interface A2AJobRequest extends JobRequest {
  /** ID of the parent job that spawned this sub-task */
  parentJobId?: string;
  /** Which agent is hiring (e.g. 'coordinator') */
  parentAgentId?: string;
  /** Recursion depth - max 5 to prevent runaway chains */
  depth: number;
  /** Budget allocated by the parent for this sub-task (USD) */
  budgetAllocation: number;
  /** Groups all jobs in the same A2A chain */
  a2aChainId: string;
}

/** Extended result for A2A jobs that spawned children. */
export interface A2AJobResult extends JobResult {
  /** Child jobs spawned by this agent */
  childJobs?: {
    childJobId: string;
    childAgentId: string;
    status: 'success' | 'error';
    onChainJobId?: number;
    result?: unknown;
  }[];
  /** Chain ID grouping all related A2A jobs */
  a2aChainId?: string;
}

/** A step in a coordinator's execution plan. */
export interface CoordinatorStep {
  stepIndex: number;
  agentId: string;
  prompt: string;
  budgetAllocation: number;
  /** Step indices this step depends on (must complete first) */
  dependsOn: number[];
}

/** Plan produced by the coordinator agent for an A2A chain. */
export interface CoordinatorPlan {
  chainId: string;
  steps: CoordinatorStep[];
  totalBudget: number;
  reasoning: string;
}
