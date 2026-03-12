/**
 * POST /api/metering/use — Record a metered inference call
 *
 * Deducts pricePerCall from the session budget.
 * Returns remaining budget and call count.
 * Auto-closes session when budget exhausted.
 *
 * Body: {
 *   sessionId: string,
 *   agentId?: string,    // Which agent was used
 *   callType?: string,   // "inference" | "query" | "execution"
 *   metadata?: object    // Additional call details (tokens used, model, etc.)
 * }
 *
 * Headers: X-Wallet-Address (agent wallet making the call)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { apiLimiter, getClientId } from '@/app/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit (high throughput for metering)
  const clientId = getClientId(req);
  const limit = apiLimiter.check(clientId);
  if (!limit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { sessionId, agentId, callType = 'inference', metadata } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Find active session
    const session = await prisma.meteringSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'ACTIVE') {
      return NextResponse.json({
        error: `Session is ${session.status}`,
        spent: session.spent,
        totalCalls: session.totalCalls,
      }, { status: 400 });
    }

    // Check if expired
    if (session.expiresAt && session.expiresAt < new Date()) {
      await prisma.meteringSession.update({
        where: { id: sessionId },
        data: { status: 'EXHAUSTED', closedAt: new Date() },
      });
      return NextResponse.json({
        error: 'Session expired',
        spent: session.spent,
        totalCalls: session.totalCalls,
      }, { status: 400 });
    }

    // Check budget
    const newSpent = session.spent + session.pricePerCall;
    const remaining = session.budgetCap - newSpent;

    if (remaining < 0) {
      await prisma.meteringSession.update({
        where: { id: sessionId },
        data: { status: 'EXHAUSTED', closedAt: new Date() },
      });
      return NextResponse.json({
        error: 'Budget exhausted',
        spent: session.spent,
        totalCalls: session.totalCalls,
        budgetCap: session.budgetCap,
      }, { status: 402 }); // 402 Payment Required
    }

    // Record the call
    const callLog = session.metadata ? JSON.parse(session.metadata) : {};
    if (!callLog.calls) callLog.calls = [];
    callLog.calls.push({
      timestamp: new Date().toISOString(),
      callType,
      agentId: agentId || session.agentId,
      cost: session.pricePerCall,
      ...(metadata || {}),
    });

    // Keep only last 100 call logs to avoid bloat
    if (callLog.calls.length > 100) {
      callLog.calls = callLog.calls.slice(-100);
    }

    // Determine if this exhausts the budget
    const isExhausted = remaining < session.pricePerCall;
    const newStatus = isExhausted ? 'EXHAUSTED' : 'ACTIVE';

    const updated = await prisma.meteringSession.update({
      where: { id: sessionId },
      data: {
        spent: newSpent,
        totalCalls: session.totalCalls + 1,
        status: newStatus,
        metadata: JSON.stringify(callLog),
        ...(isExhausted ? { closedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: updated.id,
      callNumber: updated.totalCalls,
      cost: session.pricePerCall,
      spent: updated.spent,
      remaining: Math.max(0, updated.budgetCap - updated.spent),
      budgetCap: updated.budgetCap,
      status: updated.status,
      isExhausted,
      callsRemaining: isExhausted ? 0 : Math.floor((updated.budgetCap - updated.spent) / session.pricePerCall),
    });

  } catch (err: any) {
    console.error('[metering/use] Error:', err.message);
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 });
  }
}
