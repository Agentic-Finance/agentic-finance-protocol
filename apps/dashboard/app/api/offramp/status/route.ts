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
          const itemStatus = item?.status || 'UNKNOWN';

          // Check ITEM-level status (batch SUCCESS doesn't mean item completed)
          if (itemStatus === 'SUCCESS') {
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
              success: true, status: 'COMPLETED',
              paypalTransactionId: item?.transactionId, paypalFee: item?.fee,
            });
          }

          if (itemStatus === 'UNCLAIMED') {
            // Recipient doesn't have a PayPal account — money is held for 30 days
            await prisma.withdrawalRequest.update({
              where: { id },
              data: {
                status: 'FAILED',
                paypalPayoutItemId: item?.payoutItemId,
                paypalTransactionId: item?.transactionId,
                failureReason: item?.error || 'Recipient email is not registered on PayPal. Funds will be returned in 30 days.',
              },
            });
            return NextResponse.json({
              success: true, status: 'FAILED',
              reason: 'RECEIVER_UNREGISTERED — email is not a PayPal account',
            });
          }

          if (itemStatus === 'RETURNED' || itemStatus === 'BLOCKED' || itemStatus === 'REFUNDED' || itemStatus === 'FAILED') {
            await prisma.withdrawalRequest.update({
              where: { id },
              data: {
                status: 'FAILED',
                paypalPayoutItemId: item?.payoutItemId,
                failureReason: item?.error || `PayPal item status: ${itemStatus}`,
              },
            });
            return NextResponse.json({
              success: true, status: 'FAILED',
              reason: item?.error || itemStatus,
            });
          }

          // Item still PENDING or ONHOLD — keep as PROCESSING
          return NextResponse.json({
            success: true, status: 'PROCESSING',
            paypalBatchStatus: paypalStatus.status, paypalItemStatus: itemStatus,
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
            success: true, status: 'FAILED',
            reason: item?.error || paypalStatus.status,
          });
        }

        // Still processing at batch level
        return NextResponse.json({
          success: true, status: 'PROCESSING',
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
