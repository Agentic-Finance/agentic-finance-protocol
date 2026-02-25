/**
 * APS-1 Reference Agent
 *
 * An Express-based agent server that implements the full APS-1 protocol.
 * Extends the standard PayPolAgent pattern with:
 *   - APS-1 manifest endpoint
 *   - Optional negotiation endpoint
 *   - Job status tracking
 *   - Structured APS-1 result format
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
} from './types';
import {
  APS1_VERSION,
  APS1_DEFAULT_TOKENS,
  APS1_CONTRACTS,
  APS1_NETWORK,
  APS1_CHAIN_ID,
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

// ── APS-1 Agent Server ──────────────────────────────────

export class APS1Agent {
  private config: APS1AgentConfig;
  private app = express();
  private executeHandler?: APS1ExecuteHandler;
  private negotiateHandler?: APS1NegotiateHandler;
  private baseUrl = '';

  /** In-memory job status tracking */
  private jobs = new Map<string, APS1Result>();

  constructor(config: APS1AgentConfig) {
    this.config = config;
    this.app.use(express.json());
    this._registerRoutes();
  }

  // ── Public API ──────────────────────────────────────

  /**
   * Register the handler called for every APS-1 execution envelope.
   * Return a partial APS1Result — jobId, agentId, executionTimeMs, timestamp
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

  /** Start the HTTP server. */
  listen(port: number, cb?: () => void): void {
    this.baseUrl = `http://localhost:${port}`;
    this.app.listen(port, () => {
      console.log(`[APS-1] ${this.config.name} listening on port ${port}`);
      console.log(`[APS-1] Manifest: ${this.baseUrl}/manifest`);
      console.log(`[APS-1] Execute:  POST ${this.baseUrl}/execute`);
      cb?.();
    });
  }

  /** Generate the APS-1 manifest. */
  toManifest(): APS1Manifest {
    const base = this.baseUrl || 'http://localhost:3000';
    return {
      aps: '1.0',
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
      walletAddress: this.config.walletAddress,
      endpoints: {
        manifest: `${base}/manifest`,
        execute: `${base}/execute`,
        negotiate: this.negotiateHandler ? `${base}/negotiate` : undefined,
        status: `${base}/status`,
        health: `${base}/health`,
      },
      metadata: this.config.metadata,
    };
  }

  /** Get a tracked job result by ID. */
  getJob(jobId: string): APS1Result | undefined {
    return this.jobs.get(jobId);
  }

  /** Access the underlying Express app (for custom middleware). */
  getExpressApp(): express.Application {
    return this.app;
  }

  // ── Routes ──────────────────────────────────────────

  private _registerRoutes(): void {
    // GET /manifest — APS-1 manifest
    this.app.get('/manifest', (_req: Request, res: Response) => {
      res.json(this.toManifest());
    });

    // POST /execute — APS-1 execution
    this.app.post('/execute', async (req: Request, res: Response) => {
      if (!this.executeHandler) {
        return res.status(501).json({
          error: 'No execute handler registered',
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
        timestamp: new Date().toISOString(),
      };

      const start = Date.now();

      try {
        const partial = await this.executeHandler(envelope);
        const result: APS1Result = {
          jobId,
          agentId: this.config.id,
          status: partial.status ?? 'success',
          result: partial.result,
          error: partial.error,
          onChain: partial.onChain ?? {
            executed: false,
            transactions: [],
            network: APS1_NETWORK,
            chainId: APS1_CHAIN_ID,
          },
          proof: partial.proof,
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        };

        // Track the job
        this.jobs.set(jobId, result);

        res.json(result);
      } catch (err: any) {
        const errorResult: APS1Result = {
          jobId,
          agentId: this.config.id,
          status: 'error',
          error: err.message ?? String(err),
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        };

        this.jobs.set(jobId, errorResult);

        res.status(500).json(errorResult);
      }
    });

    // POST /negotiate — optional price negotiation
    this.app.post('/negotiate', async (req: Request, res: Response) => {
      if (!this.negotiateHandler) {
        return res.status(404).json({
          error: 'This agent does not support negotiation',
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
          timestamp: new Date().toISOString(),
        };

        const response = await this.negotiateHandler(message);
        res.json(response);
      } catch (err: any) {
        res.status(500).json({
          error: err.message ?? String(err),
          aps: APS1_VERSION,
        });
      }
    });

    // GET /status/:jobId — job status
    this.app.get('/status/:jobId', (req: Request, res: Response) => {
      const job = this.jobs.get(req.params.jobId as string);
      if (!job) {
        return res.status(404).json({
          error: 'Job not found',
          aps: APS1_VERSION,
        });
      }
      res.json(job);
    });

    // GET /health — health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        aps: APS1_VERSION,
        agent: this.config.id,
        name: this.config.name,
        version: this.config.version,
        uptime: process.uptime(),
      });
    });
  }
}
