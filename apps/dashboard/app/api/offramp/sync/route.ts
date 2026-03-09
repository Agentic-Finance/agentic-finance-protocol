/**
 * POST /api/offramp/sync
 *
 * Daemon calls this to sync all PROCESSING withdrawals with PayPal.
 * Finds PROCESSING withdrawals, checks PayPal status for each, updates DB.
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getPayoutStatus } from '@/app/lib/paypal-payouts';

export async function POST() {
  try {
    const processing = await prisma.withdrawalRequest.findMany({
      where: { status: 'PROCESSING', paypalPayoutId: { not: null } },
      take: 10,
    });

    if (processing.length === 0) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    const results: Array<{ id: string; status: string; reason?: string }> = [];

    for (const w of processing) {
      try {
        const paypalStatus = await getPayoutStatus(w.paypalPayoutId!);

        if (paypalStatus.status === 'SUCCESS') {
          const item = paypalStatus.items[0];
          const itemStatus = item?.status || 'UNKNOWN';

          if (itemStatus === 'SUCCESS') {
            await prisma.withdrawalRequest.update({
              where: { id: w.id },
              data: {
                status: 'COMPLETED',
                paypalPayoutItemId: item?.payoutItemId,
                paypalTransactionId: item?.transactionId,
                paypalFee: item?.fee ? parseFloat(item.fee) : 0,
                completedAt: new Date(),
              },
            });
            results.push({ id: w.id, status: 'COMPLETED' });
          } else if (itemStatus === 'UNCLAIMED') {
            await prisma.withdrawalRequest.update({
              where: { id: w.id },
              data: {
                status: 'FAILED',
                paypalPayoutItemId: item?.payoutItemId,
                paypalTransactionId: item?.transactionId,
                failureReason: item?.error || 'Recipient email is not registered on PayPal.',
              },
            });
            results.push({ id: w.id, status: 'FAILED', reason: 'RECEIVER_UNREGISTERED' });
          } else if (['RETURNED', 'BLOCKED', 'REFUNDED', 'FAILED'].includes(itemStatus)) {
            await prisma.withdrawalRequest.update({
              where: { id: w.id },
              data: {
                status: 'FAILED',
                paypalPayoutItemId: item?.payoutItemId,
                failureReason: item?.error || `PayPal item status: ${itemStatus}`,
              },
            });
            results.push({ id: w.id, status: 'FAILED', reason: itemStatus });
          } else {
            // PENDING, ONHOLD — still processing
            results.push({ id: w.id, status: 'PROCESSING', reason: itemStatus });
          }
        } else if (paypalStatus.status === 'DENIED' || paypalStatus.status === 'CANCELED') {
          const item = paypalStatus.items[0];
          await prisma.withdrawalRequest.update({
            where: { id: w.id },
            data: {
              status: 'FAILED',
              failureReason: item?.error || `PayPal batch: ${paypalStatus.status}`,
            },
          });
          results.push({ id: w.id, status: 'FAILED', reason: paypalStatus.status });
        } else {
          results.push({ id: w.id, status: 'PROCESSING', reason: paypalStatus.status });
        }
      } catch {
        results.push({ id: w.id, status: 'ERROR' });
      }
    }

    return NextResponse.json({
      success: true,
      synced: results.filter(r => r.status !== 'PROCESSING' && r.status !== 'ERROR').length,
      total: processing.length,
      results,
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
