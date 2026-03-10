import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { isValidAddress, safeParseFloat, apiSuccess, apiError, logAndReturn } from '../../lib/api-response';
import { payrollLimiter, getClientId } from '../../lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Max request body size: reject payloads with >100 employees */
const MAX_BATCH_SIZE = 100;

export async function POST(req: Request) {
    try {
        // Rate limit
        const clientId = getClientId(req);
        const limit = payrollLimiter.check(clientId);
        if (!limit.success) return apiError('Rate limit exceeded', 429);

        const body = await req.json();
        const payloads = Array.isArray(body) ? body : [body];

        // Validate batch size
        if (payloads.length > MAX_BATCH_SIZE) {
            return apiError(`Batch too large: ${payloads.length} employees (max ${MAX_BATCH_SIZE})`, 400);
        }

        let insertedCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < payloads.length; i++) {
            const payload = payloads[i];

            // Validate each payload
            if (!payload.wallet || !payload.amount) {
                errors.push(`Row ${i + 1}: Missing wallet or amount`);
                continue;
            }
            if (!isValidAddress(payload.wallet)) {
                errors.push(`Row ${i + 1}: Invalid wallet address format`);
                continue;
            }
            const amount = safeParseFloat(payload.amount);
            if (amount <= 0) {
                errors.push(`Row ${i + 1}: Invalid amount (must be > 0)`);
                continue;
            }

            await prisma.employee.create({
                data: {
                    name: payload.name || 'Anonymous',
                    walletAddress: payload.wallet,
                    amount,
                    token: payload.token || 'AlphaUSD',
                    note: payload.note || '',
                    status: 'Awaiting_Approval',
                },
            });
            insertedCount++;
        }

        return NextResponse.json({
            success: true,
            count: insertedCount,
            ...(errors.length > 0 ? { warnings: errors } : {}),
        });
    } catch (error: any) {
        return logAndReturn('ADD_EMPLOYEE', error, 'Failed to add employee(s)');
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
