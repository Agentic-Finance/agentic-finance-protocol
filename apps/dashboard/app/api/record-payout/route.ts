import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Database Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
