import axios from 'axios';
import { randomUUID } from 'crypto';
import { AgentManifest, JobRequest, JobResult, HireOptions } from './types';

/**
 * Client for discovering and hiring agents from the PayPol marketplace.
 *
 * Usage:
 *   const client = new AgentClient('http://localhost:3001');
 *   const agents = await client.listAgents();
 *   const result = await client.hire('contract-auditor', 'Audit this contract...', { callerWallet: '0x...' });
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
}
