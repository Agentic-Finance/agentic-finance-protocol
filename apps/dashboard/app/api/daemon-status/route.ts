import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch daemon status for a workspace
export async function GET(req: NextRequest) {
    try {
        const wallet = req.nextUrl.searchParams.get('wallet');
        if (!wallet) {
            return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
            select: { daemonStatus: true, daemonLastSeen: true },
        });

        if (!workspace) {
            return NextResponse.json({ daemonStatus: 'OFFLINE', daemonLastSeen: null });
        }

        return NextResponse.json({
            daemonStatus: workspace.daemonStatus || 'OFFLINE',
            daemonLastSeen: workspace.daemonLastSeen,
        });
    } catch (error) {
        console.error('[daemon-status] GET error:', error);
        return NextResponse.json({ daemonStatus: 'OFFLINE', daemonLastSeen: null });
    }
}

// PUT: Update daemon status (admin only)
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { wallet, status } = body;

        if (!wallet || !status) {
            return NextResponse.json({ error: 'Missing wallet or status' }, { status: 400 });
        }

        const validStatuses = ['ACTIVE', 'OFFLINE', 'PROCESSING', 'ERROR'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        const updated = await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                daemonStatus: status,
                daemonLastSeen: new Date(),
            },
        });

        return NextResponse.json({
            daemonStatus: updated.daemonStatus,
            daemonLastSeen: updated.daemonLastSeen,
        });
    } catch (error) {
        console.error('[daemon-status] PUT error:', error);
        return NextResponse.json({ error: 'Failed to update daemon status' }, { status: 500 });
    }
}
