import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { requireWalletAuth } from '../../lib/api-auth';
import { payrollLimiter, getClientId } from '../../lib/rate-limit';

export async function POST(request: Request) {
    const auth = requireWalletAuth(request);
    if (!auth.valid) return auth.response!;
    const rateCheck = payrollLimiter.check(getClientId(request));
    if (!rateCheck.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing employee ID" }, { status: 400 });
        }

        try {
            // Soft delete: set deletedAt instead of hard delete
            await prisma.employee.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        } catch (err: any) {
            // If record not found, treat as success (idempotent delete)
            if (err?.code === 'P2025' || err?.message?.includes('Record to update not found')) {
                return NextResponse.json({ success: true });
            }
            throw err;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Database Delete Error:", error);
        return NextResponse.json({
            error: error.message || "Failed to delete employee"
        }, { status: 500 });
    }
}
