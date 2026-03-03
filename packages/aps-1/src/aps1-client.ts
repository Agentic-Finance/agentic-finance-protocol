/**
 * APS-1 Reference Client v2.1
 *
 * A client that follows the full APS-1 protocol flow:
 *   1. Discover agent via manifest
 *   2. Optionally negotiate price (with auto-retry)
 *   3. Lock funds in escrow (NexusV2 or StreamV1) via EscrowProvider
 *   4. Commit AI proof (if enabled) via ProofProvider
 *   5. Send execution envelope to agent
 *   6. Verify AI proof against result
 *   7. Settle escrow based on result
 *
 * v2.0 Changes:
 * - Real escrow flow via pluggable APS1EscrowProvider
 * - Real AI proof via pluggable APS1ProofProvider
 * - Multi-round auto-negotiation
 * - A2A sub-task delegation
 * - Lifecycle event emission
 * - Structured error codes
 *
 * Usage:
 *   const client = new APS1Client({
 *     agentServiceUrl: 'http://localhost:3001',
 *     escrowProvider: new NexusV2EscrowProvider(signer),
 *     proofProvider: new AIProofRegistryProvider(signer),
 *   });
 *
 *   // Simple execution (no escrow)
 *   const result = await client.execute('token-transfer', 'Send 100 AlphaUSD to 0x...', '0xMyWallet');
 *
 *   // Full escrow flow
 *   const result = await client.executeWithEscrow('contract-auditor', 'Audit this contract', '0xMyWallet', {
 *     method: 'nexus-escrow',
 *     token: '0x20c0000000000000000000000000000000000001',
 *     amount: '5000000',
 *     amountUSD: 5,
 *     deadlineSeconds: 172800,
 *     workerWallet: '0xAgentWallet',
 *   });
 */

import type {
  APS1Manifest,
  APS1ExecutionEnvelope,
  APS1Result,
  APS1EscrowParams,
  APS1EscrowProvider,
  APS1ProofProvider,
  APS1NegotiationMessage,
  APS1Settlement,
  APS1Event,
  APS1EventType,
  APS1ReputationSnapshot,
  APS1A2ARequest,
} from './types';
import {
  APS1_VERSION,
  APS1_MAX_NEGOTIATION_ROUNDS,
  APS1ErrorCode,
} from './types';
import { validateManifest, validateResult } from './validator';

// ── Configuration ─────────────────────────────────────────

export interface APS1ClientConfig {
  /** Base URL of the agent service (e.g. http://localhost:3001) */
  agentServiceUrl: string;
  /** Optional marketplace URL for discovery */
  marketplaceUrl?: string;
  /** Request timeout in ms (default: 120000) */
  timeoutMs?: number;
  /** Escrow provider for on-chain escrow operations (v2.0) */
  escrowProvider?: APS1EscrowProvider;
  /** Proof provider for AI execution verification (v2.0) */
  proofProvider?: APS1ProofProvider;
  /** Event listener for lifecycle events (v2.0) */
  onEvent?: (event: APS1Event) => void;
}

// ── Client ────────────────────────────────────────────────

export class APS1Client {
  private config: Required<Omit<APS1ClientConfig, 'escrowProvider' | 'proofProvider' | 'onEvent'>>;
  private escrowProvider?: APS1EscrowProvider;
  private proofProvider?: APS1ProofProvider;
  private onEvent?: (event: APS1Event) => void;

  constructor(config: APS1ClientConfig) {
    this.config = {
      agentServiceUrl: config.agentServiceUrl.replace(/\/$/, ''),
      marketplaceUrl: config.marketplaceUrl ?? config.agentServiceUrl.replace(/\/$/, ''),
      timeoutMs: config.timeoutMs ?? 120000,
    };
    this.escrowProvider = config.escrowProvider;
    this.proofProvider = config.proofProvider;
    this.onEvent = config.onEvent;
  }

  // ── Phase 1: Discovery ─────────────────────────────────

