/**
 * State Tracker - Job state machine & request logging
 *
 * Tracks all orchestrator requests, their workflows, and execution history.
 * In production, this would use Prisma/PostgreSQL. For now, in-memory with
 * structured logging.
 */

// ── Types ────────────────────────────────────────────────────

export type RequestStatus = 'received' | 'parsing' | 'routing' | 'executing' | 'completed' | 'failed';

export interface OrchestratorRequest {
  id: string;
  prompt: string;
  callerWallet: string;
  status: RequestStatus;
  workflowId?: string;
  intent?: any;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  executionTimeMs?: number;
}

export interface SystemStats {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageExecutionMs: number;
  uptime: number;
}

// ── State Tracker Class ──────────────────────────────────────

export class StateTracker {
  private requests: Map<string, OrchestratorRequest> = new Map();
  private startTime: number = Date.now();

  /**
   * Create a new orchestrator request.
   */
  createRequest(prompt: string, callerWallet: string): OrchestratorRequest {
    const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const request: OrchestratorRequest = {
      id,
      prompt,
      callerWallet,
      status: 'received',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.requests.set(id, request);
    console.log(`[state] Request ${id} created`);
    return request;
  }

  /**
   * Update request status.
   */
  updateStatus(requestId: string, status: RequestStatus, data?: Partial<OrchestratorRequest>): void {
    const request = this.requests.get(requestId);
    if (!request) return;

    request.status = status;
    request.updatedAt = Date.now();

    if (data) {
      Object.assign(request, data);
    }

    if (status === 'completed' || status === 'failed') {
      request.completedAt = Date.now();
      request.executionTimeMs = request.completedAt - request.createdAt;
    }

    console.log(`[state] Request ${requestId}: ${status}`);
  }

  /**
   * Get a request by ID.
   */
  getRequest(requestId: string): OrchestratorRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get recent requests.
   */
  getRecentRequests(limit: number = 20): OrchestratorRequest[] {
    return [...this.requests.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Get system statistics.
   */
  getStats(): SystemStats {
    const all = [...this.requests.values()];
    const completed = all.filter(r => r.status === 'completed');
    const failed = all.filter(r => r.status === 'failed');
    const active = all.filter(r => !['completed', 'failed'].includes(r.status));

    const totalExecTime = completed.reduce((s, r) => s + (r.executionTimeMs || 0), 0);

    return {
      totalRequests: all.length,
      activeRequests: active.length,
      completedRequests: completed.length,
      failedRequests: failed.length,
      averageExecutionMs: completed.length > 0 ? Math.round(totalExecTime / completed.length) : 0,
      uptime: Date.now() - this.startTime,
    };
  }
}
