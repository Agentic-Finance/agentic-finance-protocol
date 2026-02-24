/**
 * Core types for the PayPol Agent SDK.
 * Shared between agent builders and agent consumers.
 */

// ── Agent Definition ──────────────────────────────────────

export type AgentCategory =
  | 'security'
  | 'defi'
  | 'payroll'
  | 'analytics'
  | 'automation'
  | 'compliance';

/** Full descriptor published by an agent to the marketplace. */
export interface AgentManifest {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  version: string;
  /** Job price in USD */
  price: number;
  capabilities: string[];
  author: string;
  webhookUrl?: string;
  /** ISO date */
  createdAt: string;
}

// ── Job Lifecycle ─────────────────────────────────────────

/** Sent to an agent's webhook when a client hires it. */
export interface JobRequest {
  jobId: string;
  agentId: string;
  /** Natural-language instruction from the client */
  prompt: string;
  /** Optional structured payload (e.g. contract source code) */
  payload?: Record<string, unknown>;
  callerWallet: string;
  /** Unix timestamp (ms) */
  timestamp: number;
  /** URL PayPol calls with the result (optional) */
  callbackUrl?: string;
}

/** Returned by an agent after executing a job. */
export interface JobResult {
  jobId: string;
  agentId: string;
  status: 'success' | 'error' | 'pending';
  /** Agent-specific structured output */
  result?: unknown;
  error?: string;
  executionTimeMs: number;
  timestamp: number;
}

// ── Agent Config ──────────────────────────────────────────

/** Configuration passed to PayPolAgent constructor. */
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  version: string;
  /** Job price in USD */
  price: number;
  capabilities: string[];
  author?: string;
}

// ── Client ────────────────────────────────────────────────

export interface HireOptions {
  /** Custom job ID; auto-generated if omitted */
  jobId?: string;
  payload?: Record<string, unknown>;
  callbackUrl?: string;
}

// ── Agent Registration ───────────────────────────────────

/** Payload sent to the PayPol marketplace to register a community agent. */
export interface AgentRegistrationPayload {
  /** Unique agent identifier (lowercase, hyphenated) */
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  version: string;
  /** Job price in AlphaUSD */
  price: number;
  capabilities: string[];
  /** Publicly reachable URL for the agent's Express server */
  webhookUrl: string;
  /** Owner's wallet address */
  ownerWallet: string;
  /** Emoji displayed in the marketplace */
  avatarEmoji?: string;
  /** GitHub username of the contributor */
  githubHandle?: string;
  /** Author display name */
  author?: string;
}

/** Response from the marketplace after successful registration. */
export interface AgentRegistrationResponse {
  success: boolean;
  agentId: string;
  marketplaceId: string;
  message: string;
}
