/**
 * GET /api/offramp/history?wallet=0x...&limit=100
 *
 * Returns withdrawal history for a wallet.
 * Also returns aggregate stats with separate completed/total amounts.
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { PLATFORM_FEE_RATE, MIN_WITHDRAWAL, MAX_WITHDRAWAL, PAYPAL_ENV } from '@/app/lib/paypal-payouts';
import { logAndReturn } from '@/app/lib/api-response';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: any = {};
    if (wallet) where.userWallet = wallet;

    const [withdrawals, totalStats, completedStats, completedCount, pendingCount, failedCount] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
      }),
      // Total aggregate (all statuses)
      prisma.withdrawalRequest.aggregate({
        where,
        _sum: { amountUSD: true, amountCrypto: true, platformFee: true, paypalFee: true },
        _count: true,
      }),
      // Completed-only aggregate (only COMPLETED count for "Total Withdrawn")
      prisma.withdrawalRequest.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { amountUSD: true, amountCrypto: true, platformFee: true, paypalFee: true },
      }),
      prisma.withdrawalRequest.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      prisma.withdrawalRequest.count({
        where: { ...where, status: { in: ['PENDING', 'PROCESSING', 'CRYPTO_LOCKED'] } },
      }),
      prisma.withdrawalRequest.count({
        where: { ...where, status: 'FAILED' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      withdrawals,
      stats: {
        totalWithdrawals: totalStats._count,
        completedCount,
        pendingCount,
        failedCount,
        // "Total Withdrawn" should reflect only COMPLETED withdrawals
        completedUSD: completedStats._sum.amountUSD ?? 0,
        completedCrypto: completedStats._sum.amountCrypto ?? 0,
        // All-status totals (kept for backward compat)
        totalCryptoWithdrawn: totalStats._sum.amountCrypto ?? 0,
        totalUSDPaid: totalStats._sum.amountUSD ?? 0,
        totalPlatformFees: completedStats._sum.platformFee ?? 0,  // fees only from completed
        totalPaypalFees: completedStats._sum.paypalFee ?? 0,
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
