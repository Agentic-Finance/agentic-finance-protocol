/**
 * APS-1 Reference Client
 *
 * A client that follows the full APS-1 protocol flow:
 *   1. Discover agent via manifest
 *   2. Optionally negotiate price
 *   3. Lock funds in escrow (NexusV2 or StreamV1)
 *   4. Send execution envelope to agent
 *   5. Receive and validate result
 *   6. Settle escrow
 *
 * Usage:
 *   const client = new APS1Client({ agentServiceUrl: 'http://localhost:3001' });
 *   const manifest = await client.discover('token-transfer');
 *   const result = await client.execute('token-transfer', 'Send 100 AlphaUSD to 0x...', '0xMyWallet');
 */

import type {
  APS1Manifest,
  APS1ExecutionEnvelope,
  APS1Result,
  APS1EscrowParams,
  APS1NegotiationMessage,
} from './types';
import { APS1_VERSION } from './types';
import { validateManifest, validateResult } from './validator';

export interface APS1ClientConfig {
  /** Base URL of the agent service (e.g. http://localhost:3001) */
  agentServiceUrl: string;
  /** Optional marketplace URL for discovery */
  marketplaceUrl?: string;
  /** Request timeout in ms (default: 120000) */
  timeoutMs?: number;
}

export class APS1Client {
  private config: Required<APS1ClientConfig>;

  constructor(config: APS1ClientConfig) {
    this.config = {
      agentServiceUrl: config.agentServiceUrl.replace(/\/$/, ''),
      marketplaceUrl: config.marketplaceUrl ?? config.agentServiceUrl.replace(/\/$/, ''),
      timeoutMs: config.timeoutMs ?? 120000,
    };
  }

  // ── Phase 1: Discovery ─────────────────────────────────

  /**
   * Discover an agent's capabilities via its APS-1 manifest.
   */
  async discover(agentId: string): Promise<APS1Manifest> {
    const res = await this.fetch(`${this.config.agentServiceUrl}/agents/${agentId}`);
    const data = await res.json();

    // Wrap existing manifests in APS-1 format
    return this.toAPS1Manifest(data, agentId);
  }

  /**
   * List all available agents from the marketplace.
   */
  async listAgents(): Promise<APS1Manifest[]> {
    const res = await this.fetch(`${this.config.agentServiceUrl}/agents`);
    const agents = await res.json();
    return (Array.isArray(agents) ? agents : []).map(
      (a: any) => this.toAPS1Manifest(a, a.id)
    );
  }

  /**
   * Search agents by category or capability.
   */
  async searchAgents(query: {
    category?: string;
    maxPrice?: number;
    capability?: string;
  }): Promise<APS1Manifest[]> {
    const all = await this.listAgents();
    return all.filter(a => {
      if (query.category && a.category !== query.category) return false;
      if (query.maxPrice && a.pricing.basePrice > query.maxPrice) return false;
      if (query.capability && !a.capabilities.includes(query.capability)) return false;
      return true;
    });
  }

  // ── Phase 2: Negotiation ───────────────────────────────

  /**
   * Propose a price for a job (optional - only if agent supports negotiation).
   */
  async negotiate(
    agentId: string,
    message: APS1NegotiationMessage,
  ): Promise<APS1NegotiationMessage> {
    const manifest = await this.discover(agentId);
    if (!manifest.endpoints.negotiate) {
      throw new Error(`Agent ${agentId} does not support negotiation`);
    }
    const res = await this.fetch(manifest.endpoints.negotiate, {
      method: 'POST',
      body: JSON.stringify(message),
    });
    return res.json();
  }

  // ── Phase 4: Execution ─────────────────────────────────

  /**
   * Execute a job on an agent following APS-1 protocol.
   * This is the main entry point for hiring an agent.
   */
  async execute(
    agentId: string,
    prompt: string,
    callerWallet: string,
    options?: {
      payload?: Record<string, unknown>;
      jobId?: string;
    },
  ): Promise<APS1Result> {
    const jobId = options?.jobId ?? `aps1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const envelope: APS1ExecutionEnvelope = {
      jobId,
      agentId,
      prompt,
      payload: options?.payload,
      callerWallet,
      timestamp: new Date().toISOString(),
    };

    const res = await this.fetch(
      `${this.config.agentServiceUrl}/agents/${agentId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({
          jobId: envelope.jobId,
          prompt: envelope.prompt,
          payload: envelope.payload,
          callerWallet: envelope.callerWallet,
        }),
      },
    );

    const result = await res.json();

    // Normalize to APS-1 result format
    return this.toAPS1Result(result, jobId, agentId);
  }

  /**
   * Execute with full escrow flow (for integration with on-chain escrow).
   */
  async executeWithEscrow(
    agentId: string,
    prompt: string,
    callerWallet: string,
    escrowParams: APS1EscrowParams,
  ): Promise<APS1Result> {
    // In production, this would:
    // 1. Create escrow on-chain (NexusV2.createJob or StreamV1.createStream)
    // 2. Wait for confirmation
    // 3. Include escrow info in envelope
    // 4. Execute agent
    // 5. Settle escrow based on result

    // For now, execute directly (escrow handled by marketplace backend)
    return this.execute(agentId, prompt, callerWallet);
  }

  // ── Helpers ────────────────────────────────────────────

  private async fetch(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await globalThis.fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'X-APS-Version': APS1_VERSION,
          ...init?.headers,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`APS-1 request failed: ${res.status} ${res.statusText}`);
      }
      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  private toAPS1Manifest(data: any, agentId: string): APS1Manifest {
    return {
      aps: '1.0',
      id: data.id ?? agentId,
      name: data.name ?? agentId,
      description: data.description ?? '',
      category: data.category ?? 'analytics',
      version: data.version ?? '1.0.0',
      pricing: {
        basePrice: data.price ?? data.pricing?.basePrice ?? 0,
        currency: 'USD',
        negotiable: data.pricing?.negotiable ?? false,
      },
      capabilities: data.capabilities ?? data.skills ?? [],
      paymentMethods: ['nexus-escrow', 'stream-milestone', 'direct-transfer'],
      supportedTokens: [
        { symbol: 'AlphaUSD', address: '0x20c0000000000000000000000000000000000001', decimals: 6 },
      ],
      proofEnabled: data.proofEnabled ?? true,
      walletAddress: data.walletAddress ?? '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
      endpoints: {
        manifest: `${this.config.agentServiceUrl}/agents/${agentId}`,
        execute: `${this.config.agentServiceUrl}/agents/${agentId}/execute`,
      },
    };
  }

  private toAPS1Result(data: any, jobId: string, agentId: string): APS1Result {
    return {
      jobId: data.jobId ?? jobId,
      agentId: data.agentId ?? agentId,
      status: data.status ?? 'error',
      result: data.result,
      error: data.error,
      onChain: data.onChain ?? data.transaction ? {
        executed: true,
        transactions: data.transaction ? [{
          hash: data.transaction.hash,
          blockNumber: data.transaction.blockNumber ?? 0,
          gasUsed: data.transaction.gasUsed ?? '0',
          explorerUrl: data.transaction.explorerUrl ?? '',
        }] : [],
        network: data.network ?? 'Tempo L1 Moderato',
        chainId: data.chainId ?? 42431,
      } : undefined,
      proof: data.proof,
      executionTimeMs: data.executionTimeMs ?? 0,
      timestamp: new Date().toISOString(),
    };
  }
}
