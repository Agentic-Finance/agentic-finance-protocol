import prisma from '../../../lib/prisma';
import { notify } from '../../../lib/notify';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { syncSwarmProgress } from '@/app/lib/swarm-helpers';
import { logAuditEvent } from '@/app/lib/audit-types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/stream/milestone - Submit, Approve, or Reject a milestone
 *
 * Body: {
 *   action: 'submit' | 'approve' | 'reject',
 *   streamJobId: string,
 *   milestoneIndex: number,
 *   // For submit:
 *   proofHash?: string,
 *   submitTxHash?: string,
 *   // For approve:
 *   approveTxHash?: string,
 *   // For reject:
 *   rejectReason?: string,
 * }
 */
export async function POST(req: Request) {
    try {
        const callerWallet = req.headers.get('X-Wallet-Address')?.toLowerCase();
        const body = await req.json();
        const { action, streamJobId, milestoneIndex } = body;

        if (!action || !streamJobId || milestoneIndex === undefined) {
            return apiError('Missing action, streamJobId, or milestoneIndex', 400);
        }

        // Load stream + milestone
        const stream = await prisma.streamJob.findUnique({
            where: { id: streamJobId },
            include: { milestones: { orderBy: { index: 'asc' } } },
        });

        if (!stream) {
            return apiError('Stream not found', 404);
        }

        if (stream.status !== 'ACTIVE') {
            return apiError('Stream is not active', 400);
        }

        // Authorization: submit = agent only, approve/reject = client only
        if (callerWallet) {
            if (action === 'submit' && callerWallet !== stream.agentWallet) {
                return apiError('Only the assigned agent can submit milestones', 403);
            }
            if ((action === 'approve' || action === 'reject') && callerWallet !== stream.clientWallet) {
                return apiError('Only the stream client can approve or reject milestones', 403);
            }
        }

        const milestone = stream.milestones.find(m => m.index === milestoneIndex);
        if (!milestone) {
            return apiError(`Milestone ${milestoneIndex} not found`, 404);
        }

        switch (action) {
            case 'submit': {
                if (milestone.status !== 'PENDING' && milestone.status !== 'REJECTED') {
                    return apiError('Milestone cannot be submitted in current state', 400);
                }

                const updated = await prisma.milestone.update({
                    where: { id: milestone.id },
                    data: {
                        status: 'SUBMITTED',
                        proofHash: body.proofHash || null,
                        submitTxHash: body.submitTxHash || null,
                        submittedAt: new Date(),
                    },
                });

                // Notify client
                await notify({
                    wallet: stream.clientWallet,
                    type: 'stream:milestone_submitted',
                    title: `Milestone ${milestoneIndex + 1} Submitted`,
                    message: `${stream.agentName || 'Agent'} submitted milestone ${milestoneIndex + 1}/${stream.milestones.length}: "${milestone.deliverable}". Please review and approve.`,
                    streamJobId: stream.id,
                    milestoneId: milestone.id,
                });

                return apiSuccess({ milestone: updated });
            }

            case 'approve': {
                if (milestone.status !== 'SUBMITTED') {
                    return apiError('Only submitted milestones can be approved', 400);
                }

                // Use transaction to prevent race condition:
                // Two concurrent approvals could both see same count and both mark stream COMPLETED
                const result = await prisma.$transaction(async (tx) => {
                    // Re-check milestone status inside transaction
                    const freshMilestone = await tx.milestone.findUnique({ where: { id: milestone.id } });
                    if (!freshMilestone || freshMilestone.status !== 'SUBMITTED') {
                        throw new Error('Milestone already processed');
                    }

                    const updated = await tx.milestone.update({
                        where: { id: milestone.id },
                        data: {
                            status: 'APPROVED',
                            approveTxHash: body.approveTxHash || null,
                            reviewedAt: new Date(),
                        },
                    });

                    // Count approved milestones INSIDE the transaction for accuracy
                    const approvedCount = await tx.milestone.count({
                        where: { streamJobId: stream.id, status: 'APPROVED' },
                    });
                    const allApproved = approvedCount === stream.milestones.length;

                    await tx.streamJob.update({
                        where: { id: stream.id },
                        data: {
                            releasedAmount: { increment: milestone.amount },
                            status: allApproved ? 'COMPLETED' : 'ACTIVE',
                        },
                    });

                    return { updated, allApproved };
                });

                // Notify agent (outside transaction — non-critical)
                await notify({
                    wallet: stream.agentWallet,
                    type: 'stream:milestone_approved',
                    title: `Milestone ${milestoneIndex + 1} Approved`,
                    message: `Client approved milestone ${milestoneIndex + 1}/${stream.milestones.length}. Payment of $${milestone.amount} released!`,
                    streamJobId: stream.id,
                    milestoneId: milestone.id,
                });

                // If all approved, notify both
                if (result.allApproved) {
                    await notify({
                        wallet: stream.clientWallet,
                        type: 'stream:completed',
                        title: 'Stream Completed',
                        message: `All ${stream.milestones.length} milestones approved. Total paid: $${stream.totalBudget}.`,
                        streamJobId: stream.id,
                    });
                    await notify({
                        wallet: stream.agentWallet,
                        type: 'stream:completed',
                        title: 'Stream Completed',
                        message: `All milestones approved! Total earned: $${stream.totalBudget} (before fees).`,
                        streamJobId: stream.id,
                    });
                }

                // Check if this stream belongs to a swarm → sync progress
                const swarmStream = await prisma.swarmStream.findUnique({
                    where: { streamJobId: stream.id },
                });
                if (swarmStream) {
                    await syncSwarmProgress(swarmStream.swarmId);
                    await logAuditEvent({
                        swarmId: swarmStream.swarmId,
                        agentName: stream.agentName || stream.agentWallet.slice(0, 10),
                        eventType: 'MILESTONE_APPROVED',
                        title: `Milestone ${milestoneIndex + 1} Approved`,
                        description: `$${milestone.amount} released to ${stream.agentName || 'agent'}`,
                        metadata: { milestoneIndex, amount: milestone.amount, streamJobId: stream.id },
                        severity: 'SUCCESS',
                    });
                }

                return apiSuccess({ milestone: result.updated, streamCompleted: result.allApproved });
            }

            case 'reject': {
                if (milestone.status !== 'SUBMITTED') {
                    return apiError('Only submitted milestones can be rejected', 400);
                }

                const updated = await prisma.milestone.update({
                    where: { id: milestone.id },
                    data: {
                        status: 'REJECTED',
                        rejectReason: body.rejectReason || null,
                        reviewedAt: new Date(),
                    },
                });

                // Notify agent
                await notify({
                    wallet: stream.agentWallet,
                    type: 'stream:milestone_rejected',
                    title: `Milestone ${milestoneIndex + 1} Rejected`,
                    message: `Client rejected milestone ${milestoneIndex + 1}: "${body.rejectReason || 'No reason given'}". You can re-submit.`,
                    streamJobId: stream.id,
                    milestoneId: milestone.id,
                });

                return apiSuccess({ milestone: updated });
            }

            default:
                return apiError(`Unknown action: ${action}`, 400);
        }
    } catch (error: any) {
        return logAndReturn('STREAM_MILESTONE', error, 'Failed to process milestone action');
    }
}
