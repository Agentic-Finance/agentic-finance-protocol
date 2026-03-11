import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { notify } from '@/app/lib/notify';
import { requireWalletAuth } from '@/app/lib/api-auth';
import { marketplaceLimiter, getClientId } from '@/app/lib/rate-limit';

// POST /api/marketplace/reviews - Submit a review
export async function POST(req: Request) {
    const auth = requireWalletAuth(req);
    if (!auth.valid) return auth.response!;
    const rateCheck = marketplaceLimiter.check(getClientId(req));
    if (!rateCheck.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    try {
        const { jobId, agentId, rating, comment } = await req.json();

        if (!jobId || !agentId || !rating) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Rating must be 1-5." }, { status: 400 });
        }

        // Check job exists and is completed
        const job = await prisma.agentJob.findUnique({ where: { id: jobId } });
        if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
        if (job.status !== 'COMPLETED' && job.status !== 'FAILED') {
            return NextResponse.json({ error: "Can only review completed jobs." }, { status: 400 });
        }

        // Cap rating for failed jobs at 3 stars — prevents inflating agent reputation
        const effectiveRating = job.status === 'FAILED' ? Math.min(rating, 3) : rating;

        // Check for existing review
        const existing = await prisma.agentReview.findFirst({ where: { jobId } });
        if (existing) {
            return NextResponse.json({ error: "Already reviewed this job." }, { status: 400 });
        }

        // Fetch agent before transaction to compute new average rating
        const agent = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });

        // Wrap review creation + agent rating update in a transaction
        const newCount = agent ? agent.ratingCount + 1 : 1;
        const newAvg = agent
            ? ((agent.avgRating * agent.ratingCount) + effectiveRating) / newCount
            : effectiveRating;

        const [review] = await prisma.$transaction([
            prisma.agentReview.create({
                data: {
                    jobId,
                    agentId,
                    rating: parseInt(String(effectiveRating)),
                    comment: comment || null,
                },
            }),
            prisma.marketplaceAgent.update({
                where: { id: agentId },
                data: {
                    avgRating: Math.round(newAvg * 10) / 10,
                    ratingCount: { increment: 1 },
                },
            }),
        ]);

        // Notify agent about the review
        if (agent) {
            notify({
                wallet: agent.ownerWallet,
                type: 'review:received',
                title: `${effectiveRating}\u2B50 Review Received`,
                message: comment ? `"${comment.slice(0, 80)}${comment.length > 80 ? '...' : ''}"` : `You received a ${effectiveRating}-star review`,
            }).catch(() => {});
        }

        return NextResponse.json({ success: true, review });
    } catch (error: any) {
        console.error("[Marketplace Reviews POST]", error);
        return NextResponse.json({ error: "Failed to submit review." }, { status: 500 });
    }
}

// GET /api/marketplace/reviews?agentId=xxx
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get('agentId');

        if (!agentId) {
            return NextResponse.json({ error: "agentId required." }, { status: 400 });
        }

        const reviews = await prisma.agentReview.findMany({
            where: { agentId },
            include: { job: { select: { prompt: true, clientWallet: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        return NextResponse.json({ reviews });
    } catch (error: any) {
        console.error("[Marketplace Reviews GET]", error);
        return NextResponse.json({ error: "Failed to fetch reviews." }, { status: 500 });
    }
}
