/**
 * GET /api/fiat/status?transactionId=txn_xxx
 *
 * Check the status of a fiat payment transaction.
 * If DB status is still PENDING, also checks Paddle API directly
 * and triggers crypto transfer if payment was completed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { paddleApiRequest, transferStablecoin, depositToShieldVault, FIAT_CONFIG } from '../../../lib/fiat-onramp';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const transactionId = req.nextUrl.searchParams.get('transactionId')
      ?? req.nextUrl.searchParams.get('sessionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
    }

    let payment = await prisma.fiatPayment.findUnique({
      where: { paddleTransactionId: transactionId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // ── If still PENDING, check Paddle API directly (webhook may not be configured) ──
    if (payment.status === 'PENDING' && process.env.PADDLE_API_KEY && transactionId.startsWith('txn_')) {
      try {
        const paddleTxn = await paddleApiRequest(`/transactions/${transactionId}`, 'GET');
        const paddleStatus = paddleTxn?.data?.status;

        if (paddleStatus === 'completed' || paddleStatus === 'paid') {
          console.log(`[fiat/status] Paddle txn ${transactionId} is ${paddleStatus} — processing transfer`);

          // Update to PAID
          await prisma.fiatPayment.update({
            where: { id: payment.id },
            data: { status: 'PAID' },
          });

          // Transfer stablecoin (direct or Shield ZK deposit)
          const cryptoToSend = payment.amountCrypto ?? payment.amountUSD;
          try {
            if (payment.shieldEnabled) {
              // ── Shield ZK Path: Deposit to ShieldVaultV2 with Poseidon commitment ──
              console.log(`[fiat/status] Shield ZK enabled — depositing to ShieldVaultV2...`);
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

              // Create TimeVaultPayload for daemon to process ZK withdrawal
              try {
                // Find or create workspace for fiat shield deposits
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
                console.log(`[fiat/status] TimeVaultPayload created for daemon ZK processing`);
              } catch (vaultErr: any) {
                console.warn(`[fiat/status] TimeVaultPayload creation failed (non-critical):`, vaultErr.message);
              }

              console.log(`[fiat/status] Shield deposit: ${cryptoToSend} ${FIAT_CONFIG.defaultToken} → ShieldVaultV2 — tx: ${depositTxHash}`);
            } else {
              // ── Direct Path: Plain ERC20 transfer to user wallet ──
              const txHash = await transferStablecoin(payment.userWallet, cryptoToSend);

              await prisma.fiatPayment.update({
                where: { id: payment.id },
                data: {
                  status: 'CRYPTO_SENT',
                  transferTxHash: txHash,
                  completedAt: new Date(),
                },
              });

              console.log(`[fiat/status] Transferred ${cryptoToSend} ${FIAT_CONFIG.defaultToken} to ${payment.userWallet} — tx: ${txHash}`);
            }

            // Re-fetch updated payment
            payment = await prisma.fiatPayment.findUnique({
              where: { paddleTransactionId: transactionId },
            }) ?? payment;
          } catch (transferErr: any) {
            console.error(`[fiat/status] Transfer failed:`, transferErr);
            await prisma.fiatPayment.update({
              where: { id: payment.id },
              data: { status: 'FAILED' },
            });
            payment = await prisma.fiatPayment.findUnique({
              where: { paddleTransactionId: transactionId },
            }) ?? payment;
          }
        }
      } catch (paddleErr) {
        // Paddle API check failed — just return current DB status
        console.warn(`[fiat/status] Paddle API check failed:`, paddleErr);
      }
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amountUSD: payment.amountUSD,
      amountCrypto: payment.amountCrypto,
      token: payment.token,
      userWallet: payment.userWallet,
      shieldEnabled: payment.shieldEnabled,
      shieldCommitment: payment.shieldCommitment,
      transferTxHash: payment.transferTxHash,
      escrowTxHash: payment.escrowTxHash,
      explorerUrl: payment.transferTxHash
        ? `https://explore.tempo.xyz/tx/${payment.transferTxHash}`
        : null,
      createdAt: payment.createdAt.toISOString(),
      completedAt: payment.completedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    console.error('[fiat/status] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch status' },
      { status: 500 },
    );
  }
}
