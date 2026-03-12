/**
 * POST /api/x402/pay — x402 Payment Gateway
 *
 * Main entry point for x402 protocol. AI agents send task requests here.
 * Without payment: returns 402 with payment requirements.
 * With payment (X-Payment header): verifies payment and executes task.
 *
 * Body: {
 *   agentId: string,       // Which PayPol agent to use
 *   prompt: string,        // Task description
 *   callerWallet?: string  // Caller's wallet
 * }
 *
 * Headers:
 *   X-Payment: JSON X402PaymentProof (optional — omit to get 402 requirements)
 */

import { NextResponse } from 'next/server';
import {
  createPaymentRequirement,
  extractPayment,
  verifyPayment,
  x402Headers,
  X402PaymentRequirement,
} from '@/app/lib/x402-protocol';
import { apiLimiter, getClientId } from '@/app/lib/rate-limit';

const AGENT_SERVICE = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';

// Agent price lookup (mirrors agent-card.json manifests)
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
  // Rate limit
  const clientId = getClientId(req);
  const limit = apiLimiter.check(clientId);
  if (!limit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { agentId, prompt, callerWallet } = body;

    if (!agentId || !prompt) {
      return NextResponse.json(
        { error: 'agentId and prompt required' },
        { status: 400 },
      );
    }

    const price = AGENT_PRICES[agentId];
    if (price == null) {
      return NextResponse.json(
        { error: `Unknown agent: ${agentId}. See /.well-known/agent-card.json for available agents.` },
        { status: 404 },
      );
    }

    // Check for payment header
    const payment = extractPayment(req);

    if (!payment) {
      // No payment — return 402 with requirements
      const requirement = createPaymentRequirement(
        price,
        `Execute ${agentId}: ${prompt.slice(0, 100)}`,
      );

      return NextResponse.json(
        {
          error: 'Payment Required',
          code: 402,
          message: `This agent requires ${price} AlphaUSD per execution.`,
          paymentRequired: requirement,
          howToPay: {
            step1: 'Create an X-Payment header with your payment proof',
            step2: 'Sign the payment hash: keccak256("x402-payment", payer, amount, token, nonce)',
            step3: 'Retry this request with the X-Payment header',
            alternative: 'Use a metering session via POST /api/metering',
          },
        },
        {
          status: 402,
          headers: x402Headers(requirement),
        },
      );
    }

    // Payment provided — verify it
    const requirement: X402PaymentRequirement = {
      version: '1.0',
      chainId: 42431,
      token: payment.token || '0x20c0000000000000000000000000000000000001',
      tokenSymbol: 'AlphaUSD',
      amount: payment.amount,
      recipient: '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
      description: `Execute ${agentId}`,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      nonce: payment.nonce,
      paymentMethods: ['signed-message', 'metering-session'],
    };

    const verification = await verifyPayment(payment, requirement);

    if (!verification.valid) {
      return NextResponse.json(
        {
          error: 'Payment verification failed',
          reason: verification.reason,
          hint: 'Ensure your signature is correct and nonce is fresh.',
        },
        { status: 402 },
      );
    }

    // Payment verified — execute agent
    console.log(`[x402] Payment verified from ${verification.payer}. Executing ${agentId}...`);

    const agentRes = await fetch(`${AGENT_SERVICE}/agents/${agentId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: `x402-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        prompt,
        callerWallet: callerWallet || verification.payer || '0x0',
      }),
      signal: AbortSignal.timeout(120_000),
    });

    const result = await agentRes.json();

    return NextResponse.json({
      success: true,
      paymentVerified: true,
      payer: verification.payer,
      amountCharged: `${price} AlphaUSD`,
      agentId,
      result: result.result || result,
      executionTimeMs: result.executionTimeMs,
      x402: {
        version: '1.0',
        status: 'paid',
        nonce: payment.nonce,
      },
    }, {
      headers: {
        'X-Payment-Status': 'paid',
        'X-Payment-Payer': verification.payer || '',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err: any) {
    console.error('[x402/pay] Error:', err.message);
    return NextResponse.json(
      { error: 'x402 payment gateway error', details: err.message },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Payment, X-Wallet-Address',
    },
  });
}
