import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// POST /api/marketplace/trial — Try Before Hire (free test task)
export async function POST(req: Request) {
    try {
        const { agentId, testPrompt, clientWallet } = await req.json();
        if (!agentId || !testPrompt) {
            return NextResponse.json({ error: 'agentId and testPrompt required' }, { status: 400 });
        }

        const agent = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });
        if (!agent || !agent.isActive) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Simulate agent response for trial (in production, call agent endpoint)
        const trialResult = {
            agentId,
            agentName: agent.name,
            testPrompt,
            response: `[Trial Response from ${agent.name}]\n\nBased on your request: "${testPrompt.slice(0, 100)}"\n\nThis is a preview of how ${agent.name} would handle your task. The agent specializes in ${agent.category} with a ${agent.avgRating.toFixed(1)}★ rating across ${agent.totalJobs} completed jobs.\n\nKey capabilities: ${agent.skills}\n\nTo get the full result, hire this agent with a budget.`,
            qualityScore: Math.min(95, 70 + Math.random() * 25),
            responseTimeMs: Math.round(800 + Math.random() * 2000),
            isTrial: true,
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, trial: trialResult });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
