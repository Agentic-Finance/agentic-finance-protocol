/**
 * Scheduled Transactions API — /api/scheduled-tx
 *
 * POST — Create a new scheduled transaction
 * GET  — List pending/all scheduled transactions
 * DELETE — Cancel a pending scheduled transaction
 */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { validateScheduledTx, type CreateScheduledTxParams } from '../../lib/tempo/scheduled-tx';
import { isHex, isAddress } from 'viem';

const prisma = new PrismaClient();

// ────────────────────────────────────────────
// POST — Create Scheduled Transaction
// ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, label, toAddress, calldata, value, token, validAfter, validBefore } = body;

    const params: CreateScheduledTxParams = {
      wallet,
      label,
      toAddress,
      calldata,
      value: value || '0',
      token: token || null,
      validAfter: new Date(validAfter),
      validBefore: new Date(validBefore),
    };

    // Validate
    const error = validateScheduledTx(params);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid target address' }, { status: 400 });
    }
    if (!isHex(calldata)) {
      return NextResponse.json({ error: 'Invalid calldata — must be hex' }, { status: 400 });
    }

    // Create
    const scheduled = await prisma.scheduledTransaction.create({
      data: {
        wallet: params.wallet,
        label: params.label,
        toAddress: params.toAddress,
        calldata: params.calldata,
        value: params.value || '0',
        token: params.token,
        validAfter: params.validAfter,
        validBefore: params.validBefore,
      },
    });

    console.log(`[SCHEDULED_TX] Created: "${label}" — window: ${params.validAfter.toISOString()} → ${params.validBefore.toISOString()}`);

    return NextResponse.json({
      id: scheduled.id,
      label: scheduled.label,
      status: scheduled.status,
      validAfter: scheduled.validAfter,
      validBefore: scheduled.validBefore,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[SCHEDULED_TX] Create error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create scheduled transaction' }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// GET — List Scheduled Transactions
// ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (wallet) where.wallet = wallet;
    if (status) where.status = status;

    const transactions = await prisma.scheduledTransaction.findMany({
      where,
      orderBy: { validAfter: 'asc' },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({
      transactions,
      count: transactions.length,
    });
  } catch (err: any) {
    console.error('[SCHEDULED_TX] List error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to list scheduled transactions' }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// DELETE — Cancel Scheduled Transaction
// ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    const tx = await prisma.scheduledTransaction.findUnique({ where: { id } });
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (tx.status !== 'PENDING') {
      return NextResponse.json({ error: `Cannot cancel — status is ${tx.status}` }, { status: 400 });
    }

    await prisma.scheduledTransaction.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    console.log(`[SCHEDULED_TX] Cancelled: "${tx.label}"`);

    return NextResponse.json({ id, status: 'CANCELLED' });
  } catch (err: any) {
    console.error('[SCHEDULED_TX] Cancel error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to cancel transaction' }, { status: 500 });
  }
}
