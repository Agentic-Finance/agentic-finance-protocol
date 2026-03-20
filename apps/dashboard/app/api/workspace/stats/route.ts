import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const wallet = req.nextUrl.searchParams.get('wallet')?.trim();
        const range = req.nextUrl.searchParams.get('range') || '7d'; // 7d | 30d | all
        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Missing wallet parameter' }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
        });

        if (!workspace) {
            return NextResponse.json({ success: true, stats: null });
        }

        const wsId = workspace.id;

        // Determine time range for chart data
        const now = new Date();
        let rangeDays: number;
        let rangeDate: Date | null;

        if (range === '30d') {
            rangeDays = 30;
            rangeDate = new Date(now);
            rangeDate.setDate(rangeDate.getDate() - 30);
        } else if (range === 'all') {
            rangeDays = 0; // Will fetch all
            rangeDate = null;
        } else {
            rangeDays = 7;
            rangeDate = new Date(now);
            rangeDate.setDate(rangeDate.getDate() - 7);
        }

        const [
            volumeAgg,
            totalBatchCount,
            employeeCount,
            zkProofsCount,
            daemonJobsCount,
            recentPayloads,
            lastCompleted,
        ] = await Promise.all([
            // Total volume (completed payloads) — always ALL time
            prisma.timeVaultPayload.aggregate({
                where: { workspaceId: wsId, status: 'COMPLETED' },
                _sum: { amount: true },
            }),
            // Total batches completed — always ALL time
            prisma.timeVaultPayload.count({
                where: { workspaceId: wsId, status: 'COMPLETED' },
            }),
            // Employee count
            prisma.employee.count({
                where: { workspaceId: wsId },
            }),
            // ZK proofs generated (shielded + completed) — always ALL time
            prisma.timeVaultPayload.count({
                where: { workspaceId: wsId, isShielded: true, status: 'COMPLETED' },
            }),
            // Daemon jobs processed — always ALL time
            prisma.timeVaultPayload.count({
                where: { workspaceId: wsId, status: 'COMPLETED' },
            }),
            // Payloads for chart (scoped to range)
            prisma.timeVaultPayload.findMany({
                where: {
                    workspaceId: wsId,
                    status: 'COMPLETED',
                    ...(rangeDate ? { createdAt: { gte: rangeDate } } : {}),
                },
                select: { amount: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
            // Last completed payload timestamp
            prisma.timeVaultPayload.findFirst({
                where: { workspaceId: wsId, status: 'COMPLETED' },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
        ]);

        // Build chart data based on range
        let chartData: Array<{ name: string; volume: number }>;

        if (range === 'all' && recentPayloads.length > 0) {
            // Group by month for "all" range
            const monthMap: Record<string, number> = {};
            recentPayloads.forEach((p) => {
                const d = new Date(p.createdAt);
                const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                monthMap[key] = (monthMap[key] || 0) + (p.amount ?? 0);
            });
            chartData = Object.entries(monthMap).map(([name, volume]) => ({
                name,
                volume: parseFloat(volume.toFixed(3)),
            }));
        } else {
            // Day-by-day for 7d and 30d
            const days = range === '30d' ? 30 : 7;
            const dayBuckets = Array.from({ length: days }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (days - 1 - i));
                return {
                    name: days <= 7
                        ? d.toLocaleDateString('en-US', { weekday: 'short' })
                        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    fullDate: d.toLocaleDateString('en-US'),
                    volume: 0,
                };
            });

            recentPayloads.forEach((p) => {
                const dateStr = new Date(p.createdAt).toLocaleDateString('en-US');
                const dayIdx = dayBuckets.findIndex((d) => d.fullDate === dateStr);
                if (dayIdx !== -1) dayBuckets[dayIdx].volume += (p.amount ?? 0);
            });

            chartData = dayBuckets.map((d) => ({
                name: d.name,
                volume: parseFloat(d.volume.toFixed(3)),
            }));
        }

        // Range-scoped volume (for chart total)
        const rangeVolume = recentPayloads.reduce((sum, p) => sum + (p.amount ?? 0), 0);
        const totalVolume = volumeAgg._sum.amount ?? 0;
        const totalBatches = totalBatchCount;

        const response = NextResponse.json({
            success: true,
            stats: {
                totalVolume: parseFloat(totalVolume.toFixed(3)),
                rangeVolume: parseFloat(rangeVolume.toFixed(3)),
                totalBatches,
                employeeCount,
                avgBatchSize: totalBatches > 0 ? parseFloat((totalVolume / totalBatches).toFixed(3)) : 0,
                zkProofsGenerated: zkProofsCount,
                daemonJobsProcessed: daemonJobsCount,
                lastActivityAt: lastCompleted?.createdAt?.toISOString() || null,
                recentActivity: chartData,
                range,
            },
        });

        response.headers.set('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
        return response;
    } catch (error) {
        console.error('[workspace/stats] Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch workspace stats' }, { status: 500 });
    }
}
