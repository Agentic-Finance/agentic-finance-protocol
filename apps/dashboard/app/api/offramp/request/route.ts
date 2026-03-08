/**
 * POST /api/offramp/request
 *
 * Create a fiat off-ramp withdrawal request.
 * Agent sends AlphaUSD → receives USD via PayPal.
 *
 * Body: { wallet: string, paypalEmail: string, amount: number }
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { calculateWithdrawalFees, validateWithdrawal, sendPayout, PAYPAL_ENV } from '@/app/lib/paypal-payouts';
import { notify } from '@/app/lib/notify';
import { apiError, logAndReturn } from '@/app/lib/api-response';

export async function POST(req: Request) {
  try {
    const { wallet, paypalEmail, amount } = await req.json();

    if (!wallet || !paypalEmail || !amount) {
      return apiError('Missing wallet, paypalEmail, or amount', 400);
    }

    // Validate
    const error = validateWithdrawal(amount, paypalEmail);
    if (error) return apiError(error, 400);

    // Calculate fees
    const fees = calculateWithdrawalFees(amount);

    // Create withdrawal request
    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userWallet: wallet,
        paypalEmail,
        amountCrypto: fees.amountCrypto,
        amountUSD: fees.amountUSD,
        platformFee: fees.platformFee,
        token: 'AlphaUSD',
        status: 'PENDING',
      },
    });

    // In sandbox/demo mode, process immediately
    // In production, daemon would process this
    try {
      const result = await sendPayout(paypalEmail, fees.amountUSD, withdrawal.id);

      if (result.success) {
        await prisma.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            status: 'PROCESSING',
            paypalPayoutId: result.payoutBatchId,
            processedAt: new Date(),
          },
        });

        // Log audit event
        await prisma.auditEvent.create({
          data: {
            agentId: wallet,
            eventType: 'OFFRAMP_INITIATED',
            title: `Off-Ramp: $${fees.amountUSD} → PayPal`,
            description: `Withdrawal of ${fees.amountCrypto} AlphaUSD → $${fees.amountUSD} USD to ${paypalEmail}`,
            metadata: {
              withdrawalId: withdrawal.id,
              amountCrypto: fees.amountCrypto,
              amountUSD: fees.amountUSD,
              platformFee: fees.platformFee,
              paypalPayoutId: result.payoutBatchId,
              environment: PAYPAL_ENV,
            } as any,
            severity: 'SUCCESS',
          },
        });

        notify({
          wallet,
          type: 'offramp:processing' as any,
          title: 'Withdrawal Processing',
          message: `$${fees.amountUSD} USD is being sent to ${paypalEmail}`,
        }).catch(() => {});

        return NextResponse.json({
          success: true,
          withdrawal: {
            id: withdrawal.id,
            status: 'PROCESSING',
            amountCrypto: fees.amountCrypto,
            amountUSD: fees.amountUSD,
            platformFee: fees.platformFee,
            paypalPayoutId: result.payoutBatchId,
            paypalEmail,
          },
        });
      } else {
        // PayPal rejected the payout
        await prisma.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            status: 'FAILED',
            failureReason: result.error || 'PayPal payout rejected',
          },
        });

        return NextResponse.json({
          success: false,
          error: result.error || 'PayPal payout failed',
          withdrawal: { id: withdrawal.id, status: 'FAILED' },
        }, { status: 502 });
      }
    } catch (paypalErr: any) {
      // PayPal API error — mark as pending for retry
      await prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: 'PENDING',
          failureReason: `PayPal API error: ${paypalErr.message}`,
        },
      });

      // Still return success — withdrawal is queued for retry
      return NextResponse.json({
        success: true,
        withdrawal: {
          id: withdrawal.id,
          status: 'PENDING',
          amountCrypto: fees.amountCrypto,
          amountUSD: fees.amountUSD,
          platformFee: fees.platformFee,
          message: 'Withdrawal queued — will be processed shortly',
        },
      });
    }

  } catch (error: any) {
    return logAndReturn('OffRamp Request', error, 'Failed to create withdrawal request');
  }
}
