/**
 * POST /api/fiat/checkout - Create Stripe Checkout Session
 *
 * Creates a Stripe Checkout session for fiat-to-crypto conversion.
 * After payment, Stripe webhook triggers stablecoin transfer.
 *
 * Body: { amount: number, userWallet: string, agentJobId?: string, returnUrl: string }
 * Returns: { sessionId: string, checkoutUrl: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { validateCheckoutParams, buildCheckoutMetadata, FIAT_CONFIG } from '../../../lib/fiat-onramp';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, userWallet, agentJobId, returnUrl } = body;

    // Validate
    const error = validateCheckoutParams({ amount, userWallet, returnUrl });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Check if Stripe is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      // Demo mode: create a mock session for testing
      const mockSessionId = `cs_demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Save to database
      await prisma.fiatPayment.create({
        data: {
          stripeSessionId: mockSessionId,
          userWallet,
          amountUSD: amount,
          amountCrypto: amount * FIAT_CONFIG.exchangeRate,
          token: FIAT_CONFIG.defaultToken,
          agentJobId: agentJobId || null,
          status: 'PENDING',
        },
      });

      return NextResponse.json({
        sessionId: mockSessionId,
        checkoutUrl: `${returnUrl}?fiat_session=${mockSessionId}&demo=true`,
        demo: true,
        message: 'Stripe not configured - running in demo mode. In production, this returns a Stripe Checkout URL.',
      });
    }

    // Production: Create real Stripe Checkout Session
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);

    const metadata = buildCheckoutMetadata({ amount, userWallet, agentJobId, returnUrl });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: FIAT_CONFIG.stripeCurrency,
            product_data: {
              name: `${amount} ${FIAT_CONFIG.defaultToken}`,
              description: `Purchase ${amount} ${FIAT_CONFIG.defaultToken} stablecoins on Tempo L1`,
            },
            unit_amount: Math.round(amount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${returnUrl}?fiat_session={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${returnUrl}?fiat_session={CHECKOUT_SESSION_ID}&cancelled=true`,
      metadata,
    });

    // Save to database
    await prisma.fiatPayment.create({
      data: {
        stripeSessionId: session.id,
        userWallet,
        amountUSD: amount,
        amountCrypto: amount * FIAT_CONFIG.exchangeRate,
        token: FIAT_CONFIG.defaultToken,
        agentJobId: agentJobId || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (err: any) {
    console.error('[fiat/checkout] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
