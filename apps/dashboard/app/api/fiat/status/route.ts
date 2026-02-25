/**
 * GET /api/fiat/status?sessionId=cs_xxx
 *
 * Check the status of a fiat payment session.
 * Returns payment status, amounts, and transaction hashes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const payment = await prisma.fiatPayment.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amountUSD: payment.amountUSD,
      amountCrypto: payment.amountCrypto,
      token: payment.token,
      userWallet: payment.userWallet,
      transferTxHash: payment.transferTxHash,
      escrowTxHash: payment.escrowTxHash,
      explorerUrl: payment.transferTxHash
        ? `https://explore.tempo.xyz/tx/${payment.transferTxHash}`
        : null,
      createdAt: payment.createdAt.toISOString(),
      completedAt: payment.completedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    console.error('[fiat/status] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch status' },
      { status: 500 },
    );
  }
}
