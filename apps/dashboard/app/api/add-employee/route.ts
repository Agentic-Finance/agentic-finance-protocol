import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const payloads = Array.isArray(body) ? body : [body];
        let insertedCount = 0;

        for (const payload of payloads) {
            if (!payload.wallet || !payload.amount) continue;

            await prisma.employee.create({
                data: {
                    name: payload.name || 'Anonymous',
                    walletAddress: payload.wallet,
                    amount: parseFloat(payload.amount),
                    token: 'AlphaUSD',
                    note: payload.note || '',
                    status: 'Awaiting_Approval',
                },
            });
            insertedCount++;
        }

        return NextResponse.json({ success: true, count: insertedCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const awaiting = await prisma.employee.findMany({
            where: { status: 'Awaiting_Approval' },
            orderBy: { createdAt: 'desc' },
        });
        const pending = await prisma.employee.findMany({
            where: { status: 'Pending' },
            orderBy: { createdAt: 'desc' },
        });
        const vaulted = await prisma.employee.findMany({
            where: { status: 'Vaulted' },
            orderBy: { createdAt: 'desc' },
        });

        // Map walletAddress → address for frontend compatibility
        const mapEmployee = (e: any) => ({
            ...e,
            address: e.walletAddress,
            wallet_address: e.walletAddress,
        });

        return NextResponse.json({
            awaiting: awaiting.map(mapEmployee),
            pending: pending.map(mapEmployee),
            vaulted: vaulted.map(mapEmployee),
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { action } = await req.json();

        if (action === 'cancel_vault') {
            await prisma.employee.updateMany({
                where: { status: 'Vaulted' },
                data: { status: 'Cancel_Requested' },
            });
        } else if (action === 'approve') {
            await prisma.employee.updateMany({
                where: { status: 'Awaiting_Approval' },
                data: { status: 'Pending' },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
}
