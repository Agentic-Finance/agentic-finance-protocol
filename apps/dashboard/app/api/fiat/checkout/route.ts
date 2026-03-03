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

    // Shield ZK fee: 0.5% of escrow amount, max $10 — same as Payroll Phantom Shield
    const SHIELD_FEE_PERCENT = 0.5;
    const SHIELD_FEE_MAX = 10;
    const shieldFee = shieldEnabled
      ? Math.min(+(amount * SHIELD_FEE_PERCENT / 100).toFixed(2), SHIELD_FEE_MAX)
      : 0;

    // Total card charge = markup charge + Shield fee
    const totalCharge = +(pricing.chargeAmount + shieldFee).toFixed(2);

    // Check if Paddle is configured
    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      // Demo mode: create a mock transaction for testing
      const mockTransactionId = `txn_demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Save to database — amountUSD is total charged (markup + Shield fee)
      await prisma.fiatPayment.create({
        data: {
          paddleTransactionId: mockTransactionId,
          userWallet,
          amountUSD: totalCharge,
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
        pricing: { ...pricing, shieldFee, totalCharge },
        message: 'Paddle not configured - running in demo mode.',
      });
    }

    // ── Production: Create Paddle Transaction (server-side) ──────
    const metadata = buildCheckoutMetadata({ amount, userWallet, agentJobId, returnUrl });

    // Use existing product ID (pre-configured with correct tax category)
    // with inline price for dynamic amounts
    const paddleProductId = process.env.PADDLE_PRODUCT_ID || 'pro_01kjk6t804cgm9vnmjh8acnn6t';

    // Paddle charge includes: escrow × (1 + 5% markup) + Shield ZK fee
    const paddleDescription = shieldEnabled
      ? `Purchase ${pricing.cryptoAmount} ${FIAT_CONFIG.defaultToken} on Tempo L1 (${pricing.markupPercent}% fee + Shield ZK)`
      : `Purchase ${pricing.cryptoAmount} ${FIAT_CONFIG.defaultToken} on Tempo L1 (incl. ${pricing.markupPercent}% processing fee)`;

    const transaction = await paddleApiRequest('/transactions', 'POST', {
      items: [
        {
          quantity: 1,
          price: {
            description: paddleDescription,
            name: `${pricing.cryptoAmount} ${FIAT_CONFIG.defaultToken}`,
            unit_price: {
              amount: String(Math.round(totalCharge * 100)), // Paddle uses cents — includes Shield fee
              currency_code: FIAT_CONFIG.paddleCurrency,
            },
            product_id: paddleProductId,
          },
        },
      ],
      custom_data: {
        ...metadata,
        cryptoAmount: pricing.cryptoAmount.toString(),
        chargeAmount: totalCharge.toString(),
        markupPercent: pricing.markupPercent.toString(),
        shieldEnabled: shieldEnabled ? 'true' : 'false',
        shieldFee: shieldFee.toString(),
      },
    });

    const txnId = transaction.data.id;

    // Save to database — amountUSD = total charged including Shield fee
    await prisma.fiatPayment.create({
      data: {
        paddleTransactionId: txnId,
        userWallet,
        amountUSD: totalCharge,
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
      pricing: { ...pricing, shieldFee, totalCharge },
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
