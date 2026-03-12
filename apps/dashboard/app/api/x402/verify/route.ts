/**
 * POST /api/x402/verify — Verify an x402 payment proof
 *
 * Standalone verification endpoint. Use to check if a payment proof
 * is valid before making the actual paid request.
 *
 * Body: {
 *   proof: X402PaymentProof,
 *   agentId: string          // Agent to verify payment against
 * }
 */

import { NextResponse } from 'next/server';
import {
  verifyPayment,
  X402PaymentRequirement,
  X402PaymentProof,
} from '@/app/lib/x402-protocol';

const AGENT_PRICES: Record<string, number> = {
  'escrow-manager': 5, 'shield-executor': 10, 'payroll-planner': 8,
  'token-deployer': 5, 'contract-deploy-pro': 15, 'coordinator-agent': 5,
  'tempo-benchmark': 2, 'token-transfer': 2, 'stream-creator': 5,
  'stream-manager': 3, 'vault-depositor': 3, 'multisend-batch': 5,
  'proof-verifier': 3, 'allowance-manager': 2, 'balance-scanner': 2,
  'fee-collector': 3, 'escrow-lifecycle': 3, 'multi-token-sender': 3,
  'escrow-dispute': 5, 'stream-inspector': 2, 'treasury-manager': 3,
  'bulk-escrow': 8, 'multi-token-batch': 5, 'proof-auditor': 3,
  'vault-inspector': 2, 'gas-profiler': 2, 'recurring-payment': 5,
  'contract-reader': 2, 'wallet-sweeper': 3, 'escrow-batch-settler': 8,
  'token-minter': 5, 'chain-monitor': 1,
};

export async function POST(req: Request) {
  try {
    const { proof, agentId } = await req.json();

    if (!proof || !agentId) {
      return NextResponse.json(
        { error: 'proof and agentId required' },
        { status: 400 },
      );
    }

    const price = AGENT_PRICES[agentId];
    if (price == null) {
      return NextResponse.json(
        { error: `Unknown agent: ${agentId}` },
        { status: 404 },
      );
    }

    const requirement: X402PaymentRequirement = {
      version: '1.0',
      chainId: 42431,
      token: proof.token || '0x20c0000000000000000000000000000000000001',
      tokenSymbol: 'AlphaUSD',
      amount: proof.amount,
      recipient: '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
      description: `Verify payment for ${agentId}`,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      nonce: proof.nonce,
      paymentMethods: ['signed-message', 'metering-session'],
    };

    const result = await verifyPayment(proof as X402PaymentProof, requirement);

    return NextResponse.json({
      valid: result.valid,
      payer: result.payer || null,
      reason: result.reason || null,
      agentId,
      priceRequired: `${price} AlphaUSD`,
    });

  } catch (err: any) {
    console.error('[x402/verify] Error:', err.message);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
