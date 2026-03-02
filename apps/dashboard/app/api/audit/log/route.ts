/**
 * /api/audit/log — Log Audit Event
 *
 * POST: Create an audit event (called by other APIs + daemon)
 */

import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { logAuditEvent, AuditEventType, AuditSeverity } from '@/app/lib/audit-types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      swarmId,
      agentId,
      agentName,
      eventType,
      title,
      description,
      metadata,
      txHash,
      severity = 'INFO',
    } = body;

    if (!eventType || !title) {
      return apiError('Missing required fields: eventType, title', 400);
    }

    const id = await logAuditEvent({
      swarmId,
      agentId,
      agentName,
      eventType: eventType as AuditEventType,
      title,
      description,
      metadata,
      txHash,
      severity: severity as AuditSeverity,
    });

    if (!id) {
      return apiError('Failed to log audit event', 500);
    }

    return apiSuccess({ id }, 201);
  } catch (error: any) {
    return logAndReturn('AUDIT_LOG', error, 'Failed to log audit event');
  }
}
