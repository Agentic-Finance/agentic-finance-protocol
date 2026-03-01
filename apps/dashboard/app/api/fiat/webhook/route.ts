/**
 * POST /api/fiat/webhook - Paddle Webhook Handler
 *
 * Processes Paddle webhook events:
 *   - transaction.completed → transfer stablecoin → create escrow
 *   - transaction.payment_failed → mark as FAILED
 *
 * In production, verify the Paddle webhook signature.
 * In demo mode, accepts direct calls for testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { transferStablecoin, depositToShieldVault, FIAT_CONFIG } from '../../../lib/fiat-onramp';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Verify Paddle webhook signature (HMAC-SHA256).
 */
function verifyPaddleSignature(rawBody: string, signature: string | null, webhookSecret: string): boolean {
  if (!signature) return false;

  // Paddle signature format: ts=timestamp;h1=hash
  const parts = signature.split(';').reduce((acc, part) => {
    const [key, val] = part.split('=');
    acc[key] = val;
    return acc;
  }, {} as Record<string, string>);

  const ts = parts['ts'];
  const h1 = parts['h1'];
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expectedHash = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expectedHash));
}

export async function POST(req: NextRequest) {
  try {
    const paddleApiKey = process.env.PADDLE_API_KEY;
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    let event: any;

    if (paddleApiKey && webhookSecret) {
      // Production: Verify Paddle webhook signature
      const body = await req.text();
      const sig = req.headers.get('paddle-signature');

      if (!verifyPaddleSignature(body, sig, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid Paddle signature' }, { status: 400 });
      }

      event = JSON.parse(body);
    } else {
      // Demo mode: accept raw JSON
      event = await req.json();
    }

    // Handle Paddle event types
    const eventType = event.event_type ?? event.type;

    switch (eventType) {
      case 'transaction.completed': {
        const transaction = event.data ?? event;
        const transactionId = transaction.id ?? transaction.paddleTransactionId;
        const customData = transaction.custom_data ?? {};

        // Find payment record — try Paddle txn ID first, then our sessionId from custom_data
        let payment = await prisma.fiatPayment.findUnique({
          where: { paddleTransactionId: transactionId },
        });

        // If not found by Paddle txn ID, try our sessionId (client-side checkout flow)
        if (!payment && customData.sessionId) {
          payment = await prisma.fiatPayment.findUnique({
            where: { paddleTransactionId: customData.sessionId },
          });

          // Update record with real Paddle transaction ID
          if (payment) {
            await prisma.fiatPayment.update({
              where: { id: payment.id },
              data: { paddleTransactionId: transactionId },
            });
          }
        }

        if (!payment) {
          // Create a new record if none exists (webhook arrived before our API call)
          if (customData.userWallet) {
            payment = await prisma.fiatPayment.create({
              data: {
                paddleTransactionId: transactionId,
                userWallet: customData.userWallet,
                amountUSD: parseFloat(customData.chargeAmount) || 0,
                amountCrypto: parseFloat(customData.amountUSD) || 0,
                token: customData.token || FIAT_CONFIG.defaultToken,
                agentJobId: customData.agentJobId || null,
                status: 'PENDING',
              },
            });
          } else {
            console.warn(`[fiat/webhook] Payment not found for transaction: ${transactionId}`);
            return NextResponse.json({ received: true, warning: 'Payment record not found' });
          }
        }

        // Update status to PAID
        await prisma.fiatPayment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paddlePaymentId: transaction.invoice_id ?? transaction.payments?.[0]?.payment_method_id ?? null,
          },
        });

        // Transfer stablecoin from treasury to user (direct or Shield ZK)
        // Use amountCrypto (pre-markup amount user receives), not amountUSD (charge amount)
        const cryptoToSend = payment.amountCrypto ?? payment.amountUSD;
        const isShielded = payment.shieldEnabled || customData.shieldEnabled === 'true';

        try {
          if (isShielded) {
            // ── Shield ZK Path ──
            console.log(`[fiat/webhook] Shield ZK enabled — depositing to ShieldVaultV2...`);
            const { depositTxHash, commitmentData } = await depositToShieldVault(
              payment.userWallet,
              cryptoToSend,
            );

            await prisma.fiatPayment.update({
              where: { id: payment.id },
              data: {
                status: 'SHIELD_DEPOSITED',
                transferTxHash: depositTxHash,
                shieldCommitment: commitmentData.commitment,
                shieldData: JSON.stringify({
                  secret: commitmentData.secret,
                  nullifier: commitmentData.nullifier,
                  nullifierHash: commitmentData.nullifierHash,
                  depositTxHash,
                }),
                completedAt: new Date(),
              },
            });

            // Create TimeVaultPayload for daemon ZK processing
            try {
              let workspace = await prisma.workspace.findFirst();
              if (!workspace) {
                workspace = await prisma.workspace.create({
                  data: { name: 'PayPol Vault', adminWallet: '0xFiatShield' },
                });
              }
              await prisma.timeVaultPayload.create({
                data: {
                  workspaceId: workspace.id,
                  recipientWallet: payment.userWallet,
                  isShielded: true,
                  zkCommitment: commitmentData.commitment,
                  zkProof: JSON.stringify({
                    secret: commitmentData.secret,
                    nullifier: commitmentData.nullifier,
                    nullifierHash: commitmentData.nullifierHash,
                    depositTxHash,
                  }),
                  amount: cryptoToSend,
                  token: FIAT_CONFIG.defaultToken,
                  note: `Fiat Shield — Paddle txn: ${transactionId}`,
                  status: 'PENDING',
                },
              });
            } catch (vaultErr: any) {
              console.warn(`[fiat/webhook] TimeVaultPayload creation failed:`, vaultErr.message);
            }

            console.log(`[fiat/webhook] Shield deposit: ${cryptoToSend} ${FIAT_CONFIG.defaultToken} → ShieldVaultV2 — tx: ${depositTxHash}`);
          } else {
            // ── Direct Path ──
            const txHash = await transferStablecoin(
              payment.userWallet,
              cryptoToSend,
            );

            await prisma.fiatPayment.update({
              where: { id: payment.id },
              data: {
                status: 'CRYPTO_SENT',
                transferTxHash: txHash,
                completedAt: new Date(),
              },
            });

            console.log(`[fiat/webhook] Transferred ${cryptoToSend} ${FIAT_CONFIG.defaultToken} to ${payment.userWallet} - tx: ${txHash}`);
          }
        } catch (transferErr: any) {
          console.error(`[fiat/webhook] Transfer failed:`, transferErr);
          await prisma.fiatPayment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
        }

        break;
      }

      case 'transaction.payment_failed': {
        const transaction = event.data ?? event;
        const transactionId = transaction.id ?? transaction.paddleTransactionId;

        await prisma.fiatPayment.updateMany({
          where: { paddleTransactionId: transactionId, status: 'PENDING' },
          data: { status: 'FAILED' },
        });

        console.log(`[fiat/webhook] Payment failed: ${transactionId}`);
        break;
      }

      default:
        console.log(`[fiat/webhook] Unhandled event type: ${eventType}`);
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
