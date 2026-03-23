import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// POST /api/marketplace/autonomous — Create autonomous budget task
export async function POST(req: Request) {
    try {
        const { agentId, goal, monthlyBudget, duration, clientWallet } = await req.json();
        if (!agentId || !goal || !monthlyBudget) {
            return NextResponse.json({ error: 'agentId, goal, monthlyBudget required' }, { status: 400 });
        }

        const agent = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });
        if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

        const autonomousTask = {
            id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            agentId,
            agentName: agent.name,
            goal,
            monthlyBudget,
            totalBudget: monthlyBudget * (duration || 1),
            spent: 0,
            duration: duration || 1,
            status: 'active',
            actionsCompleted: 0,
            lastReport: null,
            createdAt: new Date().toISOString(),
            nextReportAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        return NextResponse.json({ success: true, autonomous: autonomousTask });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET /api/marketplace/autonomous — List active autonomous tasks
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    // In production, fetch from DB. For now, return empty
    return NextResponse.json({ success: true, tasks: [] });
}
