/**
 * POST /api/fiat/checkout - Create Paddle Checkout Transaction
 *
 * Creates a Paddle transaction server-side for fiat-to-crypto conversion.
 * After payment, Paddle webhook triggers stablecoin transfer.
 *
 * Requires "Default Payment Link" to be set in Paddle Dashboard
 * (Checkout → Checkout Settings → Default Payment Link → https://paypol.xyz)
 *
 * Body: { amount: number, userWallet: string, agentJobId?: string, returnUrl: string }
 *   - amount: the crypto amount user wants to RECEIVE (e.g., 100 AlphaUSD)
 *   - The card is charged: amount × (1 + markupPercent/100)
 *
 * Returns: { transactionId, pricing, useOverlay: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { validateCheckoutParams, buildCheckoutMetadata, calculateMarkup, paddleApiRequest, FIAT_CONFIG } from '../../../lib/fiat-onramp';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, userWallet, agentJobId, returnUrl, shieldEnabled } = body;

    // Validate — "amount" is the crypto amount user wants to receive
    const error = validateCheckoutParams({ amount, userWallet, returnUrl });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Calculate markup pricing
    const pricing = calculateMarkup(amount);

    // Check if Paddle is configured
    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      // Demo mode: create a mock transaction for testing
      const mockTransactionId = `txn_demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Save to database — amountUSD is what user pays (with markup)
      await prisma.fiatPayment.create({
        data: {
          paddleTransactionId: mockTransactionId,
          userWallet,
          amountUSD: pricing.chargeAmount,
          amountCrypto: pricing.cryptoAmount,
          token: FIAT_CONFIG.defaultToken,
          agentJobId: agentJobId || null,
          shieldEnabled: !!shieldEnabled,
          status: 'PENDING',
        },
      });

      return NextResponse.json({
        transactionId: mockTransactionId,
        checkoutUrl: `${returnUrl}?fiat_session=${mockTransactionId}&demo=true`,
        demo: true,
        pricing,
        message: 'Paddle not configured - running in demo mode.',
      });
    }

    // ── Production: Create Paddle Transaction (server-side) ──────
    const metadata = buildCheckoutMetadata({ amount, userWallet, agentJobId, returnUrl });

    const transaction = await paddleApiRequest('/transactions', 'POST', {
      items: [
        {
          quantity: 1,
          price: {
            description: `Purchase ${pricing.cryptoAmount} ${FIAT_CONFIG.defaultToken} on Tempo L1 (incl. ${pricing.markupPercent}% processing fee)`,
            name: `${pricing.cryptoAmount} ${FIAT_CONFIG.defaultToken}`,
            unit_price: {
              amount: String(Math.round(pricing.chargeAmount * 100)), // Paddle uses cents
              currency_code: FIAT_CONFIG.paddleCurrency,
            },
            product: {
              name: `${FIAT_CONFIG.defaultToken} Stablecoin`,
              description: 'Privacy-preserving stablecoin on Tempo L1',
              tax_category: 'standard',
            },
          },
        },
      ],
      custom_data: {
        ...metadata,
        cryptoAmount: pricing.cryptoAmount.toString(),
        chargeAmount: pricing.chargeAmount.toString(),
        markupPercent: pricing.markupPercent.toString(),
        shieldEnabled: shieldEnabled ? 'true' : 'false',
      },
    });

    const txnId = transaction.data.id;

    // Save to database
    await prisma.fiatPayment.create({
      data: {
        paddleTransactionId: txnId,
        userWallet,
        amountUSD: pricing.chargeAmount,
        amountCrypto: pricing.cryptoAmount,
        token: FIAT_CONFIG.defaultToken,
        agentJobId: agentJobId || null,
        shieldEnabled: !!shieldEnabled,
        status: 'PENDING',
      },
    });

    // Return transaction ID for Paddle.js overlay checkout
    return NextResponse.json({
      transactionId: txnId,
      pricing,
      useOverlay: true,
      shieldEnabled: !!shieldEnabled,
    });
  } catch (err: any) {
    console.error('[fiat/checkout] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
