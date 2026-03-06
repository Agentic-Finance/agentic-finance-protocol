import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { notify } from '../../lib/notify';

export async function POST(request: Request) {
    try {
        const { hash, amount, token, employeeIds } = await request.json();

        // 1. Mark employees as Paid
        await prisma.employee.updateMany({
            where: { id: { in: employeeIds } },
            data: { status: 'Paid' },
        });

        // 2. Record payout in permanent history
        await prisma.payoutRecord.create({
            data: {
                recipient: employeeIds.join(','),
                amount: parseFloat(amount),
                token: token || 'AlphaUSD',
                txHash: hash,
            },
        });

        // Notify about payout — use first employee's wallet or a generic approach
        const employees = await prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { walletAddress: true },
        });
        const firstWallet = employees[0]?.walletAddress;
        if (firstWallet) {
            notify({
                wallet: firstWallet,
                type: 'payroll:recorded',
                title: 'Payout Recorded',
                message: `${amount} ${token || 'AlphaUSD'} sent to ${employeeIds.length} employee(s) \u2014 TX: ${(hash || '').slice(0, 10)}...`,
            }).catch(() => {});
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Database Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
