/**
 * POST /api/fiat/webhook - Stripe Webhook Handler
 *
 * Processes Stripe webhook events:
 *   - checkout.session.completed → transfer stablecoin → create escrow
 *   - checkout.session.expired → mark as FAILED
 *
 * In production, verify the Stripe signature.
 * In demo mode, accepts direct calls for testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { transferStablecoin, FIAT_CONFIG } from '../../../lib/fiat-onramp';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (stripeSecretKey && webhookSecret) {
      // Production: Verify Stripe signature
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeSecretKey);

      const body = await req.text();
      const sig = req.headers.get('stripe-signature');

      if (!sig) {
        return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
      }

      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Demo mode: accept raw JSON
      event = await req.json();
    }

    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data?.object ?? event;
        const sessionId = session.id ?? session.stripeSessionId;
        const metadata = session.metadata ?? {};

        // Find payment record
        const payment = await prisma.fiatPayment.findUnique({
          where: { stripeSessionId: sessionId },
        });

        if (!payment) {
          console.warn(`[fiat/webhook] Payment not found for session: ${sessionId}`);
          return NextResponse.json({ received: true, warning: 'Payment record not found' });
        }

        // Update status to PAID
        await prisma.fiatPayment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            stripePaymentId: session.payment_intent ?? null,
          },
        });

        // Transfer stablecoin from treasury to user
        try {
          const txHash = await transferStablecoin(
            payment.userWallet,
            payment.amountUSD,
          );

          await prisma.fiatPayment.update({
            where: { id: payment.id },
            data: {
              status: 'CRYPTO_SENT',
              transferTxHash: txHash,
              completedAt: new Date(),
            },
          });

          console.log(`[fiat/webhook] Transferred ${payment.amountUSD} ${FIAT_CONFIG.defaultToken} to ${payment.userWallet} - tx: ${txHash}`);
        } catch (transferErr: any) {
          console.error(`[fiat/webhook] Transfer failed:`, transferErr);
          await prisma.fiatPayment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data?.object ?? event;
        const sessionId = session.id ?? session.stripeSessionId;

        await prisma.fiatPayment.updateMany({
          where: { stripeSessionId: sessionId, status: 'PENDING' },
          data: { status: 'FAILED' },
        });

        console.log(`[fiat/webhook] Session expired: ${sessionId}`);
        break;
      }

      default:
        console.log(`[fiat/webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[fiat/webhook] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
