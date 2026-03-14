/**
 * x402 Payment Protocol API
 *
 * GET  /api/x402 — Protocol info + pricing
 * POST /api/x402 — Verify payment + settle
 * GET  /api/x402?action=message — Generate signing message
 * GET  /api/x402?action=status&nonce=xxx — Check payment status
 */

import { NextResponse } from 'next/server';
import {
  createPaymentRequirement,
  verifyPayment,
  settlePayment,
  parsePaymentHeader,
  buildPaymentMessage,
  X402_VERSION,
  X402_NETWORK,
  X402_TOKEN,
  X402_FACILITATOR_ADDRESS,
  X402_PRICING,
  getPrice,
  type PaymentPayload,
} from '@/app/lib/x402/facilitator';
import prisma from '@/app/lib/prisma';

// ────────────────────────────────────────────
// GET /api/x402 — Protocol info, pricing, or helpers
// ────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // Generate signing message for agent
  if (action === 'message') {
    const from = searchParams.get('from');
    const resource = searchParams.get('resource') || 'api:default';
    const amount = searchParams.get('amount') || String(getPrice(resource));

    if (!from) {
      return NextResponse.json({ error: 'Missing "from" parameter (wallet address)' }, { status: 400 });
    }

    const nonce = `x402-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = {
      version: X402_VERSION,
      network: X402_NETWORK,
      from,
      to: X402_FACILITATOR_ADDRESS,
      token: X402_TOKEN.address,
      amount,
      nonce,
      timestamp,
      resource,
    };

    const message = buildPaymentMessage(payload);

    return NextResponse.json({
      message,
      payload,
      instructions: 'Sign the "message" field with your wallet, then POST to /api/x402 with the payload + signature',
    });
  }

  // Check payment status
  if (action === 'status') {
    const nonce = searchParams.get('nonce');
    if (!nonce) {
      return NextResponse.json({ error: 'Missing "nonce" parameter' }, { status: 400 });
    }

    const payment = await prisma.x402Payment.findUnique({ where: { nonce } });
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      paymentId: payment.id,
      nonce: payment.nonce,
      payer: payment.payer,
      amount: payment.amount,
      resource: payment.resource,
      status: payment.status,
      settledAt: payment.settledAt,
      createdAt: payment.createdAt,
    });
  }

  // Protocol info + pricing
  const stats = await prisma.x402Payment.aggregate({
    _count: true,
    _sum: { amount: true },
  });

  return NextResponse.json({
    protocol: 'x402',
    version: X402_VERSION,
    description: 'PayPol x402 facilitator — HTTP-native micropayments for AI agents on Tempo L1',
    network: X402_NETWORK,
    facilitator: X402_FACILITATOR_ADDRESS,
    token: {
      symbol: X402_TOKEN.symbol,
      address: X402_TOKEN.address,
      decimals: X402_TOKEN.decimals,
    },
    pricing: X402_PRICING,
    stats: {
      totalPayments: stats._count || 0,
      totalVolume: stats._sum?.amount || 0,
    },
    endpoints: {
      info: 'GET /api/x402',
      message: 'GET /api/x402?action=message&from=0x...&resource=mcp:send_payment',
      verify: 'POST /api/x402',
      status: 'GET /api/x402?action=status&nonce=xxx',
    },
  });
}

// ────────────────────────────────────────────
// POST /api/x402 — Verify + Settle payment
// ────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { payment, resource } = body;

    if (!payment) {
      const headerPayment = parsePaymentHeader(req.headers.get('X-PAYMENT'));
      if (!headerPayment) {
        return NextResponse.json(
          { error: 'Missing payment payload. Provide in body or X-PAYMENT header' },
          { status: 400 }
        );
      }
      return await processPayment(headerPayment, resource || headerPayment.resource);
    }

    return await processPayment(payment as PaymentPayload, resource || payment.resource);
  } catch (error: any) {
    console.error('[x402 POST Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processPayment(payment: PaymentPayload, resource: string) {
  if (!payment.from || !payment.signature || !payment.nonce) {
    return NextResponse.json(
      { error: 'Missing required payment fields: from, signature, nonce' },
      { status: 400 }
    );
  }

  const price = getPrice(resource);
  const requirement = createPaymentRequirement(resource, price, `Access to ${resource}`);

  const verification = await verifyPayment(payment, requirement);

  if (!verification.valid) {
    return NextResponse.json(
      {
        error: 'Payment verification failed',
        reason: verification.error,
        paymentRequired: requirement,
      },
      { status: 402 }
    );
  }

  const settlement = await settlePayment(payment, resource);

  return NextResponse.json({
    success: true,
    paymentId: settlement.paymentId,
    payer: verification.payer,
    amount: verification.amount,
    resource,
    status: settlement.status,
  });
}
