/**
 * GET /api/offramp/status?id=xxx
 *
 * Check the status of a withdrawal request.
 * Also syncs with PayPal if status is PROCESSING.
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getPayoutStatus } from '@/app/lib/paypal-payouts';
import { apiError, logAndReturn } from '@/app/lib/api-response';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return apiError('Missing withdrawal id', 400);

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
    });

    if (!withdrawal) return apiError('Withdrawal not found', 404);

    // If still processing, check PayPal status
    if (withdrawal.status === 'PROCESSING' && withdrawal.paypalPayoutId) {
      try {
        const paypalStatus = await getPayoutStatus(withdrawal.paypalPayoutId);

        if (paypalStatus.status === 'SUCCESS') {
          const item = paypalStatus.items[0];
          await prisma.withdrawalRequest.update({
            where: { id },
            data: {
              status: 'COMPLETED',
              paypalPayoutItemId: item?.payoutItemId,
              paypalTransactionId: item?.transactionId,
              paypalFee: item?.fee ? parseFloat(item.fee) : 0,
              completedAt: new Date(),
            },
          });

          return NextResponse.json({
            success: true,
            status: 'COMPLETED',
            paypalTransactionId: item?.transactionId,
            paypalFee: item?.fee,
          });
        } else if (paypalStatus.status === 'DENIED' || paypalStatus.status === 'CANCELED') {
          const item = paypalStatus.items[0];
          await prisma.withdrawalRequest.update({
            where: { id },
            data: {
              status: 'FAILED',
              failureReason: item?.error || `PayPal batch status: ${paypalStatus.status}`,
            },
          });

          return NextResponse.json({
            success: true,
            status: 'FAILED',
            reason: item?.error || paypalStatus.status,
          });
        }

        // Still processing
        return NextResponse.json({
          success: true,
          status: 'PROCESSING',
          paypalBatchStatus: paypalStatus.status,
        });
      } catch {
        // Can't reach PayPal, return cached status
      }
    }

    return NextResponse.json({
      success: true,
      id: withdrawal.id,
      status: withdrawal.status,
      amountCrypto: withdrawal.amountCrypto,
      amountUSD: withdrawal.amountUSD,
      platformFee: withdrawal.platformFee,
      paypalFee: withdrawal.paypalFee,
      paypalEmail: withdrawal.paypalEmail,
      paypalPayoutId: withdrawal.paypalPayoutId,
      paypalTransactionId: withdrawal.paypalTransactionId,
      failureReason: withdrawal.failureReason,
      createdAt: withdrawal.createdAt,
      completedAt: withdrawal.completedAt,
    });

  } catch (error: any) {
    return logAndReturn('OffRamp Status', error, 'Failed to check withdrawal status');
  }
}
