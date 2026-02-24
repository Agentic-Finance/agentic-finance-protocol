import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { notify } from '../../../lib/notify';

export const dynamic = 'force-dynamic';

/**
 * POST /api/stream/cancel — Cancel a stream and refund unreleased funds
 *
 * Body: { streamJobId: string, cancelTxHash?: string }
 */
export async function POST(req: Request) {
    try {
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

        if (stream.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Stream is not active' }, { status: 400 });
        }

        const remaining = stream.totalBudget - stream.releasedAmount;

        // Update stream status
        await prisma.streamJob.update({
            where: { id: stream.id },
            data: { status: 'CANCELLED' },
        });

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
