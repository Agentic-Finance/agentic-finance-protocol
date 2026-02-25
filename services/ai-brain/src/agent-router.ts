/**
 * Agent Router - Maps parsed intents to available agents
 *
 * Responsibilities:
 * - Discover available agents from the agents service
 * - Execute agent jobs via HTTP
 * - Handle single-agent and multi-agent routing
 */

import axios from 'axios';
import { ParsedIntent } from './intent-parser';

// ── Types ────────────────────────────────────────────────────

export interface AgentManifest {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  price: number;
  capabilities: string[];
}

export interface AgentExecutionResult {
  jobId: string;
  agentId: string;
  status: 'success' | 'error';
  result?: any;
  error?: string;
  executionTimeMs: number;
  timestamp: number;
}

// ── Config ───────────────────────────────────────────────────

const AGENTS_SERVICE_URL = process.env.AGENTS_SERVICE_URL || 'http://localhost:3001';

// ── Agent Router Class ───────────────────────────────────────

export class AgentRouter {
  private agentCache: Map<string, AgentManifest> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 30_000; // 30 seconds

  /**
   * Refresh the agent registry from the agents service.
   */
  async refreshAgents(): Promise<AgentManifest[]> {
    const now = Date.now();
    if (now - this.cacheTimestamp < this.CACHE_TTL_MS && this.agentCache.size > 0) {
      return [...this.agentCache.values()];
    }

    try {
      const res = await axios.get<AgentManifest[]>(`${AGENTS_SERVICE_URL}/agents`, { timeout: 5000 });
      this.agentCache.clear();
      for (const agent of res.data) {
        this.agentCache.set(agent.id, agent);
      }
      this.cacheTimestamp = now;
      console.log(`[router] Refreshed agent registry: ${this.agentCache.size} agents available`);
      return res.data;
    } catch (err: any) {
      console.error(`[router] Failed to refresh agents:`, err.message);
      return [...this.agentCache.values()];
    }
  }

  /**
   * Get agents required for an intent.
   */
  async resolveAgents(intent: ParsedIntent): Promise<AgentManifest[]> {
    await this.refreshAgents();

    const resolved: AgentManifest[] = [];
    for (const agentId of intent.requiredAgents) {
      const manifest = this.agentCache.get(agentId);
      if (manifest) {
        resolved.push(manifest);
      } else {
        console.warn(`[router] Agent '${agentId}' not found in registry, skipping`);
      }
    }

    return resolved;
  }

  /**
   * Execute a single agent job.
   */
  async executeAgent(
    agentId: string,
    prompt: string,
    payload?: Record<string, unknown>,
    callerWallet?: string,
  ): Promise<AgentExecutionResult> {
    const url = `${AGENTS_SERVICE_URL}/agents/${agentId}/execute`;

    console.log(`[router] Executing agent '${agentId}'...`);

    try {
      const res = await axios.post<AgentExecutionResult>(url, {
        prompt,
        payload,
        callerWallet: callerWallet || '',
      }, {
        timeout: 120_000, // 2 minutes - agents can take time (ZK proof gen, etc.)
      });

      console.log(`[router] Agent '${agentId}' returned: ${res.data.status} (${res.data.executionTimeMs}ms)`);
      return res.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      console.error(`[router] Agent '${agentId}' failed:`, errorMsg);
      return {
        jobId: '',
        agentId,
        status: 'error',
        error: errorMsg,
        executionTimeMs: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Execute multiple agents sequentially (for multi-step workflows).
   * Each agent receives the previous agent's result as context.
   */
  async executeSequential(
    agents: Array<{ agentId: string; prompt: string; payload?: Record<string, unknown> }>,
    callerWallet?: string,
  ): Promise<AgentExecutionResult[]> {
    const results: AgentExecutionResult[] = [];

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const prevResult = i > 0 ? results[i - 1] : null;

      // Enrich payload with previous agent's result
      const enrichedPayload = {
        ...agent.payload,
        ...(prevResult?.result ? { previousAgentResult: prevResult.result } : {}),
      };

      const result = await this.executeAgent(
        agent.agentId,
        agent.prompt,
        enrichedPayload,
        callerWallet,
      );

      results.push(result);

      // If an agent fails, stop the chain
      if (result.status === 'error') {
        console.error(`[router] Sequential chain stopped at agent '${agent.agentId}' due to error`);
        break;
      }
    }

    return results;
  }

  /**
   * Get all available agents.
   */
  async listAgents(): Promise<AgentManifest[]> {
    return this.refreshAgents();
  }

  /**
   * Calculate total cost for a set of agents.
   */
  calculateCost(agents: AgentManifest[]): number {
    return agents.reduce((sum, a) => sum + a.price, 0);
  }
}
