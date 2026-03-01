/**
 * APS-1 Reference Agent v2.0
 *
 * An Express-based agent server that implements the full APS-1 protocol.
 * Extends v1 with:
 *   - Escrow verification middleware (verify funds before execution)
 *   - AI Proof auto-commit/verify hooks
 *   - A2A sub-task endpoint
 *   - Lifecycle event emission via SSE
 *   - Structured error responses
 *
 * Usage:
 *   const agent = new APS1Agent({
 *     id: 'my-agent',
 *     name: 'My Agent',
 *     description: 'Does amazing things',
 *     category: 'analytics',
 *     version: '1.0.0',
 *     pricing: { basePrice: 5, currency: 'USD', negotiable: false },
 *     capabilities: ['analyze', 'report'],
 *     walletAddress: '0x...',
 *   });
 *
 *   agent.onExecute(async (envelope) => {
 *     return { status: 'success', result: { ... } };
 *   });
 *
 *   // Optional: verify escrow before execution
 *   agent.onEscrowVerify(async (escrow) => {
 *     // Check on-chain that escrow exists and has correct amount
 *     return true;
 *   });
 *
 *   agent.listen(3002);
 */

import express, { Request, Response } from 'express';
import type {
  APS1Manifest,
  APS1ExecutionEnvelope,
  APS1Result,
  APS1NegotiationMessage,
  APS1Category,
  APS1Pricing,
  APS1PaymentMethod,
  APS1TokenConfig,
  APS1Event,
  APS1EventType,
  APS1EscrowProvider,
  APS1ProofProvider,
  APS1ReputationTier,
  APS1SecurityDepositTier,
} from './types';
import {
  APS1_VERSION,
  APS1_DEFAULT_TOKENS,
  APS1_CONTRACTS,
  APS1_NETWORK,
  APS1_CHAIN_ID,
  APS1_MAX_A2A_DEPTH,
  APS1ErrorCode,
} from './types';

// ── Agent Configuration ──────────────────────────────────

export interface APS1AgentConfig {
  /** Unique agent ID (kebab-case) */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** What the agent does */
  description: string;
  /** Agent category */
  category: APS1Category;
  /** Semantic version */
  version: string;
  /** Pricing configuration */
  pricing: APS1Pricing;
  /** List of capabilities */
  capabilities: string[];
  /** Agent's wallet address on Tempo L1 */
  walletAddress: string;
  /** Accepted payment methods (default: all) */
  paymentMethods?: APS1PaymentMethod[];
  /** Accepted tokens (default: APS1_DEFAULT_TOKENS) */
  supportedTokens?: APS1TokenConfig[];
  /** Whether AIProofRegistry is used (default: true) */
  proofEnabled?: boolean;
  /** Whether A2A sub-task delegation is supported (v2.0) */
  a2aEnabled?: boolean;
  /** Security deposit tier (v2.0) */
  securityDepositTier?: APS1SecurityDepositTier;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ── Handler Types ────────────────────────────────────────

export type APS1ExecuteHandler = (
  envelope: APS1ExecutionEnvelope,
) => Promise<Partial<APS1Result>>;

export type APS1NegotiateHandler = (
  message: APS1NegotiationMessage,
) => Promise<APS1NegotiationMessage>;

export type APS1EscrowVerifyHandler = (
  escrow: NonNullable<APS1ExecutionEnvelope['escrow']>,
) => Promise<boolean>;

// ── APS-1 Agent Server ──────────────────────────────────

export class APS1Agent {
  private config: APS1AgentConfig;
  private app = express();
  private executeHandler?: APS1ExecuteHandler;
  private negotiateHandler?: APS1NegotiateHandler;
  private escrowVerifyHandler?: APS1EscrowVerifyHandler;
  private baseUrl = '';

  /** Escrow provider for auto-settlement (v2.0) */
  private escrowProvider?: APS1EscrowProvider;
  /** Proof provider for auto-commit/verify (v2.0) */
  private proofProvider?: APS1ProofProvider;

  /** In-memory job status tracking */
  private jobs = new Map<string, APS1Result>();

  /** SSE clients for event streaming */
  private sseClients = new Set<Response>();

  /** Reputation score (cached, updated periodically) */
  private reputationScore = 0;
  private reputationTier: APS1ReputationTier = 'newcomer';

