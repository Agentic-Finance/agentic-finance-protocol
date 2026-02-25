import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { notify } from '../../../lib/notify';

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
        const body = await req.json();
        const { action, streamJobId, milestoneIndex } = body;

        if (!action || !streamJobId || milestoneIndex === undefined) {
            return NextResponse.json({ error: 'Missing action, streamJobId, or milestoneIndex' }, { status: 400 });
        }

        // Load stream + milestone
        const stream = await prisma.streamJob.findUnique({
            where: { id: streamJobId },
            include: { milestones: { orderBy: { index: 'asc' } } },
        });

        if (!stream) {
            return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
        }

        if (stream.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Stream is not active' }, { status: 400 });
        }

        const milestone = stream.milestones.find(m => m.index === milestoneIndex);
        if (!milestone) {
            return NextResponse.json({ error: `Milestone ${milestoneIndex} not found` }, { status: 404 });
        }

        switch (action) {
            case 'submit': {
                if (milestone.status !== 'PENDING' && milestone.status !== 'REJECTED') {
                    return NextResponse.json({ error: 'Milestone cannot be submitted in current state' }, { status: 400 });
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

                return NextResponse.json({ success: true, milestone: updated });
            }

            case 'approve': {
                if (milestone.status !== 'SUBMITTED') {
                    return NextResponse.json({ error: 'Only submitted milestones can be approved' }, { status: 400 });
                }

                // Update milestone
                const updated = await prisma.milestone.update({
                    where: { id: milestone.id },
                    data: {
                        status: 'APPROVED',
                        approveTxHash: body.approveTxHash || null,
                        reviewedAt: new Date(),
                    },
                });

                // Update stream released amount
                const newReleased = stream.releasedAmount + milestone.amount;
                const approvedCount = stream.milestones.filter(m => m.status === 'APPROVED').length + 1;
                const allApproved = approvedCount === stream.milestones.length;

                await prisma.streamJob.update({
                    where: { id: stream.id },
                    data: {
                        releasedAmount: newReleased,
                        status: allApproved ? 'COMPLETED' : 'ACTIVE',
                    },
                });

                // Notify agent
                await notify({
                    wallet: stream.agentWallet,
                    type: 'stream:milestone_approved',
                    title: `Milestone ${milestoneIndex + 1} Approved`,
                    message: `Client approved milestone ${milestoneIndex + 1}/${stream.milestones.length}. Payment of $${milestone.amount} released!`,
                    streamJobId: stream.id,
                    milestoneId: milestone.id,
                });

                // If all approved, notify both
                if (allApproved) {
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

                return NextResponse.json({ success: true, milestone: updated, streamCompleted: allApproved });
            }

            case 'reject': {
                if (milestone.status !== 'SUBMITTED') {
                    return NextResponse.json({ error: 'Only submitted milestones can be rejected' }, { status: 400 });
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

                return NextResponse.json({ success: true, milestone: updated });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[api/stream/milestone] POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
