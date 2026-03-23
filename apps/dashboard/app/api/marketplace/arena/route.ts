import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// POST /api/marketplace/arena — Agent Arena (competitive execution)
export async function POST(req: Request) {
    try {
        const { task, agentIds, budget, clientWallet } = await req.json();
        if (!task || !agentIds || agentIds.length < 2) {
            return NextResponse.json({ error: 'Need task + at least 2 agentIds' }, { status: 400 });
        }

        const agents = await prisma.marketplaceAgent.findMany({
            where: { id: { in: agentIds }, isActive: true },
        });

        if (agents.length < 2) {
            return NextResponse.json({ error: 'At least 2 active agents required' }, { status: 400 });
        }

        // Create arena session
        const arenaId = `arena_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Simulate competitive results (in production, call agent endpoints in parallel)
        const results = agents.map((agent, idx) => ({
            agentId: agent.id,
            agentName: agent.name,
            category: agent.category,
            avatar: agent.avatar,
            rating: agent.avgRating,
            responseTimeMs: Math.round(1000 + Math.random() * 4000),
            qualityScore: Math.round(70 + Math.random() * 30),
            price: Math.round((budget / agents.length) * (0.8 + Math.random() * 0.4)),
            response: `[${agent.name} Arena Response]\n\nTask: "${task.slice(0, 100)}"\n\nThis agent completed the task with ${agent.category} expertise. Rating: ${agent.avgRating.toFixed(1)}★`,
            rank: 0,
        }));

        // Rank by quality score
        results.sort((a, b) => b.qualityScore - a.qualityScore);
        results.forEach((r, i) => { r.rank = i + 1; });

        return NextResponse.json({
            success: true,
            arenaId,
            task,
            totalAgents: agents.length,
            results,
            winner: results[0],
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
