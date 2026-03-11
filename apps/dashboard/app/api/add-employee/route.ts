import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { isValidAddress, safeParseFloat, apiSuccess, apiError, logAndReturn } from '../../lib/api-response';
import { payrollLimiter, getClientId } from '../../lib/rate-limit';
import { requireWalletAuth } from '../../lib/api-auth';

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

        const errors: string[] = [];
        const validPayloads: Array<{ name: string; walletAddress: string; amount: number; token: string; note: string; status: string }> = [];

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

            validPayloads.push({
                name: payload.name || 'Anonymous',
                walletAddress: payload.wallet,
                amount,
                token: payload.token || 'AlphaUSD',
                note: payload.note || '',
                status: 'Awaiting_Approval',
            });
        }

        await prisma.$transaction(validPayloads.map(p => prisma.employee.create({ data: p })));

        return NextResponse.json({
            success: true,
            count: validPayloads.length,
            ...(errors.length > 0 ? { warnings: errors } : {}),
        });
    } catch (error: any) {
        return logAndReturn('ADD_EMPLOYEE', error, 'Failed to add employee(s)');
    }
}

export async function GET() {
    try {
        const allEmployees = await prisma.employee.findMany({
            where: { status: { in: ['Awaiting_Approval', 'Pending', 'Vaulted'] } },
            orderBy: { createdAt: 'desc' },
        });

        // Group by status in JS
        const awaiting = allEmployees.filter((e: any) => e.status === 'Awaiting_Approval');
        const pending = allEmployees.filter((e: any) => e.status === 'Pending');
        const vaulted = allEmployees.filter((e: any) => e.status === 'Vaulted');

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
    const auth = requireWalletAuth(req);
    if (!auth.valid) return auth.response!;
    const rateCheck = payrollLimiter.check(getClientId(req));
    if (!rateCheck.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

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
