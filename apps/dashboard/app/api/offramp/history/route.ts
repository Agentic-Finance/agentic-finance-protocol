/**
 * GET /api/offramp/history?wallet=0x...
 *
 * Returns withdrawal history for a wallet.
 * Also returns aggregate stats.
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { PLATFORM_FEE_RATE, MIN_WITHDRAWAL, MAX_WITHDRAWAL, PAYPAL_ENV } from '@/app/lib/paypal-payouts';
import { logAndReturn } from '@/app/lib/api-response';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (wallet) where.userWallet = wallet;

    const [withdrawals, stats] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.withdrawalRequest.aggregate({
        where,
        _sum: { amountUSD: true, amountCrypto: true, platformFee: true, paypalFee: true },
        _count: true,
        _avg: { amountUSD: true },
      }),
    ]);

    const completedCount = await prisma.withdrawalRequest.count({
      where: { ...where, status: 'COMPLETED' },
    });

    const pendingCount = await prisma.withdrawalRequest.count({
      where: { ...where, status: { in: ['PENDING', 'PROCESSING'] } },
    });

    return NextResponse.json({
      success: true,
      withdrawals,
      stats: {
        totalWithdrawals: stats._count,
        completedCount,
        pendingCount,
        totalCryptoWithdrawn: stats._sum.amountCrypto ?? 0,
        totalUSDPaid: stats._sum.amountUSD ?? 0,
        totalPlatformFees: stats._sum.platformFee ?? 0,
        totalPaypalFees: stats._sum.paypalFee ?? 0,
        avgWithdrawal: stats._avg.amountUSD ?? 0,
      },
      config: {
        feeRate: `${(PLATFORM_FEE_RATE * 100).toFixed(1)}%`,
        minWithdrawal: MIN_WITHDRAWAL,
        maxWithdrawal: MAX_WITHDRAWAL,
        environment: PAYPAL_ENV,
      },
    });

  } catch (error: any) {
    return logAndReturn('OffRamp History', error, 'Failed to fetch withdrawal history');
  }
}
