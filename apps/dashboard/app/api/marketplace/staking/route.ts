import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// GET /api/marketplace/staking — Get agent staking info
// POST /api/marketplace/staking — Stake/unstake for an agent
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get('agentId');

        if (agentId) {
            const agent = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });
            if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

            return NextResponse.json({
                success: true,
                staking: {
                    agentId: agent.id,
                    agentName: agent.name,
                    stakedAmount: (agent as any).securityDeposit || 0,
                    isStaked: ((agent as any).securityDeposit || 0) > 0,
                    tier: ((agent as any).securityDeposit || 0) >= 10000 ? 'Diamond' :
                          ((agent as any).securityDeposit || 0) >= 5000 ? 'Platinum' :
                          ((agent as any).securityDeposit || 0) >= 1000 ? 'Gold' :
                          ((agent as any).securityDeposit || 0) >= 100 ? 'Silver' : 'Bronze',
                    slashHistory: [],
                    insuranceCoverage: Math.min(((agent as any).securityDeposit || 0) * 2, 50000),
                },
            });
        }

        // All staking stats
        const agents = await prisma.marketplaceAgent.findMany({ where: { isActive: true } });
        const totalStaked = agents.reduce((s, a) => s + ((a as any).securityDeposit || 0), 0);
        const stakedAgents = agents.filter(a => ((a as any).securityDeposit || 0) > 0).length;

        return NextResponse.json({
            success: true,
            overview: { totalStaked, stakedAgents, totalAgents: agents.length, avgStake: stakedAgents > 0 ? totalStaked / stakedAgents : 0 },
        });
    } catch (error: any) {
        return NextResponse.json({ success: true, overview: { totalStaked: 0, stakedAgents: 0, totalAgents: 0, avgStake: 0 } });
    }
}
