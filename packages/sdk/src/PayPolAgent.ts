import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  AgentConfig,
  AgentManifest,
  JobRequest,
  JobResult,
} from './types';

/**
 * Base class for building PayPol-compatible agents.
 *
 * Usage:
 *   const agent = new PayPolAgent({ id: 'my-agent', ... });
 *   agent.onJob(async (job) => { ... return result; });
 *   agent.listen(3002);
 */
export class PayPolAgent {
  private config: AgentConfig;
  private jobHandler?: (job: JobRequest) => Promise<JobResult>;
  private app = express();

  constructor(config: AgentConfig) {
    this.config = config;
    this.app.use(express.json());
    this._registerRoutes();
  }

  // ── Public API ─────────────────────────────────────────

  /**
   * Register the async handler called for every incoming job.
   * Throw an Error inside to return status: 'error' automatically.
   */
  onJob(handler: (job: JobRequest) => Promise<JobResult>): this {
    this.jobHandler = handler;
    return this;
  }

  /** Start the HTTP server. */
  listen(port: number, cb?: () => void): void {
    this.app.listen(port, () => {
      console.log(`[${this.config.name}] Listening on port ${port}`);
      cb?.();
    });
  }

  /** Serialise the agent descriptor (used for marketplace registration). */
  toManifest(): AgentManifest {
    return {
      id:           this.config.id,
      name:         this.config.name,
      description:  this.config.description,
      category:     this.config.category,
      version:      this.config.version,
      price:        this.config.price,
      capabilities: this.config.capabilities,
      author:       this.config.author ?? 'unknown',
      createdAt:    new Date().toISOString(),
    };
  }

  // ── Routes ─────────────────────────────────────────────

  private _registerRoutes(): void {
    /** GET /manifest — agent self-description */
    this.app.get('/manifest', (_req: Request, res: Response) => {
      res.json(this.toManifest());
    });

    /** POST /execute — trigger a job */
    this.app.post('/execute', async (req: Request, res: Response) => {
      if (!this.jobHandler) {
        return res.status(501).json({ error: 'No job handler registered' });
      }

      const job: JobRequest = {
        jobId:        req.body.jobId ?? randomUUID(),
        agentId:      this.config.id,
        prompt:       req.body.prompt ?? '',
        payload:      req.body.payload,
        callerWallet: req.body.callerWallet ?? '',
        timestamp:    Date.now(),
        callbackUrl:  req.body.callbackUrl,
      };

      const start = Date.now();
      try {
        const result = await this.jobHandler(job);
        result.executionTimeMs = Date.now() - start;
        res.json(result);
      } catch (err: any) {
        const result: JobResult = {
          jobId:          job.jobId,
          agentId:        this.config.id,
          status:         'error',
          error:          err.message ?? String(err),
          executionTimeMs: Date.now() - start,
          timestamp:      Date.now(),
        };
        res.status(500).json(result);
      }
    });

    /** GET /health */
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', agent: this.config.id });
    });
  }
}
