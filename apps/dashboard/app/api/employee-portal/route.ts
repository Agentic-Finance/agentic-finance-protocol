import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Employee Portal API — employees can view their own payment history
 * by connecting their wallet (recipientWallet match).
 *
 * GET /api/employee-portal?wallet=0x...
 * Returns: paymentHistory, totalEarned, pendingPayments, streamingPayroll
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet')?.trim()?.toLowerCase();

    if (!wallet) {
        return NextResponse.json({ error: 'Missing wallet param' }, { status: 400 });
    }

    try {
        // Find all payments sent TO this wallet (as recipient)
        const payments = await prisma.timeVaultPayload.findMany({
            where: {
                recipientWallet: { equals: wallet, mode: 'insensitive' },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Separate by status
        const completed = payments.filter(p => p.status === 'COMPLETED');
        const pending = payments.filter(p => ['Draft', 'PENDING', 'PROCESSING', 'Vaulted'].includes(p.status));

        // Calculate totals
        const totalEarned = completed.reduce((sum, p) => sum + (p.amount || 0), 0);
        const pendingAmount = pending.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Parse ZK proof info for completed payments
        const paymentHistory = completed.map(p => {
            let depositTxHash = '';
            let payoutTxHash = '';
            try {
                if (p.zkProof && typeof p.zkProof === 'string' && p.zkProof.startsWith('{')) {
                    const proof = JSON.parse(p.zkProof);
                    depositTxHash = proof.depositTxHash || '';
                    payoutTxHash = proof.payoutTxHash || '';
                }
            } catch { /* ignore */ }

            return {
                id: p.id,
                amount: p.amount,
                token: p.token || 'AlphaUSD',
                note: p.note || '',
                isShielded: p.isShielded,
                status: p.status,
                date: p.createdAt,
                txHash: payoutTxHash || depositTxHash || '',
                from: p.workspaceId || 'Unknown',
            };
        });

        // Get workspace names for each payment
        const workspaceIds = [...new Set(payments.map(p => p.workspaceId).filter(Boolean))];
        const workspaces = workspaceIds.length > 0
            ? await prisma.workspace.findMany({
                where: { id: { in: workspaceIds as string[] } },
                select: { id: true, name: true },
            })
            : [];
        const wsMap = Object.fromEntries(workspaces.map(w => [w.id, w.name]));

        // Enrich history with workspace names
        const enrichedHistory = paymentHistory.map(p => ({
            ...p,
            fromWorkspace: wsMap[p.from] || 'Unknown Workspace',
        }));

        // Monthly breakdown for chart
        const monthlyBreakdown: Record<string, number> = {};
        completed.forEach(p => {
            const month = new Date(p.createdAt).toISOString().slice(0, 7); // YYYY-MM
            monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + (p.amount || 0);
        });

        return NextResponse.json({
            success: true,
            wallet,
            totalEarned: totalEarned.toFixed(2),
            pendingAmount: pendingAmount.toFixed(2),
            totalPayments: completed.length,
            pendingCount: pending.length,
            paymentHistory: enrichedHistory,
            pendingPayments: pending.map(p => ({
                id: p.id,
                amount: p.amount,
                token: p.token || 'AlphaUSD',
                note: p.note || '',
                status: p.status,
                date: p.createdAt,
                fromWorkspace: wsMap[p.workspaceId || ''] || 'Unknown',
            })),
            monthlyBreakdown,
            shieldedCount: completed.filter(p => p.isShielded).length,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
