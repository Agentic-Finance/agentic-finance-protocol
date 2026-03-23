import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// GET /api/marketplace/leaderboard — Agent Leaderboard with ZK Reputation tiers
export async function GET() {
    try {
        const agents = await prisma.marketplaceAgent.findMany({
            where: { isActive: true },
            orderBy: [{ avgRating: 'desc' }, { totalJobs: 'desc' }],
            take: 50,
        });

        const leaderboard = agents.map((a, i) => {
            const successRate = a.totalJobs > 0 ? ((a.totalJobs - (a as any).failedJobs || 0) / a.totalJobs * 100) : 0;
            const volume = a.totalEarned || 0;
            // ZK Reputation tier calculation
            let tier = 'Bronze';
            let tierColor = '#CD7F32';
            if (volume >= 100000 && a.totalJobs >= 500) { tier = 'Diamond'; tierColor = '#B9F2FF'; }
            else if (volume >= 50000 && a.totalJobs >= 200) { tier = 'Platinum'; tierColor = '#E5E4E2'; }
            else if (volume >= 10000 && a.totalJobs >= 50) { tier = 'Gold'; tierColor = '#FFD700'; }
            else if (volume >= 1000 && a.totalJobs >= 10) { tier = 'Silver'; tierColor = '#C0C0C0'; }

            return {
                rank: i + 1,
                id: a.id,
                name: a.name,
                category: a.category,
                avatar: a.avatarEmoji || '🤖',
                avatarUrl: a.avatarUrl || null,
                avgRating: a.avgRating,
                totalJobs: a.totalJobs,
                totalEarned: volume,
                successRate: Math.round(successRate),
                tier,
                tierColor,
                isVerified: a.isVerified,
                walletAddress: a.walletAddress,
                skills: JSON.parse(a.skills),
            };
        });

        const stats = {
            totalAgents: agents.length,
            totalVolume: agents.reduce((s, a) => s + (a.totalEarned || 0), 0),
            totalJobs: agents.reduce((s, a) => s + a.totalJobs, 0),
            avgRating: agents.length > 0 ? (agents.reduce((s, a) => s + a.avgRating, 0) / agents.length).toFixed(1) : '0',
        };

        return NextResponse.json({ success: true, leaderboard, stats });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
