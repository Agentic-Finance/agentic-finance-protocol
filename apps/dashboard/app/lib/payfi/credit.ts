/**
 * PayFi Credit Layer for PayPol
 *
 * Agents can borrow AlphaUSD based on their payment history.
 * Credit scoring uses on-chain reputation + off-chain job performance.
 *
 * Features:
 * - Credit Score (0-850) from payment history
 * - Flash Credit — instant borrowing backed by future earnings
 * - Revenue-backed lending — stream payments as collateral
 * - Automatic repayment from NexusV2 job settlements
 */

import prisma from '@/app/lib/prisma';
import { publicClient } from '@/app/lib/tempo/clients';
import { ERC20_VIEM_ABI } from '@/app/lib/tempo/contracts';
import { SUPPORTED_TOKENS, SECURITY_DEPOSIT_ADDRESS } from '@/app/lib/constants';
import { formatUnits, type Address } from 'viem';

// ────────────────────────────────────────────
// Credit Tiers
// ────────────────────────────────────────────

export interface CreditTier {
  name: string;
  minScore: number;
  maxCredit: number; // Max AlphaUSD credit line
  interestRate: number; // Annual interest rate (%)
  maxTermDays: number;
  requiresDeposit: boolean;
}

export const CREDIT_TIERS: CreditTier[] = [
  { name: 'Starter', minScore: 300, maxCredit: 50, interestRate: 12, maxTermDays: 7, requiresDeposit: true },
  { name: 'Basic', minScore: 450, maxCredit: 200, interestRate: 8, maxTermDays: 14, requiresDeposit: true },
  { name: 'Standard', minScore: 550, maxCredit: 1000, interestRate: 6, maxTermDays: 30, requiresDeposit: false },
  { name: 'Premium', minScore: 700, maxCredit: 5000, interestRate: 4, maxTermDays: 60, requiresDeposit: false },
  { name: 'Elite', minScore: 800, maxCredit: 25000, interestRate: 2, maxTermDays: 90, requiresDeposit: false },
];

export function getCreditTier(score: number): CreditTier | null {
  // Find highest tier the agent qualifies for
  const qualifying = CREDIT_TIERS.filter((t) => score >= t.minScore);
  return qualifying.length > 0 ? qualifying[qualifying.length - 1] : null;
}

// ────────────────────────────────────────────
// Credit Scoring Engine
// ────────────────────────────────────────────

export interface CreditFactors {
  // Job performance
  totalJobsCompleted: number;
  totalJobsFailed: number;
  totalEarnings: number;
  avgJobValue: number;
  avgRating: number;

  // Payment history
  onTimePayments: number;
  latePayments: number;
  defaultedPayments: number;

  // On-chain factors
  securityDeposit: number;
  accountAge: number; // days since first job
  walletBalance: number;

  // Existing credit
  activeCredits: number;
  repaidCredits: number;
  totalBorrowed: number;
  totalRepaid: number;
}

/**
 * Calculate credit score (0-850) from multiple factors
 * Inspired by FICO model adapted for agent economy
 */
export function calculateCreditScore(factors: CreditFactors): {
  score: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};

  // 1. Job Performance (35% weight, max 297.5)
  const completionRate = factors.totalJobsCompleted /
    Math.max(factors.totalJobsCompleted + factors.totalJobsFailed, 1);
  breakdown.jobPerformance = Math.round(completionRate * 200 + Math.min(factors.avgRating * 19.5, 97.5));

  // 2. Payment History (30% weight, max 255)
  const totalPayments = factors.onTimePayments + factors.latePayments + factors.defaultedPayments;
  if (totalPayments > 0) {
    const onTimeRate = factors.onTimePayments / totalPayments;
    breakdown.paymentHistory = Math.round(onTimeRate * 200);
    // Penalty for defaults
    breakdown.paymentHistory -= factors.defaultedPayments * 25;
    breakdown.paymentHistory = Math.max(0, Math.min(breakdown.paymentHistory, 255));
  } else {
    breakdown.paymentHistory = 100; // Neutral for new agents
  }

  // 3. Earnings & Volume (15% weight, max 127.5)
  const earningsScore = Math.min(factors.totalEarnings / 100, 1) * 80;
  const volumeScore = Math.min(factors.totalJobsCompleted / 20, 1) * 47.5;
  breakdown.earningsVolume = Math.round(earningsScore + volumeScore);

  // 4. Account Age & Stability (10% weight, max 85)
  const ageScore = Math.min(factors.accountAge / 180, 1) * 50; // 6 months max
  const balanceScore = Math.min(factors.walletBalance / 500, 1) * 20;
  const depositScore = Math.min(factors.securityDeposit / 100, 1) * 15;
  breakdown.stability = Math.round(ageScore + balanceScore + depositScore);

  // 5. Credit History (10% weight, max 85)
  if (factors.totalBorrowed > 0) {
    const repayRate = factors.totalRepaid / factors.totalBorrowed;
    breakdown.creditHistory = Math.round(repayRate * 60);
    // Bonus for completed credits
    breakdown.creditHistory += Math.min(factors.repaidCredits * 5, 25);
    breakdown.creditHistory = Math.min(breakdown.creditHistory, 85);
  } else {
    breakdown.creditHistory = 42; // Neutral
  }

  const score = Math.min(
    850,
    Math.max(
      0,
      Object.values(breakdown).reduce((sum, v) => sum + v, 0)
    )
  );

  return { score, breakdown };
}

