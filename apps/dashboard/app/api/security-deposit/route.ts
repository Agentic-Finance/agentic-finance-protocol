/**
 * GET /api/security-deposit?wallet=0x...
 *
 * Returns deposit info, tier, fee discount, and vault stats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { SECURITY_DEPOSIT_ADDRESS, SECURITY_DEPOSIT_ABI, RPC_URL } from '../../lib/constants';

const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold'];
const TIER_EMOJIS = ['⚪', '🥉', '🥈', '🥇'];

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet');

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const vault = new ethers.Contract(SECURITY_DEPOSIT_ADDRESS, SECURITY_DEPOSIT_ABI, provider);

    // Get vault stats
    const [totalDeposited, totalSlashed, totalInsurancePaid, insurancePool, totalAgents] =
      await vault.getStats();

    const response: any = {
      vaultAddress: SECURITY_DEPOSIT_ADDRESS,
      stats: {
        totalDeposited: Number(ethers.formatUnits(totalDeposited, 6)),
        totalSlashed: Number(ethers.formatUnits(totalSlashed, 6)),
        totalInsurancePaid: Number(ethers.formatUnits(totalInsurancePaid, 6)),
        insurancePool: Number(ethers.formatUnits(insurancePool, 6)),
        totalAgents: Number(totalAgents),
      },
      tiers: [
        { name: 'None',   emoji: '⚪', threshold: 0,    discount: '0%',   effectiveFee: '8.0%' },
        { name: 'Bronze', emoji: '🥉', threshold: 50,   discount: '0.5%', effectiveFee: '7.5%' },
        { name: 'Silver', emoji: '🥈', threshold: 200,  discount: '1.5%', effectiveFee: '6.5%' },
        { name: 'Gold',   emoji: '🥇', threshold: 1000, discount: '3.0%', effectiveFee: '5.0%' },
      ],
    };

    // If wallet provided, get specific deposit info
    if (wallet && wallet.startsWith('0x')) {
      try {
        const [amount, depositedAt, slashCount, totalSlashedAmt, tier, feeDiscount, lockExpired] =
          await vault.getDeposit(wallet);

        response.deposit = {
          wallet,
          amount: Number(ethers.formatUnits(amount, 6)),
          depositedAt: Number(depositedAt),
          depositedAtISO: Number(depositedAt) > 0
            ? new Date(Number(depositedAt) * 1000).toISOString()
            : null,
          slashCount: Number(slashCount),
          totalSlashed: Number(ethers.formatUnits(totalSlashedAmt, 6)),
          tier: Number(tier),
          tierName: TIER_NAMES[Number(tier)] ?? 'Unknown',
          tierEmoji: TIER_EMOJIS[Number(tier)] ?? '⚪',
          feeDiscountBps: Number(feeDiscount),
          feeDiscountPct: (Number(feeDiscount) / 100).toFixed(1) + '%',
          effectiveFeePct: ((800 - Number(feeDiscount)) / 100).toFixed(1) + '%',
          lockExpired,
          lockExpiresAt: Number(depositedAt) > 0
            ? new Date((Number(depositedAt) + 30 * 86400) * 1000).toISOString()
            : null,
        };
      } catch (err) {
        response.deposit = { wallet, amount: 0, tier: 0, tierName: 'None', error: 'Could not read deposit' };
      }
    }

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[security-deposit] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
