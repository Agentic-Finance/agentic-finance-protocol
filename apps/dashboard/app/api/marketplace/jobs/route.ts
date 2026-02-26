import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// POST /api/marketplace/jobs - Create a new job
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { agentId, clientWallet, prompt, taskDescription, budget, negotiatedPrice, platformFee, token } = body;

        if (!agentId || !clientWallet || budget === undefined) {
            return NextResponse.json({ error: `Missing required fields. agentId=${!!agentId}, clientWallet=${!!clientWallet}, budget=${budget}` }, { status: 400 });
        }
        // Fallback prompt to prevent empty prompt rejection
        const safePrompt = prompt || taskDescription || 'Agent task via marketplace';

        // Verify agent exists
        const agent = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });
        if (!agent) {
            return NextResponse.json({ error: "Agent not found." }, { status: 404 });
        }

        const job = await prisma.agentJob.create({
            data: {
                agentId,
                clientWallet,
                prompt: safePrompt,
                taskDescription: taskDescription || null,
                budget: parseFloat(String(budget)),
                negotiatedPrice: negotiatedPrice ? parseFloat(String(negotiatedPrice)) : null,
                platformFee: platformFee ? parseFloat(String(platformFee)) : null,
                token: token || 'AlphaUSD',
                status: 'MATCHED',
            },
        });

        return NextResponse.json({ success: true, job });
    } catch (error: any) {
        console.error("[Marketplace Jobs POST]", error);
        return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
    }
}

// GET /api/marketplace/jobs - List jobs (optionally by client wallet)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const clientWallet = searchParams.get('wallet');
        const jobId = searchParams.get('id');

        if (jobId) {
            const job = await prisma.agentJob.findUnique({
                where: { id: jobId },
                include: {
                    agent: true,
                    reviews: true,
                },
            });
            if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
            return NextResponse.json({ job: { ...job, agent: { ...job.agent, skills: JSON.parse(job.agent.skills) } } });
        }

        const jobs = await prisma.agentJob.findMany({
            where: clientWallet ? { clientWallet } : {},
            include: { agent: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return NextResponse.json({
            jobs: jobs.map(j => ({
                ...j,
                agent: { ...j.agent, skills: JSON.parse(j.agent.skills) },
            })),
        });
    } catch (error: any) {
        console.error("[Marketplace Jobs GET]", error);
        return NextResponse.json({ error: "Failed to fetch jobs." }, { status: 500 });
    }
}

// PUT /api/marketplace/jobs - Update job status
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { jobId, status, result, escrowTxHash, settleTxHash, executionTime } = body;

        if (!jobId || !status) {
            return NextResponse.json({ error: "Missing jobId or status." }, { status: 400 });
        }

        const updateData: any = { status };
        if (result) updateData.result = typeof result === 'string' ? result : JSON.stringify(result);
        if (escrowTxHash) updateData.escrowTxHash = escrowTxHash;
        if (settleTxHash) updateData.settleTxHash = settleTxHash;
        if (executionTime) updateData.executionTime = executionTime;
        if (status === 'COMPLETED' || status === 'FAILED') updateData.completedAt = new Date();

        const job = await prisma.agentJob.update({
            where: { id: jobId },
            data: updateData,
        });

        // Update agent stats on completion
        if (status === 'COMPLETED' || status === 'FAILED') {
            const agent = await prisma.marketplaceAgent.findUnique({ where: { id: job.agentId } });
            if (agent) {
                const newTotalJobs = agent.totalJobs + 1;
                const successCount = status === 'COMPLETED'
                    ? Math.round(agent.successRate * agent.totalJobs / 100) + 1
                    : Math.round(agent.successRate * agent.totalJobs / 100);
                const newSuccessRate = newTotalJobs > 0 ? (successCount / newTotalJobs) * 100 : 100;

                await prisma.marketplaceAgent.update({
                    where: { id: job.agentId },
                    data: {
                        totalJobs: newTotalJobs,
                        successRate: Math.round(newSuccessRate * 10) / 10,
                    },
                });
            }
        }

        return NextResponse.json({ success: true, job });
    } catch (error: any) {
        console.error("[Marketplace Jobs PUT]", error);
        return NextResponse.json({ error: "Failed to update job." }, { status: 500 });
    }
}