// ────────────────────────────────────────────
// Credit Score Data Collection
// ────────────────────────────────────────────

/**
 * Gather all credit factors for an agent from database and on-chain
 */
export async function gatherCreditFactors(
  agentWallet: string
): Promise<CreditFactors> {
  // Job stats
  const [completedJobs, failedJobs, reviews] = await Promise.all([
    prisma.agentJob.count({
      where: { agent: { ownerWallet: agentWallet }, status: { in: ['COMPLETED', 'SETTLED'] } },
    }),
    prisma.agentJob.count({
      where: { agent: { ownerWallet: agentWallet }, status: 'FAILED' },
    }),
    prisma.agentReview.findMany({
      where: { agent: { ownerWallet: agentWallet } },
      select: { rating: true },
    }),
  ]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Earnings
  const earnings = await prisma.agentJob.aggregate({
    where: {
      agent: { ownerWallet: agentWallet },
      status: { in: ['COMPLETED', 'SETTLED'] },
    },
    _sum: { negotiatedPrice: true },
  });

  const totalEarnings = earnings._sum?.negotiatedPrice || 0;
  const avgJobValue = completedJobs > 0 ? totalEarnings / completedJobs : 0;

  // Account age
  const firstJob = await prisma.agentJob.findFirst({
    where: { agent: { ownerWallet: agentWallet } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  const accountAge = firstJob
    ? Math.floor((Date.now() - firstJob.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Credit history
  const [activeCredits, repaidCredits, creditAgg] = await Promise.all([
    prisma.creditLine.count({
      where: { borrowerWallet: agentWallet, status: 'ACTIVE' },
    }),
    prisma.creditLine.count({
      where: { borrowerWallet: agentWallet, status: 'REPAID' },
    }),
    prisma.creditLine.aggregate({
      where: { borrowerWallet: agentWallet },
      _sum: { amount: true, repaidAmount: true },
    }),
  ]);

  // On-chain balance
  let walletBalance = 0;
  try {
    const bal = await publicClient.readContract({
      address: SUPPORTED_TOKENS[0].address as Address,
      abi: ERC20_VIEM_ABI,
      functionName: 'balanceOf',
      args: [agentWallet as Address],
    });
    walletBalance = parseFloat(formatUnits(bal as bigint, 6));
  } catch { /* ignore */ }

  // Default tracking
  const defaulted = await prisma.creditLine.count({
    where: { borrowerWallet: agentWallet, status: 'DEFAULTED' },
  });

  return {
    totalJobsCompleted: completedJobs,
    totalJobsFailed: failedJobs,
    totalEarnings,
    avgJobValue,
    avgRating,
    onTimePayments: repaidCredits,
    latePayments: 0, // TODO: track late payments
    defaultedPayments: defaulted,
    securityDeposit: 0, // TODO: read from SecurityDepositVault
    accountAge,
    walletBalance,
    activeCredits,
    repaidCredits,
    totalBorrowed: creditAgg._sum?.amount || 0,
    totalRepaid: creditAgg._sum?.repaidAmount || 0,
  };
}

// ────────────────────────────────────────────
// Interest Calculation
// ────────────────────────────────────────────

/**
 * Calculate interest for a credit line
 */
export function calculateInterest(
  principal: number,
  annualRate: number,
  durationDays: number
): number {
  return principal * (annualRate / 100) * (durationDays / 365);
}

/**
 * Calculate total repayment amount
 */
export function calculateRepayment(
  principal: number,
  annualRate: number,
  durationDays: number
): { interest: number; total: number } {
  const interest = calculateInterest(principal, annualRate, durationDays);
  return { interest, total: principal + interest };
}
