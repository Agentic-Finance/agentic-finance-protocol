/**
 * Audit Event Types & Helper
 *
 * Central registry for all audit event types + convenience logger.
 * Every swarm action (creation, milestone, transfer, escrow) should be logged here
 * for the 4D timeline visualisation.
 */

import prisma from './prisma';

// ── Event Types ─────────────────────────────────────────────

export type AuditEventType =
  | 'SWARM_CREATED'
  | 'SWARM_COMPLETED'
  | 'SWARM_CANCELLED'
  | 'AGENT_JOINED'
  | 'AGENT_LEFT'
  | 'MILESTONE_SUBMITTED'
  | 'MILESTONE_APPROVED'
  | 'MILESTONE_REJECTED'
  | 'A2A_TRANSFER'
  | 'A2A_BATCH'
  | 'INTEL_SUBMITTED'
  | 'INTEL_VERIFIED'
  | 'INTEL_PURCHASED'
  | 'ESCROW_LOCKED'
  | 'ESCROW_RELEASED'
  | 'ESCROW_SETTLED'
  | 'STREAM_CREATED'
  | 'STREAM_COMPLETED'
  | 'BUDGET_ALLOCATED'
  | 'SYSTEM_EVENT';

export type AuditSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

// ── Logger ──────────────────────────────────────────────────

export interface AuditLogPayload {
  swarmId?: string;
  agentId?: string;
  agentName?: string;
  eventType: AuditEventType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  txHash?: string;
  severity?: AuditSeverity;
}

/**
 * Log an audit event to the database.
 * Non-blocking — errors are logged but don't throw.
 */
export async function logAuditEvent(payload: AuditLogPayload): Promise<string | null> {
  try {
    const event = await prisma.auditEvent.create({
      data: {
        swarmId: payload.swarmId || null,
        agentId: payload.agentId || null,
        agentName: payload.agentName || null,
        eventType: payload.eventType,
        title: payload.title,
        description: payload.description || null,
        metadata: payload.metadata || undefined,
        txHash: payload.txHash || null,
        severity: payload.severity || 'INFO',
      },
    });
    return event.id;
  } catch (error: any) {
    console.error('[audit] Failed to log event:', error.message);
    return null;
  }
}
