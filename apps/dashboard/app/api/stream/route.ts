import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { notify } from '../../lib/notify';

export const dynamic = 'force-dynamic';

/**
 * POST /api/stream — Create a new stream job
 *
 * Body: {
 *   clientWallet, agentWallet, agentName?, totalBudget,
 *   milestones: [{ amount, deliverable }],
 *   onChainStreamId?, streamTxHash?, deadlineHours?
 * }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            clientWallet,
            agentWallet,
            agentName,
            totalBudget,
            milestones,
            onChainStreamId,
            streamTxHash,
            deadlineHours = 168, // 7 days default
        } = body;

        if (!clientWallet || !agentWallet || !totalBudget || !milestones?.length) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate milestone amounts sum to total
        const milestoneSum = milestones.reduce((sum: number, m: any) => sum + m.amount, 0);
        if (Math.abs(milestoneSum - totalBudget) > 0.01) {
            return NextResponse.json({
                error: `Milestone amounts (${milestoneSum}) don't match total budget (${totalBudget})`,
            }, { status: 400 });
        }

        const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

        // Create stream + milestones in a single transaction
        const stream = await prisma.streamJob.create({
            data: {
                clientWallet: clientWallet.toLowerCase(),
                agentWallet: agentWallet.toLowerCase(),
                agentName: agentName || null,
                totalBudget,
                onChainStreamId: onChainStreamId ?? null,
                streamTxHash: streamTxHash || null,
                deadline,
                milestones: {
                    create: milestones.map((m: any, i: number) => ({
                        index: i,
                        amount: m.amount,
                        deliverable: m.deliverable || `Milestone ${i + 1}`,
                    })),
                },
            },
            include: { milestones: true },
        });

        // Notify agent
        await notify({
            wallet: agentWallet,
            type: 'stream:created',
            title: 'New Stream Job',
            message: `You have a new stream job worth $${totalBudget} with ${milestones.length} milestones.`,
            streamJobId: stream.id,
        });

        return NextResponse.json({ success: true, stream });
    } catch (error: any) {
        console.error('[api/stream] POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/stream — List streams for a wallet
 *
 * Query: ?wallet=0x...&role=client|agent&status=ACTIVE
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet')?.trim().toLowerCase();
        const role = searchParams.get('role') || 'client'; // client | agent
        const status = searchParams.get('status'); // ACTIVE, COMPLETED, CANCELLED

        if (!wallet) {
            return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
        }

        const where: any = {};
        if (role === 'agent') {
            where.agentWallet = wallet;
        } else {
            where.clientWallet = wallet;
        }
        if (status) {
            where.status = status;
        }

        const streams = await prisma.streamJob.findMany({
            where,
            include: {
                milestones: {
                    orderBy: { index: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, streams });
    } catch (error: any) {
        console.error('[api/stream] GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