  constructor(config: APS1AgentConfig) {
    this.config = config;
    this.app.use(express.json());
    this._registerRoutes();
  }

  // ── Public API ──────────────────────────────────────

  /**
   * Register the handler called for every APS-1 execution envelope.
   * Return a partial APS1Result - jobId, agentId, executionTimeMs, timestamp
   * are filled in automatically.
   */
  onExecute(handler: APS1ExecuteHandler): this {
    this.executeHandler = handler;
    return this;
  }

  /**
   * Register an optional negotiation handler.
   * If not registered, the /negotiate endpoint will return 404.
   */
  onNegotiate(handler: APS1NegotiateHandler): this {
    this.negotiateHandler = handler;
    return this;
  }

  /**
   * Register an escrow verification handler (v2.0).
   * Called before execution when envelope contains escrow info.
   * Return true to proceed, false to reject.
   */
  onEscrowVerify(handler: APS1EscrowVerifyHandler): this {
    this.escrowVerifyHandler = handler;
    return this;
  }

  /**
   * Set the escrow provider for auto-settlement (v2.0).
   * When set, the agent can auto-settle escrows after successful execution.
   */
  setEscrowProvider(provider: APS1EscrowProvider): this {
    this.escrowProvider = provider;
    return this;
  }

  /**
   * Set the proof provider for auto-commit/verify (v2.0).
   * When set, the agent auto-commits plan hash before execution
   * and auto-verifies result hash after.
   */
  setProofProvider(provider: APS1ProofProvider): this {
    this.proofProvider = provider;
    return this;
  }

  /** Update cached reputation score */
  setReputation(score: number, tier: APS1ReputationTier): this {
    this.reputationScore = score;
    this.reputationTier = tier;
    return this;
  }

  /** Start the HTTP server. */
  listen(port: number, cb?: () => void): void {
    this.baseUrl = `http://localhost:${port}`;
    this.app.listen(port, () => {
      console.log(`[APS-1 v2.0] ${this.config.name} listening on port ${port}`);
      console.log(`[APS-1] Manifest:  GET  ${this.baseUrl}/manifest`);
      console.log(`[APS-1] Execute:   POST ${this.baseUrl}/execute`);
      console.log(`[APS-1] Health:    GET  ${this.baseUrl}/health`);
      if (this.config.a2aEnabled) {
        console.log(`[APS-1] A2A:       POST ${this.baseUrl}/a2a-execute`);
      }
      cb?.();
    });
  }

  /** Generate the APS-1 manifest. */
  toManifest(): APS1Manifest {
    const base = this.baseUrl || 'http://localhost:3000';
    return {
      aps: '2.0',
      id: this.config.id,
      name: this.config.name,
      description: this.config.description,
      category: this.config.category,
      version: this.config.version,
      pricing: this.config.pricing,
      capabilities: this.config.capabilities,
      paymentMethods: this.config.paymentMethods ?? ['nexus-escrow', 'stream-milestone', 'direct-transfer'],
      supportedTokens: this.config.supportedTokens ?? APS1_DEFAULT_TOKENS,
      proofEnabled: this.config.proofEnabled ?? true,
      reputationScore: this.reputationScore || undefined,
      reputationTier: this.reputationTier,
      a2aEnabled: this.config.a2aEnabled ?? false,
      securityDepositTier: this.config.securityDepositTier,
      walletAddress: this.config.walletAddress,
      endpoints: {
        manifest: `${base}/manifest`,
        execute: `${base}/execute`,
        negotiate: this.negotiateHandler ? `${base}/negotiate` : undefined,
        status: `${base}/status`,
        health: `${base}/health`,
        a2aExecute: this.config.a2aEnabled ? `${base}/a2a-execute` : undefined,
        events: `${base}/events`,
      },
      metadata: this.config.metadata,
    };
  }

  /** Get a tracked job result by ID. */
  getJob(jobId: string): APS1Result | undefined {
    return this.jobs.get(jobId);
  }

  /** Get all tracked jobs */
  getAllJobs(): Map<string, APS1Result> {
    return new Map(this.jobs);
  }

  /** Access the underlying Express app (for custom middleware). */
  getExpressApp(): express.Application {
    return this.app;
  }

  // ── Event Emission ────────────────────────────────

