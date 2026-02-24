/**
 * Protocol Event Bus — Central event system for PayPol
 *
 * EventEmitter-based bus that all services emit to. The SSE endpoint
 * subscribes to this bus and pushes events to connected dashboard clients.
 */

import { EventEmitter } from 'events';

// ── Event Types ─────────────────────────────────────────────

export type ProtocolEventType =
  | 'tx:escrow_created'
  | 'tx:escrow_settled'
  | 'tx:escrow_refunded'
  | 'tx:escrow_disputed'
  | 'tx:shield_deposit'
  | 'tx:shield_payout'
  | 'tx:multisend_batch'
  | 'tx:token_deployed'
  | 'tx:contract_deployed'
  | 'agent:job_started'
  | 'agent:job_completed'
  | 'agent:job_failed'
  | 'agent:a2a_chain_started'
  | 'agent:a2a_chain_completed'
  | 'agent:a2a_step_completed'
  | 'zk:proof_generated'
  | 'zk:proof_verified'
  | 'revenue:fee_collected'
  | 'tvl:updated';

export interface ProtocolEvent {
  id: string;
  type: ProtocolEventType;
  timestamp: number;
  data: {
    txHash?: string;
    agentId?: string;
    agentName?: string;
    amount?: number;
    token?: string;
    chainId?: number;
    jobId?: string;
    onChainJobId?: number;
    a2aChainId?: string;
    workflowId?: string;
    recipientCount?: number;
    explorerUrl?: string;
    gasUsed?: string;
    feeAmount?: number;
    [key: string]: unknown;
  };
}

// ── Event Bus Singleton ─────────────────────────────────────

class ProtocolEventBus extends EventEmitter {
  private eventLog: ProtocolEvent[] = [];
  private maxLogSize = 500;

  // Counters for stats
  public stats = {
    totalTxs: 0,
    totalEscrowCreated: 0,
    totalEscrowSettled: 0,
    totalShieldPayouts: 0,
    totalMultisendBatches: 0,
    totalAgentJobs: 0,
    totalA2AChains: 0,
    totalZKProofs: 0,
    totalFeesCollected: 0, // in USD
    totalTokensDeployed: 0,
  };

  constructor() {
    super();
    this.setMaxListeners(100); // Support many SSE clients
  }

  /**
   * Emit a protocol event and log it.
   */
  emitEvent(event: Omit<ProtocolEvent, 'id' | 'timestamp'>): ProtocolEvent {
    const fullEvent: ProtocolEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    // Update stats
    this.updateStats(fullEvent);

    // Log event
    this.eventLog.push(fullEvent);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    // Emit to listeners (SSE clients)
    this.emit('protocol-event', fullEvent);

    console.log(`[event-bus] 📡 ${fullEvent.type} — ${fullEvent.data.agentId || fullEvent.data.txHash || 'system'}`);
    return fullEvent;
  }

  /**
   * Get recent events.
   */
  getRecentEvents(limit = 50): ProtocolEvent[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * Get aggregated stats.
   */
  getStats() {
    return { ...this.stats };
  }

  private updateStats(event: ProtocolEvent) {
    switch (event.type) {
      case 'tx:escrow_created':
        this.stats.totalTxs++;
        this.stats.totalEscrowCreated++;
        break;
      case 'tx:escrow_settled':
        this.stats.totalTxs++;
        this.stats.totalEscrowSettled++;
        if (event.data.feeAmount) this.stats.totalFeesCollected += event.data.feeAmount;
        break;
      case 'tx:shield_payout':
      case 'tx:shield_deposit':
        this.stats.totalTxs++;
        this.stats.totalShieldPayouts++;
        this.stats.totalZKProofs++;
        break;
      case 'tx:multisend_batch':
        this.stats.totalTxs++;
        this.stats.totalMultisendBatches++;
        break;
      case 'tx:token_deployed':
      case 'tx:contract_deployed':
        this.stats.totalTxs++;
        this.stats.totalTokensDeployed++;
        break;
      case 'agent:job_completed':
        this.stats.totalAgentJobs++;
        break;
      case 'agent:a2a_chain_completed':
        this.stats.totalA2AChains++;
        break;
      case 'zk:proof_generated':
      case 'zk:proof_verified':
        this.stats.totalZKProofs++;
        break;
      case 'revenue:fee_collected':
        if (event.data.feeAmount) this.stats.totalFeesCollected += event.data.feeAmount;
        break;
    }
  }
}

// Export singleton
export const eventBus = new ProtocolEventBus();
