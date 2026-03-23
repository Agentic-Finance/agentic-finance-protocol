import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export-receipt?wallet=0x...&format=csv|json
 *
 * Export payment receipts for an employee wallet.
 * Returns structured data that can be used as pay stubs.
 *
 * CSV format for QuickBooks/Excel import.
 * JSON format for programmatic use.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet');
        const format = searchParams.get('format') || 'json';
        const from = searchParams.get('from'); // YYYY-MM-DD
        const to = searchParams.get('to');     // YYYY-MM-DD

        if (!wallet) {
            return NextResponse.json({ error: 'wallet required' }, { status: 400 });
        }

        // Build date filter
        const dateFilter: any = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) dateFilter.lte = new Date(to + 'T23:59:59Z');

        const payouts = await prisma.timeVaultPayload.findMany({
            where: {
                recipientWallet: { equals: wallet, mode: 'insensitive' },
                status: { in: ['Completed', 'Settled', 'COMPLETED'] },
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
        });

        const receipts = payouts.map((p, i) => ({
            receiptNo: `AGT-${p.createdAt.getFullYear()}${String(p.createdAt.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
            date: p.createdAt.toISOString().split('T')[0],
            recipient: p.name,
            wallet: p.recipientWallet,
            amount: p.amount || 0,
            token: p.token || 'AlphaUSD',
            shielded: p.isShielded ? 'Yes' : 'No',
            note: p.note || '',
            txHash: p.zkCommitment || '',
            status: p.status,
        }));

        const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
        const shieldedCount = receipts.filter(r => r.shielded === 'Yes').length;

        if (format === 'csv') {
            const headers = 'Receipt No,Date,Recipient,Wallet,Amount,Token,Shielded,Note,TX Hash,Status';
            const rows = receipts.map(r =>
                `${r.receiptNo},${r.date},"${r.recipient}",${r.wallet},${r.amount},${r.token},${r.shielded},"${r.note.replace(/"/g, '""')}",${r.txHash},${r.status}`
            );
            const csv = [headers, ...rows].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="receipts-${wallet.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv"`,
                },
            });
        }

        return NextResponse.json({
            success: true,
            wallet,
            period: { from: from || 'all', to: to || 'now' },
            summary: {
                totalReceipts: receipts.length,
                totalAmount: Math.round(totalAmount * 100) / 100,
                shieldedCount,
                tokens: [...new Set(receipts.map(r => r.token))],
            },
            receipts,
        });
    } catch (error: any) {
        console.error('[ExportReceipt] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
