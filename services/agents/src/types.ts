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
