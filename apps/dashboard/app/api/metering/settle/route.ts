/**
 * POST /api/metering/settle — Settle a metering session on-chain
 *
 * Closes the session and records final settlement.
 * Can optionally trigger on-chain StreamV1 settlement if linked.
 *
 * Body: {
 *   sessionId: string,
 *   settleTxHash?: string  // If already settled on-chain
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { requireWalletAuth } from '@/app/lib/api-auth';

export async function POST(req: NextRequest) {
  const auth = requireWalletAuth(req);
  if (!auth.valid) return auth.response!;

  try {
    const { sessionId, settleTxHash } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const session = await prisma.meteringSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only client or agent can settle
    if (auth.wallet !== session.clientWallet && auth.wallet !== session.agentWallet) {
      return NextResponse.json({ error: 'Not authorized to settle this session' }, { status: 403 });
    }

    // Already settled
    if (session.status === 'SETTLED') {
      return NextResponse.json({
        error: 'Session already settled',
        settleTxHash: session.settleTxHash,
      }, { status: 400 });
    }

    const platformFee = session.spent * 0.05; // 5% platform fee
    const agentPayout = session.spent - platformFee;
    const refund = session.budgetCap - session.spent;

    const updated = await prisma.meteringSession.update({
      where: { id: sessionId },
      data: {
        status: 'SETTLED',
        closedAt: new Date(),
        settleTxHash: settleTxHash || null,
        metadata: JSON.stringify({
          ...JSON.parse(session.metadata || '{}'),
          settlement: {
            totalSpent: session.spent,
            platformFee,
            agentPayout,
            refundToClient: refund,
            settledAt: new Date().toISOString(),
            settledBy: auth.wallet,
            settleTxHash: settleTxHash || null,
          },
        }),
      },
    });

    return NextResponse.json({
      success: true,
      settlement: {
        sessionId: updated.id,
        status: 'SETTLED',
        totalCalls: updated.totalCalls,
        totalSpent: updated.spent,
        budgetCap: updated.budgetCap,
        platformFee,
        agentPayout,
        refundToClient: refund,
        pricePerCall: updated.pricePerCall,
        token: updated.token,
        settleTxHash: updated.settleTxHash,
        closedAt: updated.closedAt?.toISOString(),
      },
    });

  } catch (err: any) {
    console.error('[metering/settle] Error:', err.message);
    return NextResponse.json({ error: 'Settlement failed' }, { status: 500 });
  }
}
