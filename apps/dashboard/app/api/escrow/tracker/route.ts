import { NextResponse } from 'next/server';
import prisma from "@/app/lib/prisma";

/**
 * GET /api/escrow/tracker?wallet=0x...
 *
 * Returns escrow lifecycle data for the EscrowTracker component.
 * Queries AgentJob (with agent relation) filtered by clientWallet.
 *
 * Response:
 *   active: jobs in non-terminal states (ESCROW_LOCKED, EXECUTING, COMPLETED, DISPUTED)
 *   recent: settled/refunded jobs from the last 7 days (max 5)
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet');

        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Missing wallet parameter' }, { status: 400 });
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Fetch active escrows (non-terminal statuses)
        const activeJobs = await prisma.agentJob.findMany({
            where: {
                clientWallet: wallet,
                status: { in: ['ESCROW_LOCKED', 'EXECUTING', 'COMPLETED', 'DISPUTED'] }
            },
            include: { agent: true },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        // Fetch recently settled/refunded (last 7 days)
        const recentJobs = await prisma.agentJob.findMany({
            where: {
                clientWallet: wallet,
                status: { in: ['SETTLED', 'REFUNDED'] },
                completedAt: { gte: sevenDaysAgo }
            },
            include: { agent: true },
            orderBy: { completedAt: 'desc' },
            take: 5
        });

        const mapJob = (job: any) => ({
            jobId: job.id,
            agentName: job.agent?.name || 'Unknown Agent',
            agentEmoji: job.agent?.avatarEmoji || '🤖',
            agentCategory: job.agent?.category || 'general',
            amount: job.budget || 0,
            negotiatedPrice: job.negotiatedPrice,
            platformFee: job.platformFee,
            token: job.token || 'AlphaUSD',
            status: job.status,
            onChainJobId: job.onChainJobId,
            escrowTxHash: job.escrowTxHash,
            settleTxHash: job.settleTxHash,
            deadline: job.deadline?.toISOString() || null,
            disputeReason: job.disputeReason,
            createdAt: job.createdAt.toISOString(),
            completedAt: job.completedAt?.toISOString() || null,
            prompt: (job.prompt || '').substring(0, 100),
        });

        return NextResponse.json({
            success: true,
            active: activeJobs.map(mapJob),
            recent: recentJobs.map(mapJob),
        });
    } catch (error: any) {
        console.error("[ESCROW_TRACKER_ERROR]:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch escrow tracker data" },
            { status: 500 }
        );
    }
}
