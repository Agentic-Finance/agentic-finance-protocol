import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import prisma from '../../lib/prisma';
import {
  RPC_URL, ERC20_ABI, SUPPORTED_TOKENS,
  REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI,
  SECURITY_DEPOSIT_ADDRESS, SECURITY_DEPOSIT_ABI,
} from '../../lib/constants';

const TIER_LABELS = ['Newcomer', 'Rising', 'Trusted', 'Elite', 'Legend'];
const DEPOSIT_TIERS = ['None', 'Bronze', 'Silver', 'Gold'];
const DEPOSIT_EMOJIS = ['⚪', '🥉', '🥈', '🥇'];

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet || !ethers.isAddress(wallet)) {
    return NextResponse.json({ success: false, error: 'Invalid or missing wallet address' }, { status: 400 });
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    const [balances, escrows, streams, reputation, deposit, recentActivity] = await Promise.all([
      // 1. Token balances
      (async () => {
        try {
          const results = await Promise.all(
            SUPPORTED_TOKENS.map(async (token) => {
              try {
                const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
                const raw = await contract.balanceOf(wallet);
                return {
                  symbol: token.symbol,
                  balance: ethers.formatUnits(raw, token.decimals),
                  address: token.address,
                };
              } catch {
                return { symbol: token.symbol, balance: '0', address: token.address };
              }
            })
          );
          return results;
        } catch {
          return SUPPORTED_TOKENS.map((t) => ({ symbol: t.symbol, balance: '0', address: t.address }));
        }
      })(),

      // 2. Escrows
      (async () => {
        try {
          const jobs = await prisma.agentJob.findMany({
            where: { clientWallet: wallet },
            include: { agent: true },
          });
          const active = jobs.filter((j) =>
            ['CREATED', 'MATCHED', 'NEGOTIATING', 'ESCROW_LOCKED', 'EXECUTING', 'DISPUTED'].includes(j.status)
          );
          const completed = jobs.filter((j) =>
            ['COMPLETED', 'SETTLED', 'REFUNDED', 'FAILED'].includes(j.status)
          );
          return {
            active,
            completed,
            counts: {
              total: jobs.length,
              active: active.length,
              completed: completed.length,
            },
          };
        } catch {
          return { active: [], completed: [], counts: { total: 0, active: 0, completed: 0 } };
        }
      })(),

      // 3. Streams
      (async () => {
        try {
          const streamJobs = await prisma.streamJob.findMany({
            where: { clientWallet: wallet },
            include: { milestones: true },
          });
          const active = streamJobs.filter((s) => s.status === 'ACTIVE');
          const completed = streamJobs.filter((s) => ['COMPLETED', 'CANCELLED'].includes(s.status));
          return {
            active,
            completed,
            counts: {
              total: streamJobs.length,
              active: active.length,
              completed: completed.length,
            },
          };
        } catch {
          return { active: [], completed: [], counts: { total: 0, active: 0, completed: 0 } };
        }
      })(),

      // 4. Reputation
      (async () => {
        try {
          const registry = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, provider);
          const [compositeScore, tier] = await Promise.all([
            registry.getCompositeScore(wallet),
            registry.getTier(wallet),
          ]);
          const tierNum = Number(tier);
          const scoreNum = Number(compositeScore);
          return {
            compositeScore: scoreNum,
            displayScore: Math.min(scoreNum, 100),
            tier: tierNum,
            tierLabel: TIER_LABELS[tierNum] ?? 'Unknown',
          };
        } catch {
          return { compositeScore: 0, displayScore: 0, tier: 0, tierLabel: 'Newcomer' };
        }
      })(),

      // 5. Security Deposit
      (async () => {
        try {
          const vault = new ethers.Contract(SECURITY_DEPOSIT_ADDRESS, SECURITY_DEPOSIT_ABI, provider);
          const result = await vault.getDeposit(wallet);
          const [amount, , , , tier, feeDiscount] = result;
          const tierNum = Number(tier);
          return {
            amount: ethers.formatUnits(amount, 6),
            tier: tierNum,
            tierName: DEPOSIT_TIERS[tierNum] ?? 'None',
            tierEmoji: DEPOSIT_EMOJIS[tierNum] ?? '⚪',
            feeDiscount: Number(feeDiscount),
          };
        } catch {
          return { amount: '0', tier: 0, tierName: 'None', tierEmoji: '⚪', feeDiscount: 0 };
        }
      })(),

      // 6. Recent activity
      (async () => {
        try {
          return await prisma.agentJob.findMany({
            where: { clientWallet: wallet },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { agent: true },
          });
        } catch {
          return [];
        }
      })(),
    ]);

    // Summary calculations
    const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);

    return NextResponse.json({
      success: true,
      wallet,
      balances,
      escrows,
      streams,
      reputation,
      deposit,
      recentActivity,
      summary: {
        totalBalance: totalBalance.toFixed(2),
        activeEscrows: escrows.counts.active,
        activeStreams: streams.counts.active,
        trustScore: reputation.displayScore,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
