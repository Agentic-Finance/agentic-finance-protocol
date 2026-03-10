import { NextResponse } from 'next/server';
import prisma from "@/app/lib/prisma";
import { notify } from '@/app/lib/notify';
import { requireFields, apiError, apiSuccess, logAndReturn } from '@/app/lib/api-response';
import { marketplaceLimiter, getClientId } from '@/app/lib/rate-limit';

const VALID_ACTIONS = ['escrow_locked', 'settle', 'refund', 'dispute', 'executing', 'completed'] as const;

/**
 * POST /api/marketplace/settle
 *
 * Syncs on-chain escrow events with DB records.
 * Called by frontend after contract interactions (createJob, settleJob, refundJob, disputeJob).
 *
 * Body: { jobId, action, txHash?, onChainJobId?, reason?, deadline? }
 */
export async function POST(req: Request) {
    try {
        // Rate limit
        const clientId = getClientId(req);
        const limit = marketplaceLimiter.check(clientId);
        if (!limit.success) return apiError('Rate limit exceeded', 429);

        const body = await req.json();
        const { jobId, action, txHash, onChainJobId, reason, deadline } = body;

        // Input validation
        const err = requireFields(body, ['jobId', 'action']);
        if (err) return apiError(err, 400);

        if (!VALID_ACTIONS.includes(action)) {
            return apiError(`Invalid action: ${action}. Must be one of: ${VALID_ACTIONS.join(', ')}`, 400);
        }

        // Find the AgentJob record
        const agentJob = await prisma.agentJob.findUnique({
            where: { id: jobId }
        });

        if (!agentJob) {
            return NextResponse.json({ success: false, error: "AgentJob not found" }, { status: 404 });
        }

        switch (action) {
            case 'escrow_locked': {
                // After frontend createJob() on PayPolNexusV2
                await prisma.agentJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'ESCROW_LOCKED',
                        escrowTxHash: txHash || null,
                        onChainJobId: onChainJobId != null ? Number(onChainJobId) : null,
                        deadline: deadline ? new Date(deadline) : null,
                    }
                });

                // Also sync TimeVaultPayload if exists
                const relatedPayload = await prisma.timeVaultPayload.findFirst({
                    where: {
                        isDiscovery: true,
                        recipientWallet: agentJob.clientWallet,
                        status: { in: ['Draft', 'Pending', 'AWAITING'] }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                if (relatedPayload) {
                    await prisma.timeVaultPayload.update({
                        where: { id: relatedPayload.id },
                        data: { status: 'EscrowLocked' }
                    });
                }

                // Notify client about escrow lock
                notify({
                    wallet: agentJob.clientWallet,
                    type: 'escrow:locked',
                    title: 'Escrow Locked',
                    message: `$${agentJob.budget} locked in NexusV2 escrow for job #${jobId.slice(0, 8)}...`,
                }).catch(() => {});

                return NextResponse.json({
                    success: true,
                    message: 'Escrow locked on-chain',
                    onChainJobId: onChainJobId
                });
            }

            case 'executing': {
                await prisma.agentJob.update({
                    where: { id: jobId },
                    data: { status: 'EXECUTING' }
                });
                return NextResponse.json({ success: true, message: 'Job marked as executing' });
            }

            case 'completed': {
                await prisma.agentJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date()
                    }
                });
                return NextResponse.json({ success: true, message: 'Job marked as completed' });
            }

            case 'settle': {
                // After judge calls settleJob() on PayPolNexusV2
                await prisma.agentJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'SETTLED',
                        settleTxHash: txHash || null,
                        completedAt: agentJob.completedAt || new Date()
                    }
                });

                // Sync TimeVaultPayload
                await syncTimeVaultStatus(agentJob, 'SETTLED');

                // Notify both parties about settlement
                notify({
                    wallet: agentJob.clientWallet,
                    type: 'escrow:settled',
                    title: 'Payment Settled',
                    message: `$${agentJob.budget} released to agent. TX: ${(txHash || '').slice(0, 10)}...`,
                }).catch(() => {});

                return NextResponse.json({ success: true, message: 'Job settled on-chain' });
            }

            case 'refund': {
                // After judge calls refundJob() or employer calls claimTimeout()
                await prisma.agentJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'REFUNDED',
                        settleTxHash: txHash || null
                    }
                });

                // Sync TimeVaultPayload
                await syncTimeVaultStatus(agentJob, 'REFUNDED');

                // Notify client about refund
                notify({
                    wallet: agentJob.clientWallet,
                    type: 'escrow:refunded',
                    title: 'Refund Processed',
                    message: `$${agentJob.budget} refunded to your wallet. TX: ${(txHash || '').slice(0, 10)}...`,
                }).catch(() => {});

                return NextResponse.json({ success: true, message: 'Job refunded on-chain' });
            }

            case 'dispute': {
                // After employer calls disputeJob()
                await prisma.agentJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'DISPUTED',
                        disputeReason: reason || 'Employer dispute'
                    }
                });

                // Sync TimeVaultPayload
                await syncTimeVaultStatus(agentJob, 'DISPUTED');

                // Notify client about dispute
                notify({
                    wallet: agentJob.clientWallet,
                    type: 'escrow:disputed',
                    title: 'Dispute Raised',
                    message: `Job #${jobId.slice(0, 8)}... disputed: ${reason || 'No reason provided'}`,
                }).catch(() => {});

                return NextResponse.json({ success: true, message: 'Job disputed' });
            }

            default:
                return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        return logAndReturn('SETTLE_API', error, 'Settlement sync failed');
    }
}

/**
 * Helper: Sync status to the related TimeVaultPayload record.
 * Finds the most recent discovery payload that matches the agent job.
 */
async function syncTimeVaultStatus(agentJob: any, newStatus: string) {
    try {
        // Find TimeVaultPayload linked to this escrow (by note containing job id or by discovery flag)
        const relatedPayloads = await prisma.timeVaultPayload.findMany({
            where: {
                isDiscovery: true,
                status: { in: ['EscrowLocked', 'DISPUTED', 'SETTLED', 'REFUNDED'] }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        // Match by note containing agent job id or by timing
        const matched = relatedPayloads.find(p =>
            (p.note && p.note.includes(agentJob.id)) ||
            (p.recipientWallet === agentJob.clientWallet)
        );

        if (matched) {
            await prisma.timeVaultPayload.update({
                where: { id: matched.id },
                data: { status: newStatus }
            });
        }
    } catch (err) {
        console.error("[SYNC_TIMEVAULT_ERROR]:", err);
        // Non-critical - don't fail the main operation
    }
}
