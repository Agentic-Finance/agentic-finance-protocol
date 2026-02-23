import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// POST /api/marketplace/reviews - Submit a review
export async function POST(req: Request) {
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

        // Check for existing review
        const existing = await prisma.agentReview.findFirst({ where: { jobId } });
        if (existing) {
            return NextResponse.json({ error: "Already reviewed this job." }, { status: 400 });
        }

        // Create review
        const review = await prisma.agentReview.create({
            data: {
                jobId,
                agentId,
                rating: parseInt(String(rating)),
                comment: comment || null,
            },
        });

        // Update agent rating
        const agent = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });
        if (agent) {
            const newCount = agent.ratingCount + 1;
            const newAvg = ((agent.avgRating * agent.ratingCount) + rating) / newCount;
            await prisma.marketplaceAgent.update({
                where: { id: agentId },
                data: {
                    avgRating: Math.round(newAvg * 10) / 10,
                    ratingCount: newCount,
                },
            });
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
