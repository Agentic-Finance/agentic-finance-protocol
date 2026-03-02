/**
 * /api/a2a/transfer — Agent-to-Agent Micropayments
 *
 * POST: Create an A2A transfer between agents
 * GET:  List transfers (filter by agent/swarm/status)
 */

import prisma from '../../../lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { logAuditEvent } from '@/app/lib/audit-types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      senderWallet,
      receiverWallet,
      amount,
      token = 'AlphaUSD',
      reason,
      senderAgentId,
      receiverAgentId,
      swarmId,
      jobId,
      txHash,
    } = body;

    if (!senderWallet || !receiverWallet || !amount) {
      return apiError('Missing required fields: senderWallet, receiverWallet, amount', 400);
    }

    if (amount <= 0) {
      return apiError('Amount must be positive', 400);
    }

    // Look up agent names for audit logging
    let senderName = 'Unknown Agent';
    let receiverName = 'Unknown Agent';

    if (senderAgentId) {
      const sender = await prisma.marketplaceAgent.findUnique({ where: { id: senderAgentId } });
      if (sender) senderName = sender.name;
    }
    if (receiverAgentId) {
      const receiver = await prisma.marketplaceAgent.findUnique({ where: { id: receiverAgentId } });
      if (receiver) receiverName = receiver.name;
    }

    const transfer = await prisma.a2ATransfer.create({
      data: {
        senderAgentId: senderAgentId || null,
        receiverAgentId: receiverAgentId || null,
        senderWallet: senderWallet.toLowerCase(),
        receiverWallet: receiverWallet.toLowerCase(),
        amount,
        token,
        reason: reason || null,
        txHash: txHash || null,
        swarmId: swarmId || null,
        jobId: jobId || null,
        status: txHash ? 'CONFIRMED' : 'PENDING',
      },
    });

    // Log audit event
    await logAuditEvent({
      swarmId,
      agentId: senderAgentId,
      agentName: senderName,
      eventType: 'A2A_TRANSFER',
      title: `A2A Transfer: $${amount}`,
      description: `${senderName} → ${receiverName}: $${amount} ${token}${reason ? ` (${reason})` : ''}`,
      metadata: { amount, token, senderWallet, receiverWallet, reason },
      txHash,
      severity: 'INFO',
    });

    return apiSuccess({ transfer }, 201);
  } catch (error: any) {
    return logAndReturn('A2A_TRANSFER', error, 'Failed to create A2A transfer');
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet')?.trim().toLowerCase();
    const swarmId = searchParams.get('swarmId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (wallet) {
      where.OR = [
        { senderWallet: wallet },
        { receiverWallet: wallet },
      ];
    }
    if (swarmId) where.swarmId = swarmId;
    if (status) where.status = status;

    const [transfers, total] = await Promise.all([
      prisma.a2ATransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.a2ATransfer.count({ where }),
    ]);

    return apiSuccess({ transfers, total });
  } catch (error: any) {
    return logAndReturn('A2A_TRANSFER', error, 'Failed to list A2A transfers');
  }
}
