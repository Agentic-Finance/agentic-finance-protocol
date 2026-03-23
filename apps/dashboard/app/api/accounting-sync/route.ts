import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/accounting-sync?wallet=0x...&format=quickbooks|xero|csv
 *
 * Export payroll data in accounting software formats.
 *
 * Formats:
 *   - quickbooks: IIF (Intuit Interchange Format) for QuickBooks Desktop
 *   - xero: CSV format compatible with Xero bulk import
 *   - csv: Generic CSV for any accounting software
 *
 * This enables:
 *   1. Download payroll data
 *   2. Import into QuickBooks/Xero
 *   3. Auto-reconcile crypto payments with traditional books
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet');
        const format = searchParams.get('format') || 'csv';
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!wallet) {
            return NextResponse.json({ error: 'wallet required' }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        const dateFilter: any = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) dateFilter.lte = new Date(to + 'T23:59:59Z');

        const payouts = await prisma.timeVaultPayload.findMany({
            where: {
                workspaceId: workspace.id,
                status: { in: ['Completed', 'Settled', 'COMPLETED'] },
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
            },
            orderBy: { createdAt: 'asc' },
        });

        if (format === 'xero') {
            return generateXeroCSV(payouts, workspace.name);
        }
        if (format === 'quickbooks') {
            return generateQuickBooksIIF(payouts, workspace.name);
        }

        // Default: generic CSV
        return generateGenericCSV(payouts, workspace.name);

    } catch (error: any) {
        console.error('[AccountingSync] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function generateXeroCSV(payouts: any[], workspaceName: string) {
    // Xero CSV format: https://central.xero.com/s/article/Import-a-bank-statement
    const headers = '*Date,*Amount,Payee,Description,Reference,Cheque Number';
    const rows = payouts.map(p => {
        const date = p.createdAt.toISOString().split('T')[0];
        const amount = -(p.amount || 0); // Negative = payment out
        const payee = p.name || 'Unknown';
        const desc = `${p.token || 'AlphaUSD'} payment via Agentic Finance${p.isShielded ? ' (ZK Shielded)' : ''}`;
        const ref = p.zkCommitment ? p.zkCommitment.slice(0, 16) : '';
        return `${date},${amount},"${payee}","${desc}","${ref}",`;
    });

    const csv = [headers, ...rows].join('\n');
    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="xero-${workspaceName}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
    });
}

function generateQuickBooksIIF(payouts: any[], workspaceName: string) {
    // QuickBooks IIF format for journal entries
    const lines = ['!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
                   '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
                   '!ENDTRNS'];

    for (const p of payouts) {
        const date = `${p.createdAt.getMonth() + 1}/${p.createdAt.getDate()}/${p.createdAt.getFullYear()}`;
        const amount = p.amount || 0;
        const name = p.name || 'Contractor';
        const memo = `${p.token || 'AlphaUSD'} - Agentic Finance${p.isShielded ? ' (ZK)' : ''}`;

        lines.push(`TRNS\tCHECK\t${date}\tCrypto Payments\t${name}\t-${amount}\t${memo}`);
        lines.push(`SPL\tCHECK\t${date}\tPayroll Expense\t${name}\t${amount}\t${memo}`);
        lines.push('ENDTRNS');
    }

    const iif = lines.join('\n');
    return new NextResponse(iif, {
        headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="quickbooks-${workspaceName}-${new Date().toISOString().split('T')[0]}.iif"`,
        },
    });
}

function generateGenericCSV(payouts: any[], workspaceName: string) {
    const headers = 'Date,Type,Recipient,Wallet,Amount,Token,Shielded,Category,Note';
    const rows = payouts.map(p => {
        const date = p.createdAt.toISOString().split('T')[0];
        return `${date},Payment,"${p.name || 'Unknown'}",${p.recipientWallet},${p.amount || 0},${p.token || 'AlphaUSD'},${p.isShielded ? 'Yes' : 'No'},Payroll,"${(p.note || '').replace(/"/g, '""')}"`;
    });

    const csv = [headers, ...rows].join('\n');
    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="payroll-${workspaceName}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
    });
}
