import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// GET /api/marketplace/analytics — Marketplace Analytics
export async function GET() {
    try {
        const agents = await prisma.marketplaceAgent.findMany({ where: { isActive: true } });
        const jobs = await prisma.marketplaceJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 500,
        });

        // Category breakdown
        const categoryStats: Record<string, { count: number; volume: number; avgRating: number }> = {};
        agents.forEach(a => {
            const cat = a.category || 'other';
            if (!categoryStats[cat]) categoryStats[cat] = { count: 0, volume: 0, avgRating: 0 };
            categoryStats[cat].count++;
            categoryStats[cat].volume += a.totalEarned || 0;
            categoryStats[cat].avgRating += a.avgRating;
        });
        Object.values(categoryStats).forEach(s => {
            if (s.count > 0) s.avgRating = Math.round((s.avgRating / s.count) * 10) / 10;
        });

        // Trending agents (most jobs recently)
        const jobCounts: Record<string, number> = {};
        jobs.forEach(j => { jobCounts[j.agentId] = (jobCounts[j.agentId] || 0) + 1; });
        const trendingIds = Object.entries(jobCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([id]) => id);
        const trendingAgents = agents
            .filter(a => trendingIds.includes(a.id))
            .map(a => ({ id: a.id, name: a.name, category: a.category, avatar: a.avatar, recentJobs: jobCounts[a.id] || 0, avgRating: a.avgRating }));

        // Price distribution
        const prices = agents.map(a => a.basePrice || 0).filter(p => p > 0);
        const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        // Daily volume (last 30 days)
        const now = new Date();
        const dailyVolume: { date: string; jobs: number; volume: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const dayJobs = jobs.filter(j => j.createdAt.toISOString().slice(0, 10) === dateStr);
            dailyVolume.push({
                date: dateStr,
                jobs: dayJobs.length,
                volume: dayJobs.reduce((s, j) => s + (j.agreedPrice || 0), 0),
            });
        }

        return NextResponse.json({
            success: true,
            overview: {
                totalAgents: agents.length,
                totalJobs: jobs.length,
                totalVolume: agents.reduce((s, a) => s + (a.totalEarned || 0), 0),
                avgPrice: Math.round(avgPrice * 100) / 100,
                minPrice,
                maxPrice,
                avgRating: agents.length > 0 ? Math.round((agents.reduce((s, a) => s + a.avgRating, 0) / agents.length) * 10) / 10 : 0,
            },
            categoryStats,
            trendingAgents,
            dailyVolume,
        });
    } catch (error: any) {
        return NextResponse.json({
            success: true,
            overview: { totalAgents: 0, totalJobs: 0, totalVolume: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, avgRating: 0 },
            categoryStats: {},
            trendingAgents: [],
            dailyVolume: [],
        });
    }
}