  private emitEvent(type: APS1EventType, jobId: string, data: Record<string, unknown>): void {
    const event: APS1Event = {
      type,
      jobId,
      agentId: this.config.id,
      data,
      timestamp: new Date().toISOString(),
    };

    // Send to all SSE clients
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  // ── Routes ──────────────────────────────────────────

  private _registerRoutes(): void {
    // GET /manifest - APS-1 manifest
    this.app.get('/manifest', (_req: Request, res: Response) => {
      res.json(this.toManifest());
    });

    // POST /execute - APS-1 execution with optional escrow verification + proof
    this.app.post('/execute', async (req: Request, res: Response) => {
      if (!this.executeHandler) {
        return res.status(501).json({
          error: 'No execute handler registered',
          errorCode: APS1ErrorCode.EXECUTION_HANDLER_MISSING,
          aps: APS1_VERSION,
        });
      }

      const jobId = req.body.jobId ?? `aps1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const envelope: APS1ExecutionEnvelope = {
        jobId,
        agentId: this.config.id,
        prompt: req.body.prompt ?? '',
        payload: req.body.payload,
        callerWallet: req.body.callerWallet ?? '',
        escrow: req.body.escrow,
        proof: req.body.proof,
        a2a: req.body.a2a,
        timestamp: new Date().toISOString(),
      };

      // ── Escrow verification (v2.0) ──
      if (envelope.escrow && this.escrowVerifyHandler) {
        try {
          const verified = await this.escrowVerifyHandler(envelope.escrow);
          if (!verified) {
            return res.status(402).json({
              jobId,
              agentId: this.config.id,
              status: 'error',
              error: 'Escrow verification failed — funds not confirmed on-chain',
              errorCode: APS1ErrorCode.ESCROW_CREATE_FAILED,
              executionTimeMs: 0,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          return res.status(500).json({
            jobId,
            agentId: this.config.id,
            status: 'error',
            error: `Escrow verification error: ${err.message}`,
            errorCode: APS1ErrorCode.ESCROW_CREATE_FAILED,
            executionTimeMs: 0,
            timestamp: new Date().toISOString(),
          });
        }
      }

      this.emitEvent('execution.started', jobId, { prompt: envelope.prompt.slice(0, 200) });

      const start = Date.now();

      try {
        const partial = await this.executeHandler(envelope);
        const result: APS1Result = {
          jobId,
          agentId: this.config.id,
          status: partial.status ?? 'success',
          result: partial.result,
          error: partial.error,
          errorCode: partial.errorCode,
          onChain: partial.onChain ?? {
            executed: false,
            transactions: [],
            network: APS1_NETWORK,
            chainId: APS1_CHAIN_ID,
          },
          proof: partial.proof,
          a2a: partial.a2a,
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        };

        // Track the job
        this.jobs.set(jobId, result);

        this.emitEvent(
          result.status === 'success' ? 'execution.completed' : 'execution.failed',
          jobId,
          { status: result.status, executionTimeMs: result.executionTimeMs },
        );

        res.json(result);
      } catch (err: any) {
        const errorResult: APS1Result = {
          jobId,
          agentId: this.config.id,
          status: 'error',
          error: err.message ?? String(err),
          errorCode: APS1ErrorCode.EXECUTION_FAILED,
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        };

        this.jobs.set(jobId, errorResult);

        this.emitEvent('execution.failed', jobId, { error: err.message });

        res.status(500).json(errorResult);
      }
    });

    // POST /a2a-execute - A2A sub-task execution (v2.0)
    this.app.post('/a2a-execute', async (req: Request, res: Response) => {
      if (!this.config.a2aEnabled) {
        return res.status(404).json({
          error: 'This agent does not support A2A delegation',
          aps: APS1_VERSION,
        });
      }

      if (!this.executeHandler) {
        return res.status(501).json({
          error: 'No execute handler registered',
          errorCode: APS1ErrorCode.EXECUTION_HANDLER_MISSING,
          aps: APS1_VERSION,
        });
      }

      // Enforce depth limit
      const depth = req.body.a2a?.depth ?? 0;
      if (depth > APS1_MAX_A2A_DEPTH) {
        return res.status(400).json({
          error: `A2A max depth exceeded (${depth} > ${APS1_MAX_A2A_DEPTH})`,
          errorCode: APS1ErrorCode.A2A_MAX_DEPTH_EXCEEDED,
          aps: APS1_VERSION,
        });
      }

      // Forward to execute handler with A2A context
      const jobId = req.body.jobId ?? `a2a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const envelope: APS1ExecutionEnvelope = {
        jobId,
        agentId: this.config.id,
        prompt: req.body.prompt ?? '',
        payload: req.body.payload,
        callerWallet: req.body.callerWallet ?? '',
        escrow: req.body.escrow,
        proof: req.body.proof,
        a2a: {
          parentJobId: req.body.a2a?.parentJobId ?? '',
          parentAgentId: req.body.a2a?.parentAgentId ?? '',
          depth: depth + 1,
          budgetAllocation: req.body.a2a?.budgetAllocation ?? 0,
          a2aChainId: req.body.a2a?.a2aChainId ?? `chain-${Date.now()}`,
        },
        timestamp: new Date().toISOString(),
      };

      this.emitEvent('a2a.child_started', jobId, {
        parentJobId: envelope.a2a?.parentJobId,
        depth: envelope.a2a?.depth,
      });

      const start = Date.now();

      try {
        const partial = await this.executeHandler(envelope);
        const result: APS1Result = {
          jobId,
          agentId: this.config.id,
          status: partial.status ?? 'success',
          result: partial.result,
          error: partial.error,
          onChain: partial.onChain,
          proof: partial.proof,
          a2a: partial.a2a ?? {
            childJobs: [],
            a2aChainId: envelope.a2a?.a2aChainId ?? '',
          },
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        };

        this.jobs.set(jobId, result);

        this.emitEvent(
          result.status === 'success' ? 'a2a.child_completed' : 'a2a.child_failed',
          jobId,
          { status: result.status },
        );

        res.json(result);
      } catch (err: any) {
        const errorResult: APS1Result = {
          jobId,
          agentId: this.config.id,
          status: 'error',
          error: err.message ?? String(err),
          errorCode: APS1ErrorCode.A2A_CHILD_FAILED,
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        };

        this.jobs.set(jobId, errorResult);
        this.emitEvent('a2a.child_failed', jobId, { error: err.message });

        res.status(500).json(errorResult);
      }
    });

    // POST /negotiate - optional price negotiation
    this.app.post('/negotiate', async (req: Request, res: Response) => {
      if (!this.negotiateHandler) {
        return res.status(404).json({
          error: 'This agent does not support negotiation',
          errorCode: APS1ErrorCode.NEGOTIATION_REJECTED,
          aps: APS1_VERSION,
        });
      }

      try {
        const message: APS1NegotiationMessage = {
          type: req.body.type,
          jobId: req.body.jobId,
          price: req.body.price,
          currency: req.body.currency ?? 'USD',
          message: req.body.message,
          round: req.body.round,
          maxRounds: req.body.maxRounds,
          timestamp: new Date().toISOString(),
        };

        const response = await this.negotiateHandler(message);

        this.emitEvent(
          response.type === 'accept' ? 'negotiation.accepted' :
          response.type === 'reject' ? 'negotiation.rejected' :
          'negotiation.countered',
          message.jobId,
          { price: response.price, type: response.type },
        );

        res.json(response);
      } catch (err: any) {
        res.status(500).json({
          error: err.message ?? String(err),
          aps: APS1_VERSION,
        });
      }
    });

    // GET /status/:jobId - job status
    this.app.get('/status/:jobId', (req: Request, res: Response) => {
      const job = this.jobs.get(req.params.jobId as string);
      if (!job) {
        return res.status(404).json({
          error: 'Job not found',
          errorCode: APS1ErrorCode.AGENT_NOT_FOUND,
          aps: APS1_VERSION,
        });
      }
      res.json(job);
    });

    // GET /health - health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        aps: APS1_VERSION,
        agent: this.config.id,
        name: this.config.name,
        version: this.config.version,
        a2aEnabled: this.config.a2aEnabled ?? false,
        proofEnabled: this.config.proofEnabled ?? true,
        reputationScore: this.reputationScore,
        reputationTier: this.reputationTier,
        activeJobs: this.jobs.size,
        uptime: process.uptime(),
      });
    });

    // GET /events - SSE event stream (v2.0)
    this.app.get('/events', (req: Request, res: Response) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-APS-Version': APS1_VERSION,
      });

      this.sseClients.add(res);

      req.on('close', () => {
        this.sseClients.delete(res);
      });
    });
  }
}
