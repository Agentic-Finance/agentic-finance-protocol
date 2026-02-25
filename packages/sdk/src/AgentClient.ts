import axios from 'axios';
import { randomUUID } from 'crypto';
import { AgentManifest, JobRequest, JobResult, HireOptions, EscrowParams, ReputationScore } from './types';

/**
 * Client for discovering and hiring agents from the PayPol marketplace.
 *
 * Usage:
 *   const client = new AgentClient('http://localhost:3001');
 *   const agents = await client.listAgents();
 *   const result = await client.hire('contract-auditor', 'Audit this contract...', '0x...');
 *
 * APS-1 integration:
 *   const rep = await client.getReputation('contract-auditor');
 *   const filtered = await client.searchAgents({ category: 'security', maxPrice: 10 });
 */
export class AgentClient {
  constructor(private readonly baseUrl: string) {}

  // ── Discovery ──────────────────────────────────────────

  /** List all active agents in the marketplace. */
  async listAgents(): Promise<AgentManifest[]> {
    const { data } = await axios.get<AgentManifest[]>(`${this.baseUrl}/agents`);
    return data;
  }

  /** Get a single agent's manifest by ID. */
  async getAgent(agentId: string): Promise<AgentManifest> {
    const { data } = await axios.get<AgentManifest>(`${this.baseUrl}/agents/${agentId}`);
    return data;
  }

  /**
   * Search agents by category, price, or capability.
   * Filters are applied client-side on the full agent list.
   */
  async searchAgents(query: {
    category?: string;
    maxPrice?: number;
    capability?: string;
  }): Promise<AgentManifest[]> {
    const all = await this.listAgents();
    return all.filter(a => {
      if (query.category && a.category !== query.category) return false;
      if (query.maxPrice && a.price > query.maxPrice) return false;
      if (query.capability && !a.capabilities.includes(query.capability)) return false;
      return true;
    });
  }

  // ── Hiring ─────────────────────────────────────────────

  /**
   * Hire an agent to execute a job.
   * @param agentId      Target agent ID
   * @param prompt       Natural-language instruction
   * @param callerWallet Wallet address of the client
   * @param options      Optional jobId, payload, callbackUrl
   */
  async hire(
    agentId: string,
    prompt: string,
    callerWallet: string,
    options: HireOptions = {},
  ): Promise<JobResult> {
    const job: JobRequest = {
      jobId:        options.jobId ?? randomUUID(),
      agentId,
      prompt,
      payload:      options.payload,
      callerWallet,
      timestamp:    Date.now(),
      callbackUrl:  options.callbackUrl,
    };

    const { data } = await axios.post<JobResult>(
      `${this.baseUrl}/agents/${agentId}/execute`,
      job,
    );
    return data;
  }

  /**
   * Hire an agent with escrow protection (APS-1 flow).
   * Creates an on-chain escrow before execution, then settles after.
   *
   * @param agentId      Target agent ID
   * @param prompt       Natural-language instruction
   * @param callerWallet Wallet address of the client
   * @param escrow       Escrow parameters (method, token, amount)
   */
  async hireWithEscrow(
    agentId: string,
    prompt: string,
    callerWallet: string,
    escrow: EscrowParams,
  ): Promise<JobResult> {
    const jobId = randomUUID();

    const { data } = await axios.post<JobResult>(
      `${this.baseUrl}/agents/${agentId}/execute`,
      {
        jobId,
        agentId,
        prompt,
        callerWallet,
        timestamp: Date.now(),
        escrow: {
          method: escrow.method,
          token: escrow.token,
          amount: escrow.amount,
          deadlineSeconds: escrow.deadlineSeconds ?? 86400,
        },
      },
    );
    return data;
  }

  // ── Reputation ─────────────────────────────────────────

  /**
   * Get the on-chain reputation score for an agent.
   * Reads from the ReputationRegistry contract via the marketplace API.
   */
  async getReputation(agentIdOrWallet: string): Promise<ReputationScore> {
    const { data } = await axios.get<ReputationScore>(
      `${this.baseUrl}/api/reputation`,
      { params: { wallet: agentIdOrWallet } },
    );
    return data;
  }
}
