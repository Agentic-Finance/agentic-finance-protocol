import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            where: { status: 'Pending' },
            orderBy: { createdAt: 'desc' },
        });

        // Map walletAddress → address for frontend compatibility
        const formattedEmployees = employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            address: emp.walletAddress,
            amount: emp.amount,
            token: emp.token || 'AlphaUSD',
            status: emp.status,
        }));

        return NextResponse.json(formattedEmployees);
    } catch (error) {
        console.error("Database Error:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
