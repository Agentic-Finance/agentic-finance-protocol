import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// GET: List employees for a workspace
export async function GET(req: NextRequest) {
    try {
        const wallet = req.nextUrl.searchParams.get('wallet')?.trim();
        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Missing wallet parameter' }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
        });

        if (!workspace) {
            return NextResponse.json({ success: true, employees: [] });
        }

        const employees = await prisma.employee.findMany({
            where: { workspaceId: workspace.id, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, employees });
    } catch (error) {
        console.error('[employee-directory] GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch employees' }, { status: 500 });
    }
}

// POST: Add employees to directory
export async function POST(req: NextRequest) {
    try {
        const wallet = req.headers.get('x-wallet-address') || req.headers.get('X-Wallet-Address');
        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Missing wallet header' }, { status: 401 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
        });

        if (!workspace) {
            return NextResponse.json({ success: false, error: 'Workspace not found' }, { status: 404 });
        }

        const body = await req.json();
        const entries = Array.isArray(body.employees) ? body.employees : [body];

        const created: any[] = [];
        for (const emp of entries) {
            if (!emp.walletAddress || !emp.name) continue;

            // Check if employee with same wallet already exists in this workspace
            const existing = await prisma.employee.findFirst({
                where: {
                    workspaceId: workspace.id,
                    walletAddress: { equals: emp.walletAddress, mode: 'insensitive' },
                    deletedAt: null,
                },
            });

            if (existing) {
                // Update existing entry
                const updated = await prisma.employee.update({
                    where: { id: existing.id },
                    data: {
                        name: emp.name || existing.name,
                        amount: emp.amount ?? existing.amount,
                        token: emp.token || existing.token,
                        note: emp.note ?? existing.note,
                        status: 'Active',
                    },
                });
                created.push(updated);
            } else {
                // Create new
                const newEmp = await prisma.employee.create({
                    data: {
                        workspaceId: workspace.id,
                        name: emp.name,
                        walletAddress: emp.walletAddress,
                        amount: emp.amount || 0,
                        token: emp.token || 'AlphaUSD',
                        note: emp.note || null,
                        status: 'Active',
                    },
                });
                created.push(newEmp);
            }
        }

        return NextResponse.json({ success: true, employees: created, count: created.length });
    } catch (error) {
        console.error('[employee-directory] POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to add employees' }, { status: 500 });
    }
}

// PUT: Update an employee
export async function PUT(req: NextRequest) {
    try {
        const wallet = req.headers.get('x-wallet-address') || req.headers.get('X-Wallet-Address');
        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Missing wallet header' }, { status: 401 });
        }

        const body = await req.json();
        const { id, name, amount, token, note } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing employee ID' }, { status: 400 });
        }

        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) {
            return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
        }

        const updated = await prisma.employee.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(amount !== undefined && { amount }),
                ...(token !== undefined && { token }),
                ...(note !== undefined && { note }),
            },
        });

        return NextResponse.json({ success: true, employee: updated });
    } catch (error) {
        console.error('[employee-directory] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update employee' }, { status: 500 });
    }
}

// DELETE: Soft-delete an employee
export async function DELETE(req: NextRequest) {
    try {
        const wallet = req.headers.get('x-wallet-address') || req.headers.get('X-Wallet-Address');
        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Missing wallet header' }, { status: 401 });
        }

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing employee ID' }, { status: 400 });
        }

        await prisma.employee.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[employee-directory] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete employee' }, { status: 500 });
    }
}
