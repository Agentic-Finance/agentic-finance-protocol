import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { notify } from '../../../lib/notify';
import { syncSwarmProgress } from '@/app/lib/swarm-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/stream/cancel - Cancel a stream and refund unreleased funds
 *
 * Body: { streamJobId: string, cancelTxHash?: string }
 */
export async function POST(req: Request) {
    try {
        const callerWallet = req.headers.get('X-Wallet-Address')?.toLowerCase();
        const { streamJobId, cancelTxHash } = await req.json();

        if (!streamJobId) {
            return NextResponse.json({ error: 'Missing streamJobId' }, { status: 400 });
        }

        const stream = await prisma.streamJob.findUnique({
            where: { id: streamJobId },
            include: { milestones: true },
        });

        if (!stream) {
            return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
        }

        // Only the client (payer) can cancel a stream
        if (callerWallet && callerWallet !== stream.clientWallet) {
            return NextResponse.json({ error: 'Only the stream client can cancel' }, { status: 403 });
        }

        if (stream.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Stream is not active' }, { status: 400 });
        }

        const remaining = stream.totalBudget - stream.releasedAmount;

        // Update stream + cancel pending/submitted milestones atomically
        await prisma.$transaction([
            prisma.streamJob.update({
                where: { id: stream.id },
                data: { status: 'CANCELLED' },
            }),
            prisma.milestone.updateMany({
                where: { streamJobId: stream.id, status: { in: ['PENDING', 'SUBMITTED'] } },
                data: { status: 'CANCELLED' },
            }),
        ]);

        // Sync swarm progress if this stream belongs to a swarm
        const swarmStream = await prisma.swarmStream.findUnique({ where: { streamJobId: stream.id } });
        if (swarmStream) {
            await syncSwarmProgress(swarmStream.swarmId).catch(() => {});
        }

        // Notify both parties
        await notify({
            wallet: stream.clientWallet,
            type: 'stream:cancelled',
            title: 'Stream Cancelled',
            message: `Stream cancelled. $${remaining.toFixed(2)} refunded to your wallet.`,
            streamJobId: stream.id,
        });

        await notify({
            wallet: stream.agentWallet,
            type: 'stream:cancelled',
            title: 'Stream Cancelled',
            message: `Client cancelled the stream. $${stream.releasedAmount.toFixed(2)} earned from ${stream.milestones.filter(m => m.status === 'APPROVED').length} approved milestones.`,
            streamJobId: stream.id,
        });

        return NextResponse.json({
            success: true,
            refundedAmount: remaining,
            cancelTxHash: cancelTxHash || null,
        });
    } catch (error: any) {
        console.error('[api/stream/cancel] POST error:', error);
        return NextResponse.json({ error: 'Failed to cancel stream' }, { status: 500 });
    }
}
