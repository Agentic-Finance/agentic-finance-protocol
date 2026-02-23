import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';

export async function POST(req: Request) {
    try {
        const { jobId } = await req.json();

        if (!jobId) {
            return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
        }

        // 1. Fetch job + agent
        const job = await prisma.agentJob.findUnique({
            where: { id: jobId },
            include: { agent: true },
        });

        if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
        if (job.status !== 'ESCROW_LOCKED' && job.status !== 'MATCHED') {
            return NextResponse.json({ error: `Cannot execute job in status: ${job.status}` }, { status: 400 });
        }

        // 2. Mark as executing
        await prisma.agentJob.update({
            where: { id: jobId },
            data: { status: 'EXECUTING' },
        });

        const startTime = Date.now();
        let result: any = null;
        let finalStatus = 'COMPLETED';

        try {
            if (job.agent.nativeAgentId) {
                // ════════════════════════════════════════
                // NATIVE PAYPOL AGENT (Claude-powered)
                // ════════════════════════════════════════
                const response = await fetch(`${AGENT_SERVICE_URL}/agents/${job.agent.nativeAgentId}/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: job.prompt,
                        taskDescription: job.taskDescription,
                        budget: job.budget,
                        callerWallet: job.clientWallet,
                    }),
                    signal: AbortSignal.timeout(120000), // 2 min timeout
                });

                if (!response.ok) {
                    throw new Error(`Agent service returned ${response.status}`);
                }

                result = await response.json();

            } else if (job.agent.webhookUrl) {
                // ════════════════════════════════════════
                // THIRD-PARTY AGENT (via webhook)
                // ════════════════════════════════════════
                const response = await fetch(job.agent.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobId: job.id,
                        prompt: job.prompt,
                        taskDescription: job.taskDescription,
                        budget: job.budget,
                        callerWallet: job.clientWallet,
                        token: job.token,
                    }),
                    signal: AbortSignal.timeout(120000),
                });

                if (!response.ok) {
                    throw new Error(`Webhook returned ${response.status}`);
                }

                result = await response.json();

            } else {
                // ════════════════════════════════════════
                // NO EXECUTION ENDPOINT - Simulate for demo agents
                // ════════════════════════════════════════
                result = {
                    status: 'completed',
                    output: `Task "${job.prompt}" has been queued for processing by ${job.agent.name}. The agent will deliver results to your workspace.`,
                    metadata: {
                        agentName: job.agent.name,
                        category: job.agent.category,
                        estimatedTime: `${job.agent.responseTime}s`,
                    },
                };
            }
        } catch (execError: any) {
            console.error(`[Execute] Agent execution failed:`, execError.message);
            finalStatus = 'FAILED';
            result = { error: execError.message };
        }

        const executionTime = Math.round((Date.now() - startTime) / 1000);

        // 3. Update job with result
        await prisma.agentJob.update({
            where: { id: jobId },
            data: {
                status: finalStatus,
                result: JSON.stringify(result),
                executionTime,
                completedAt: new Date(),
            },
        });

        // 4. Update agent stats
        const agent = job.agent;
        const newTotal = agent.totalJobs + 1;
        const prevSuccessCount = Math.round(agent.successRate * agent.totalJobs / 100);
        const newSuccessCount = finalStatus === 'COMPLETED' ? prevSuccessCount + 1 : prevSuccessCount;
        const newRate = newTotal > 0 ? (newSuccessCount / newTotal) * 100 : 100;

        await prisma.marketplaceAgent.update({
            where: { id: agent.id },
            data: {
                totalJobs: newTotal,
                successRate: Math.round(newRate * 10) / 10,
                responseTime: Math.round((agent.responseTime * agent.totalJobs + executionTime) / newTotal),
            },
        });

        return NextResponse.json({
            success: finalStatus === 'COMPLETED',
            status: finalStatus,
            result,
            executionTime,
        });

    } catch (error: any) {
        console.error("[Marketplace Execute]", error);
        return NextResponse.json({ error: "Execution failed." }, { status: 500 });
    }
}
