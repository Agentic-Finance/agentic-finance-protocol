import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payroll-analytics?wallet=0x...
 *
 * Returns payroll analytics:
 * - Department breakdown (total salary per dept)
 * - Monthly payroll trend (last 6 months)
 * - Top recipients by volume
 * - Cost per headcount
 * - Budget forecast
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet');
        if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });

        // Get workspace
        const workspace = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
        });
        if (!workspace) {
            return NextResponse.json({ success: true, analytics: getEmptyAnalytics() });
        }

        // Fetch all employees (active)
        const employees = await prisma.employee.findMany({
            where: { workspaceId: workspace.id, deletedAt: null },
        });

        // Fetch completed payouts (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const payouts = await prisma.timeVaultPayload.findMany({
            where: {
                workspaceId: workspace.id,
                status: { in: ['Completed', 'Settled', 'COMPLETED'] },
                createdAt: { gte: sixMonthsAgo },
            },
            orderBy: { createdAt: 'desc' },
        });

        // 1. Department breakdown
        const deptMap = new Map<string, { count: number; totalSalary: number }>();
        for (const emp of employees) {
            const dept = (emp as any).department || 'Unassigned';
            const current = deptMap.get(dept) || { count: 0, totalSalary: 0 };
            current.count++;
            current.totalSalary += emp.amount || 0;
            deptMap.set(dept, current);
        }
        const departmentBreakdown = [...deptMap.entries()].map(([dept, data]) => ({
            department: dept,
            headcount: data.count,
            totalSalary: Math.round(data.totalSalary * 100) / 100,
            avgSalary: Math.round((data.totalSalary / data.count) * 100) / 100,
        })).sort((a, b) => b.totalSalary - a.totalSalary);

        // 2. Monthly trend
        const monthlyMap = new Map<string, { volume: number; txCount: number }>();
        for (const p of payouts) {
            const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
            const current = monthlyMap.get(key) || { volume: 0, txCount: 0 };
            current.volume += p.amount || 0;
            current.txCount++;
            monthlyMap.set(key, current);
        }
        const monthlyTrend = [...monthlyMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                month,
                volume: Math.round(data.volume * 100) / 100,
                txCount: data.txCount,
            }));

        // 3. Top recipients
        const recipientMap = new Map<string, { name: string; wallet: string; totalReceived: number; txCount: number }>();
        for (const p of payouts) {
            const key = p.recipientWallet.toLowerCase();
            const current = recipientMap.get(key) || { name: p.name, wallet: p.recipientWallet, totalReceived: 0, txCount: 0 };
            current.totalReceived += p.amount || 0;
            current.txCount++;
            recipientMap.set(key, current);
        }
        const topRecipients = [...recipientMap.values()]
            .sort((a, b) => b.totalReceived - a.totalReceived)
            .slice(0, 10)
            .map(r => ({ ...r, totalReceived: Math.round(r.totalReceived * 100) / 100 }));

        // 4. Summary stats
        const totalEmployees = employees.length;
        const totalMonthlySalary = employees.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalPayoutVolume = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
        const avgCostPerHead = totalEmployees > 0 ? totalMonthlySalary / totalEmployees : 0;
        const shieldedCount = payouts.filter(p => p.isShielded).length;
        const shieldedPct = payouts.length > 0 ? Math.round((shieldedCount / payouts.length) * 100) : 0;

        return NextResponse.json({
            success: true,
            analytics: {
                summary: {
                    totalEmployees,
                    totalMonthlySalary: Math.round(totalMonthlySalary * 100) / 100,
                    avgCostPerHead: Math.round(avgCostPerHead * 100) / 100,
                    totalPayoutVolume: Math.round(totalPayoutVolume * 100) / 100,
                    totalPayouts: payouts.length,
                    shieldedPct,
                    annualForecast: Math.round(totalMonthlySalary * 12 * 100) / 100,
                },
                departmentBreakdown,
                monthlyTrend,
                topRecipients,
            },
        });
    } catch (error: any) {
        console.error('[PayrollAnalytics] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function getEmptyAnalytics() {
    return {
        summary: { totalEmployees: 0, totalMonthlySalary: 0, avgCostPerHead: 0, totalPayoutVolume: 0, totalPayouts: 0, shieldedPct: 0, annualForecast: 0 },
        departmentBreakdown: [],
        monthlyTrend: [],
        topRecipients: [],
    };
}
