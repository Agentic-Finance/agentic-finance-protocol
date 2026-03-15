/**
 * PayFi Credit Layer API
 *
 * POST /api/payfi — Apply for credit, repay, check score
 * GET  /api/payfi — Credit info, stats, history
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import {
  gatherCreditFactors,
  calculateCreditScore,
  getCreditTier,
  calculateRepayment,
  CREDIT_TIERS,
} from '@/app/lib/payfi/credit';

// ────────────────────────────────────────────
// GET /api/payfi
// ────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // Credit score for a wallet
  if (action === 'score') {
    const wallet = searchParams.get('wallet');
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
    }

    try {
      const factors = await gatherCreditFactors(wallet);
      const { score, breakdown } = calculateCreditScore(factors);
      const tier = getCreditTier(score);

      return NextResponse.json({
        wallet,
        creditScore: score,
        tier: tier ? tier.name : 'Ineligible',
        maxCredit: tier ? tier.maxCredit : 0,
        interestRate: tier ? tier.interestRate + '%' : 'N/A',
        breakdown,
        factors: {
          totalJobsCompleted: factors.totalJobsCompleted,
          totalEarnings: factors.totalEarnings,
          avgRating: factors.avgRating,
          accountAgeDays: factors.accountAge,
          walletBalance: factors.walletBalance,
          activeCredits: factors.activeCredits,
          repaidCredits: factors.repaidCredits,
        },
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Active credit lines for a wallet
  if (action === 'credits') {
    const wallet = searchParams.get('wallet');
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
    }

    const credits = await prisma.creditLine.findMany({
      where: { borrowerWallet: wallet },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ credits, count: credits.length });
  }

  // Credit history (repayments)
  if (action === 'history') {
    const wallet = searchParams.get('wallet');
    const creditId = searchParams.get('creditId');

    const transactions = await prisma.creditTransaction.findMany({
      where: {
        ...(wallet ? { creditLine: { borrowerWallet: wallet } } : {}),
        ...(creditId ? { creditLineId: creditId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { creditLine: { select: { borrowerWallet: true, amount: true } } },
    });

    return NextResponse.json({ transactions, count: transactions.length });
  }

  // Platform stats
  if (action === 'stats') {
    const [totalLines, activeLines, totalBorrowed, totalRepaid, defaults] = await Promise.all([
      prisma.creditLine.count(),
      prisma.creditLine.count({ where: { status: 'ACTIVE' } }),
      prisma.creditLine.aggregate({ _sum: { amount: true } }),
      prisma.creditLine.aggregate({ _sum: { repaidAmount: true } }),
      prisma.creditLine.count({ where: { status: 'DEFAULTED' } }),
    ]);

    return NextResponse.json({
      totalCreditLines: totalLines,
      activeCreditLines: activeLines,
      totalBorrowed: totalBorrowed._sum?.amount || 0,
      totalRepaid: totalRepaid._sum?.repaidAmount || 0,
      defaultRate: totalLines > 0 ? ((defaults / totalLines) * 100).toFixed(1) + '%' : '0%',
    });
  }

  // Protocol info
  return NextResponse.json({
    protocol: 'Agentic Finance PayFi Credit Layer',
    description: 'AI agents borrow AlphaUSD based on payment history. Automatic repayment from job settlements.',
    token: 'AlphaUSD',
    chain: 'Tempo Moderato (42431)',
    tiers: CREDIT_TIERS.map((t) => ({
      name: t.name,
      minScore: t.minScore,
      maxCredit: `${t.maxCredit} AUSD`,
      interestRate: `${t.interestRate}% APR`,
      maxTerm: `${t.maxTermDays} days`,
    })),
    endpoints: {
      score: 'GET /api/payfi?action=score&wallet=0x...',
      credits: 'GET /api/payfi?action=credits&wallet=0x...',
      history: 'GET /api/payfi?action=history&wallet=0x...',
      stats: 'GET /api/payfi?action=stats',
      apply: 'POST /api/payfi { action: "apply", wallet, amount, termDays, purpose }',
      repay: 'POST /api/payfi { action: "repay", creditId, amount }',
    },
  });
}

// ────────────────────────────────────────────
// POST /api/payfi
// ────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'apply':
        return await handleApply(body);
      case 'repay':
        return await handleRepay(body);
      case 'simulate':
        return await handleSimulate(body);
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: apply, repay, simulate' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[PayFi Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// Action Handlers
// ────────────────────────────────────────────

async function handleApply(body: any) {
  const { wallet, amount, termDays = 30, purpose } = body;

  if (!wallet || !amount) {
    return NextResponse.json({ error: 'Missing wallet or amount' }, { status: 400 });
  }

  // Calculate credit score
  const factors = await gatherCreditFactors(wallet);
  const { score, breakdown } = calculateCreditScore(factors);
  const tier = getCreditTier(score);

  if (!tier) {
    return NextResponse.json({
      error: 'Credit score too low',
      creditScore: score,
      minRequired: CREDIT_TIERS[0].minScore,
      suggestion: 'Complete more jobs and build payment history to qualify.',
    }, { status: 403 });
  }

  // Check amount against tier limit
  if (amount > tier.maxCredit) {
    return NextResponse.json({
      error: `Amount exceeds tier limit: max ${tier.maxCredit} AUSD for ${tier.name} tier`,
      creditScore: score,
      tier: tier.name,
      maxCredit: tier.maxCredit,
    }, { status: 400 });
  }

  // Check term against tier limit
  if (termDays > tier.maxTermDays) {
    return NextResponse.json({
      error: `Term exceeds tier limit: max ${tier.maxTermDays} days for ${tier.name} tier`,
    }, { status: 400 });
  }

  // Check active credit lines
  const activeCredits = await prisma.creditLine.count({
    where: { borrowerWallet: wallet, status: 'ACTIVE' },
  });
  if (activeCredits >= 3) {
    return NextResponse.json({
      error: 'Maximum active credit lines (3) reached. Repay existing credits first.',
    }, { status: 400 });
  }

  // Calculate repayment
  const { interest, total } = calculateRepayment(amount, tier.interestRate, termDays);

  // Create credit line
  const credit = await prisma.creditLine.create({
    data: {
      borrowerWallet: wallet,
      amount: parseFloat(String(amount)),
      interestRate: tier.interestRate,
      interestAmount: interest,
      totalDue: total,
      repaidAmount: 0,
      termDays,
      dueDate: new Date(Date.now() + termDays * 24 * 60 * 60 * 1000),
      purpose: purpose || null,
      creditScore: score,
      tier: tier.name,
      status: 'ACTIVE',
    },
  });

  // Record disbursement transaction
  await prisma.creditTransaction.create({
    data: {
      creditLineId: credit.id,
      type: 'DISBURSEMENT',
      amount: parseFloat(String(amount)),
      description: `Credit disbursement: ${amount} AUSD`,
    },
  });

  return NextResponse.json({
    success: true,
    creditId: credit.id,
    borrower: wallet,
    amount,
    interest: parseFloat(interest.toFixed(4)),
    totalDue: parseFloat(total.toFixed(4)),
    interestRate: `${tier.interestRate}% APR`,
    termDays,
    dueDate: credit.dueDate,
    tier: tier.name,
    creditScore: score,
    message: `Credit line approved. Repay ${total.toFixed(2)} AUSD by ${credit.dueDate.toISOString().split('T')[0]}.`,
  });
}

async function handleRepay(body: any) {
  const { creditId, amount } = body;

  if (!creditId || !amount) {
    return NextResponse.json({ error: 'Missing creditId or amount' }, { status: 400 });
  }

  const credit = await prisma.creditLine.findUnique({ where: { id: creditId } });
  if (!credit) {
    return NextResponse.json({ error: 'Credit line not found' }, { status: 404 });
  }

  if (credit.status !== 'ACTIVE') {
    return NextResponse.json({ error: `Credit line is ${credit.status}, not ACTIVE` }, { status: 400 });
  }

  const repayAmount = Math.min(parseFloat(String(amount)), credit.totalDue - credit.repaidAmount);
  const newRepaid = credit.repaidAmount + repayAmount;
  const isFullyRepaid = newRepaid >= credit.totalDue;

  // Update credit line
  await prisma.creditLine.update({
    where: { id: creditId },
    data: {
      repaidAmount: newRepaid,
      status: isFullyRepaid ? 'REPAID' : 'ACTIVE',
      ...(isFullyRepaid ? { repaidAt: new Date() } : {}),
    },
  });

  // Record repayment transaction
  await prisma.creditTransaction.create({
    data: {
      creditLineId: creditId,
      type: 'REPAYMENT',
      amount: repayAmount,
      description: isFullyRepaid
        ? `Full repayment: ${repayAmount.toFixed(2)} AUSD — Credit closed`
        : `Partial repayment: ${repayAmount.toFixed(2)} AUSD`,
    },
  });

  return NextResponse.json({
    success: true,
    creditId,
    repaidAmount: repayAmount,
    totalRepaid: newRepaid,
    remaining: Math.max(0, credit.totalDue - newRepaid),
    status: isFullyRepaid ? 'REPAID' : 'ACTIVE',
    message: isFullyRepaid
      ? 'Credit fully repaid. Credit line closed.'
      : `Partial repayment recorded. Remaining: ${(credit.totalDue - newRepaid).toFixed(2)} AUSD`,
  });
}

async function handleSimulate(body: any) {
  const { wallet, amount, termDays = 30 } = body;

  if (!wallet || !amount) {
    return NextResponse.json({ error: 'Missing wallet or amount' }, { status: 400 });
  }

  const factors = await gatherCreditFactors(wallet);
  const { score, breakdown } = calculateCreditScore(factors);
  const tier = getCreditTier(score);

  if (!tier) {
    return NextResponse.json({
      eligible: false,
      creditScore: score,
      minRequired: CREDIT_TIERS[0].minScore,
      breakdown,
    });
  }

  const eligible = amount <= tier.maxCredit && termDays <= tier.maxTermDays;
  const { interest, total } = calculateRepayment(
    amount,
    tier.interestRate,
    termDays
  );

  return NextResponse.json({
    eligible,
    creditScore: score,
    tier: tier.name,
    requestedAmount: amount,
    maxAllowed: tier.maxCredit,
    termDays,
    maxTermDays: tier.maxTermDays,
    interestRate: `${tier.interestRate}% APR`,
    estimatedInterest: parseFloat(interest.toFixed(4)),
    estimatedTotal: parseFloat(total.toFixed(4)),
    breakdown,
    factors: {
      jobsCompleted: factors.totalJobsCompleted,
      earnings: factors.totalEarnings,
      avgRating: factors.avgRating,
      accountAge: factors.accountAge,
    },
  });
}