  /**
   * Discover an agent's capabilities via its APS-1 manifest.
   */
  async discover(agentId: string): Promise<APS1Manifest> {
    const res = await this.fetch(`${this.config.agentServiceUrl}/agents/${agentId}`);
    const data = await res.json();
    const manifest = this.toAPS1Manifest(data, agentId);

    this.emit('agent.discovered', '', agentId, {
      name: manifest.name,
      category: manifest.category,
      pricing: manifest.pricing,
      proofEnabled: manifest.proofEnabled,
    });

    return manifest;
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
   * Search agents by category, capability, or price.
   */
  async searchAgents(query: {
    category?: string;
    maxPrice?: number;
    capability?: string;
    proofRequired?: boolean;
  }): Promise<APS1Manifest[]> {
    const all = await this.listAgents();
    return all.filter(a => {
      if (query.category && a.category !== query.category) return false;
      if (query.maxPrice && a.pricing.basePrice > query.maxPrice) return false;
      if (query.capability && !a.capabilities.includes(query.capability)) return false;
      if (query.proofRequired && !a.proofEnabled) return false;
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
      throw new APS1ProtocolError(
        APS1ErrorCode.NEGOTIATION_REJECTED,
        `Agent ${agentId} does not support negotiation`,
      );
    }

    this.emit('negotiation.proposed', message.jobId, agentId, {
      price: message.price,
      round: message.round ?? 1,
    });

    const res = await this.fetch(manifest.endpoints.negotiate, {
      method: 'POST',
      body: JSON.stringify(message),
    });
    const response = await res.json();

    this.emit(
      response.type === 'accept'
        ? 'negotiation.accepted'
        : response.type === 'reject'
        ? 'negotiation.rejected'
        : 'negotiation.countered',
      message.jobId,
      agentId,
      { price: response.price, type: response.type },
    );

    return response;
  }

  /**
   * Auto-negotiate: propose a price and handle counter-offers automatically.
   * Returns the final accepted price or throws if rejected.
   */
  async autoNegotiate(
    agentId: string,
    jobId: string,
    initialOffer: number,
    maxPrice: number,
    maxRounds: number = APS1_MAX_NEGOTIATION_ROUNDS,
  ): Promise<{ finalPrice: number; rounds: APS1NegotiationMessage[] }> {
    const rounds: APS1NegotiationMessage[] = [];
    let currentOffer = initialOffer;

    for (let round = 1; round <= maxRounds; round++) {
      const proposal: APS1NegotiationMessage = {
        type: round === 1 ? 'propose' : 'counter',
        jobId,
        price: currentOffer,
        currency: 'USD',
        round,
        maxRounds,
        timestamp: new Date().toISOString(),
      };

      const response = await this.negotiate(agentId, proposal);
      rounds.push(proposal, response);

      if (response.type === 'accept') {
        return { finalPrice: currentOffer, rounds };
      }

      if (response.type === 'reject') {
        throw new APS1ProtocolError(
          APS1ErrorCode.NEGOTIATION_REJECTED,
          `Agent rejected offer at $${currentOffer} after ${round} rounds`,
        );
      }

      // Counter-offer: meet in the middle if within budget
      if (response.type === 'counter' && response.price <= maxPrice) {
        currentOffer = Math.round(((currentOffer + response.price) / 2) * 100) / 100;
      } else if (response.price > maxPrice) {
        // Counter is above max — offer our max as final
        currentOffer = maxPrice;
      }
    }

    throw new APS1ProtocolError(
      APS1ErrorCode.MAX_ROUNDS_EXCEEDED,
      `Negotiation did not converge after ${maxRounds} rounds`,
    );
  }

  // ── Phase 3: Escrow ────────────────────────────────────

  /**
   * Create an escrow lock using the configured EscrowProvider.
   * Returns escrow info to include in the execution envelope.
   */
  async createEscrow(params: APS1EscrowParams): Promise<APS1ExecutionEnvelope['escrow']> {
    if (!this.escrowProvider) {
      throw new APS1ProtocolError(
        APS1ErrorCode.ESCROW_CREATE_FAILED,
        'No EscrowProvider configured. Pass escrowProvider in APS1ClientConfig.',
      );
    }

    this.emit('escrow.creating', '', '', { method: params.method, amountUSD: params.amountUSD });

    try {
      const receipt = await this.escrowProvider.createEscrow(params);

      this.emit('escrow.created', '', '', {
        onChainId: receipt.onChainId,
        txHash: receipt.txHash,
        contractAddress: receipt.contractAddress,
      });

      return {
        contractAddress: receipt.contractAddress,
        onChainId: receipt.onChainId,
        txHash: receipt.txHash,
        method: params.method,
      };
    } catch (err: any) {
      this.emit('escrow.failed', '', '', { error: err.message });
      throw new APS1ProtocolError(
        APS1ErrorCode.ESCROW_CREATE_FAILED,
        `Failed to create escrow: ${err.message}`,
      );
    }
  }

  // ── Phase 4: Execution ─────────────────────────────────

  /**
   * Execute a job on an agent following APS-1 protocol.
   * This is the simplest entry point — no escrow, no proof.
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

    this.emit('execution.started', jobId, agentId, { prompt: prompt.slice(0, 200) });

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
    const aps1Result = this.toAPS1Result(result, jobId, agentId);

    this.emit(
      aps1Result.status === 'success' ? 'execution.completed' : 'execution.failed',
      jobId,
      agentId,
      { status: aps1Result.status, executionTimeMs: aps1Result.executionTimeMs },
    );

    return aps1Result;
  }

  /**
   * Execute with full APS-1 lifecycle:
   *   1. Create escrow on-chain (via EscrowProvider)
   *   2. Commit AI proof (via ProofProvider, if agent has proofEnabled)
   *   3. Send execution envelope with escrow + proof info
   *   4. Verify AI proof against result
   *   5. Auto-settle escrow on success, refund on failure
   *
   * This is the PRODUCTION flow — requires escrowProvider in config.
   */
  async executeWithEscrow(
    agentId: string,
    prompt: string,
    callerWallet: string,
    escrowParams: APS1EscrowParams,
    options?: {
      payload?: Record<string, unknown>;
      jobId?: string;
      /** Skip AI proof even if agent has proofEnabled */
      skipProof?: boolean;
      /** Auto-settle on success (default: true) */
      autoSettle?: boolean;
    },
  ): Promise<APS1Result & { settlement?: APS1Settlement }> {
    const jobId = options?.jobId ?? `aps1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const autoSettle = options?.autoSettle !== false;

    // ── Step 1: Discover agent ────────────────────────
    const manifest = await this.discover(agentId);

    // ── Step 2: Create escrow on-chain ────────────────
    const escrowInfo = await this.createEscrow(escrowParams);

    // ── Step 3: Commit AI proof (if enabled) ──────────
    let proofInfo: APS1ExecutionEnvelope['proof'] | undefined;

    if (manifest.proofEnabled && this.proofProvider && !options?.skipProof) {
      this.emit('proof.committing', jobId, agentId, {});

      try {
        const planHash = this.hashString(`${prompt}:${agentId}:${jobId}`);
        const commitment = await this.proofProvider.commit(planHash, escrowInfo?.onChainId);

        proofInfo = {
          planHash: commitment.planHash,
          commitmentId: commitment.commitmentId,
          commitTxHash: commitment.txHash,
        };

        this.emit('proof.committed', jobId, agentId, {
          commitmentId: commitment.commitmentId,
          planHash: commitment.planHash,
        });
      } catch (err: any) {
        // Proof commit failure is non-fatal — continue without proof
        console.warn(`[APS-1] AI proof commit failed: ${err.message}`);
      }
    }

    // ── Step 4: Build & send execution envelope ───────
    const envelope: APS1ExecutionEnvelope = {
      jobId,
      agentId,
      prompt,
      payload: options?.payload,
      callerWallet,
      escrow: escrowInfo,
      proof: proofInfo,
      timestamp: new Date().toISOString(),
    };

    this.emit('execution.started', jobId, agentId, {
      prompt: prompt.slice(0, 200),
      hasEscrow: true,
      hasProof: !!proofInfo,
    });

    const res = await this.fetch(
      `${this.config.agentServiceUrl}/agents/${agentId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({
          jobId: envelope.jobId,
          prompt: envelope.prompt,
          payload: envelope.payload,
          callerWallet: envelope.callerWallet,
          escrow: envelope.escrow,
          proof: envelope.proof,
        }),
      },
    );

    const rawResult = await res.json();
    const result = this.toAPS1Result(rawResult, jobId, agentId);

    this.emit(
      result.status === 'success' ? 'execution.completed' : 'execution.failed',
      jobId,
      agentId,
      { status: result.status, executionTimeMs: result.executionTimeMs },
    );

    // ── Step 5: Verify AI proof ───────────────────────
    if (proofInfo && this.proofProvider && result.status === 'success') {
      this.emit('proof.verifying', jobId, agentId, {});

      try {
        const resultHash = this.hashString(JSON.stringify(result.result ?? ''));
        const verification = await this.proofProvider.verify(proofInfo.commitmentId, resultHash);

        result.proof = {
          resultHash: verification.resultHash,
          verifyTxHash: verification.txHash,
          matched: verification.matched,
        };

        this.emit(
          verification.matched ? 'proof.verified' : 'proof.mismatched',
          jobId,
          agentId,
          { matched: verification.matched, resultHash },
        );
      } catch (err: any) {
        console.warn(`[APS-1] AI proof verify failed: ${err.message}`);
      }
    }

    // ── Step 6: Auto-settle escrow ────────────────────
    let settlement: APS1Settlement | undefined;

    if (autoSettle && this.escrowProvider && escrowInfo) {
      try {
        if (result.status === 'success') {
          this.emit('escrow.settling', jobId, agentId, { type: 'settle' });

          const receipt = await this.escrowProvider.settleEscrow(escrowInfo.onChainId);
          settlement = {
            jobId,
            type: 'settle',
            agentPayout: receipt.amount,
            platformFee: receipt.platformFee,
            txHash: receipt.txHash,
            timestamp: new Date().toISOString(),
          };

          this.emit('escrow.settled', jobId, agentId, { txHash: receipt.txHash });
        } else {
          this.emit('escrow.settling', jobId, agentId, { type: 'refund' });

          const receipt = await this.escrowProvider.refundEscrow(escrowInfo.onChainId);
          settlement = {
            jobId,
            type: 'refund',
            agentPayout: '0',
            platformFee: '0',
            txHash: receipt.txHash,
            timestamp: new Date().toISOString(),
          };

          this.emit('escrow.refunded', jobId, agentId, { txHash: receipt.txHash });
        }
      } catch (err: any) {
        console.warn(`[APS-1] Auto-settle failed: ${err.message}`);
      }
    }

    return { ...result, settlement };
  }

  // ── Phase 6: Settlement (Manual) ───────────────────

  /**
   * Manually settle an escrow (release funds to agent).
   */
  async settleEscrow(onChainId: number, jobId: string): Promise<APS1Settlement> {
    if (!this.escrowProvider) {
      throw new APS1ProtocolError(APS1ErrorCode.ESCROW_SETTLE_FAILED, 'No EscrowProvider');
    }

    const receipt = await this.escrowProvider.settleEscrow(onChainId);
    return {
      jobId,
      type: 'settle',
      agentPayout: receipt.amount,
      platformFee: receipt.platformFee,
      txHash: receipt.txHash,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manually refund an escrow (return funds to client).
   */
  async refundEscrow(onChainId: number, jobId: string): Promise<APS1Settlement> {
    if (!this.escrowProvider) {
      throw new APS1ProtocolError(APS1ErrorCode.ESCROW_REFUND_FAILED, 'No EscrowProvider');
    }

    const receipt = await this.escrowProvider.refundEscrow(onChainId);
    return {
      jobId,
      type: 'refund',
      agentPayout: '0',
      platformFee: '0',
      txHash: receipt.txHash,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Dispute an escrow (request arbitration).
   */
  async disputeEscrow(onChainId: number, jobId: string, reason: string): Promise<APS1Settlement> {
    if (!this.escrowProvider?.disputeEscrow) {
      throw new APS1ProtocolError(APS1ErrorCode.ESCROW_SETTLE_FAILED, 'Dispute not supported');
    }

    const receipt = await this.escrowProvider.disputeEscrow(onChainId, reason);
    this.emit('escrow.disputed', jobId, '', { reason });
    return {
      jobId,
      type: 'dispute',
      agentPayout: receipt.amount,
      platformFee: receipt.platformFee,
      txHash: receipt.txHash,
      timestamp: new Date().toISOString(),
    };
  }

  // ── A2A Delegation (v2.0) ──────────────────────────

  /**
   * Delegate a sub-task to another agent (Agent-to-Agent).
   * Creates escrow for the sub-task, executes, and settles.
   */
  async delegateA2A(request: APS1A2ARequest, callerWallet: string): Promise<APS1Result> {
    const jobId = `a2a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.emit('a2a.child_started', request.parentJobId, request.targetAgentId, {
      childJobId: jobId,
      depth: request.depth,
    });

    // Build envelope with A2A context
    const envelope: APS1ExecutionEnvelope = {
      jobId,
      agentId: request.targetAgentId,
      prompt: request.prompt,
      callerWallet,
      a2a: {
        parentJobId: request.parentJobId,
        parentAgentId: request.parentAgentId,
        depth: request.depth,
        budgetAllocation: request.budgetAllocation,
        a2aChainId: request.a2aChainId,
      },
      timestamp: new Date().toISOString(),
    };

    const res = await this.fetch(
      `${this.config.agentServiceUrl}/agents/${request.targetAgentId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({
          jobId: envelope.jobId,
          prompt: envelope.prompt,
          callerWallet: envelope.callerWallet,
          a2a: envelope.a2a,
        }),
      },
    );

    const rawResult = await res.json();
    const result = this.toAPS1Result(rawResult, jobId, request.targetAgentId);

    this.emit(
      result.status === 'success' ? 'a2a.child_completed' : 'a2a.child_failed',
      request.parentJobId,
      request.targetAgentId,
      { childJobId: jobId, status: result.status },
    );

    return result;
  }

  // ── Helpers ────────────────────────────────────────────

  private emit(type: APS1EventType, jobId: string, agentId: string, data: Record<string, unknown>): void {
    if (this.onEvent) {
      this.onEvent({
        type,
        jobId,
        agentId,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Simple keccak256-like hash for strings (for plan/result hashing).
   * In production, use proper keccak256 from ethers.js or @noble/hashes.
   */
  private hashString(input: string): string {
    // Simple deterministic hash — production implementations should use keccak256
    let hash = 0n;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5n) - hash + BigInt(input.charCodeAt(i))) & ((1n << 256n) - 1n);
    }
    return '0x' + hash.toString(16).padStart(64, '0');
  }

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
        throw new APS1ProtocolError(
          APS1ErrorCode.NETWORK_ERROR,
          `APS-1 request failed: ${res.status} ${res.statusText}`,
        );
      }
      return res;
    } catch (err: any) {
      if (err instanceof APS1ProtocolError) throw err;
      throw new APS1ProtocolError(
        APS1ErrorCode.NETWORK_ERROR,
        `APS-1 fetch failed: ${err.message}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private toAPS1Manifest(data: any, agentId: string): APS1Manifest {
    return {
      aps: '2.1',
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
      a2aEnabled: data.a2aEnabled ?? false,
      endpoints: {
        manifest: `${this.config.agentServiceUrl}/agents/${agentId}`,
        execute: `${this.config.agentServiceUrl}/agents/${agentId}/execute`,
        a2aExecute: `${this.config.agentServiceUrl}/agents/${agentId}/a2a-execute`,
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
      errorCode: data.errorCode,
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
      a2a: data.a2a ?? data._a2a,
      executionTimeMs: data.executionTimeMs ?? 0,
      timestamp: new Date().toISOString(),
    };
  }
}

// ── Protocol Error ────────────────────────────────────────

/**
 * Structured error class for APS-1 protocol errors.
 */
export class APS1ProtocolError extends Error {
  public readonly code: APS1ErrorCode;

  constructor(code: APS1ErrorCode, message: string) {
    super(message);
    this.name = 'APS1ProtocolError';
    this.code = code;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}
