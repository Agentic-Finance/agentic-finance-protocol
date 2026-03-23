import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// GET /api/marketplace/activity — Live Activity Feed
export async function GET() {
    try {
        const recentJobs = await prisma.marketplaceJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 30,
            include: {
                agent: { select: { name: true, avatar: true, category: true } },
            },
        });

        const activities = recentJobs.map(j => ({
            id: j.id,
            type: j.status === 'completed' ? 'completed' : j.status === 'executing' ? 'executing' : 'created',
            agentName: j.agent?.name || 'Unknown Agent',
            agentAvatar: j.agent?.avatar || null,
            agentCategory: j.agent?.category || 'general',
            clientWallet: j.clientWallet ? `${j.clientWallet.slice(0,6)}...${j.clientWallet.slice(-4)}` : '0x...',
            taskPreview: j.taskDescription?.slice(0, 80) || 'Agent task',
            amount: j.agreedPrice || j.maxBudget || 0,
            status: j.status,
            timestamp: j.createdAt.toISOString(),
            completedAt: j.completedAt?.toISOString() || null,
        }));

        return NextResponse.json({ success: true, activities });
    } catch (error: any) {
        return NextResponse.json({ success: true, activities: [] });
    }
}
