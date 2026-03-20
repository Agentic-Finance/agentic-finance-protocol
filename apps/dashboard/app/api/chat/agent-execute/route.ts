import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { executeJob } from '../../../lib/execute-job';
import { createAgentChatChannel } from '../../../lib/chat-utils';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId, wallet, prompt, budget } = body;

        // Validate inputs
        if (!agentId || !wallet || !prompt) {
            return NextResponse.json(
                { error: 'agentId, wallet, and prompt are required' },
                { status: 400 }
            );
        }

        // Find agent by nativeAgentId first, then fallback to id
        let agent = await prisma.marketplaceAgent.findFirst({
            where: { nativeAgentId: agentId },
        });
        if (!agent) {
            agent = await prisma.marketplaceAgent.findFirst({
                where: { id: agentId },
            });
        }
        if (!agent) {
            return NextResponse.json(
                { error: 'Agent not found' },
                { status: 404 }
            );
        }

        // Create job
        const job = await prisma.agentJob.create({
            data: {
                agentId: agent.id,
                clientWallet: wallet.toLowerCase(),
                prompt,
                taskDescription: prompt.slice(0, 200),
                budget: budget || agent.basePrice,
                status: 'MATCHED',
            },
        });

        // Create chat channel
        const channelId = await createAgentChatChannel({
            jobId: job.id,
            agentId: agent.nativeAgentId || agent.id,
            agentName: agent.name,
            clientWallet: wallet,
            agentWallet: agent.ownerWallet,
        });

        // Execute job
        const result = await executeJob(job.id);

        return NextResponse.json({
            success: true,
            jobId: job.id,
            channelId,
            status: result.status,
            result: result.result,
            executionTime: result.executionTime,
            aiProof: result.aiProof,
        });
    } catch (error: any) {
        console.error('[AgentExecute] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to execute agent' },
            { status: 500 }
        );
    }
}
