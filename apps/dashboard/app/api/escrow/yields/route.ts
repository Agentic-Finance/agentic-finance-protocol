import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/escrow/yields
 * Returns all yield positions + summary stats
 * Computes real-time yield based on elapsed time
 */
export async function GET() {
    try {
        const positions = await prisma.escrowYield.findMany({
            orderBy: { startedAt: 'desc' },
        });

        // Compute real-time yield for accruing positions
        const now = new Date();
        const enriched = positions.map((p) => {
            if (p.status === 'Accruing') {
                const elapsed = (now.getTime() - p.startedAt.getTime()) / (1000 * 60 * 60 * 24 * 365);
                const realTimeYield = p.principal * (p.apy / 100) * elapsed;
                return { ...p, yieldEarned: Math.round(realTimeYield * 100) / 100 };
            }
            return p;
        });

        const accruing = enriched.filter((p) => p.status === 'Accruing');
        const totalPrincipal = accruing.reduce((s, p) => s + p.principal, 0);
        const totalYield = enriched.reduce((s, p) => s + p.yieldEarned, 0);
        const avgAPY = accruing.length > 0
            ? accruing.reduce((s, p) => s + p.apy, 0) / accruing.length
            : 0;

        return NextResponse.json({
            positions: enriched,
            summary: {
                totalPrincipal: Math.round(totalPrincipal * 100) / 100,
                totalYield: Math.round(totalYield * 100) / 100,
                avgAPY: Math.round(avgAPY * 10) / 10,
                activePositions: accruing.length,
                totalPositions: positions.length,
            },
        });
    } catch (error: any) {
        console.error('Escrow yields error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
