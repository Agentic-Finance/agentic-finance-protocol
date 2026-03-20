import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { requireDaemonAuth, requireWalletAuth } from '@/app/lib/api-auth';

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

// PUT: Update daemon status (daemon secret OR admin wallet)
export async function PUT(req: NextRequest) {
    // Accept daemon secret auth (daemon→dashboard) OR wallet auth (admin UI)
    const daemonAuth = requireDaemonAuth(req);
    const walletAuth = requireWalletAuth(req);

    if (!daemonAuth.valid && !walletAuth.valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

        // If wallet auth, verify caller is the workspace admin
        if (!daemonAuth.valid && walletAuth.valid) {
            if (walletAuth.wallet?.toLowerCase() !== workspace.adminWallet.toLowerCase()) {
                return NextResponse.json({ error: 'Only workspace admin can toggle daemon' }, { status: 403 });
            }
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
    } catch (error: any) {
        console.error('[daemon-status] PUT error:', error?.message || error);
        return NextResponse.json({ error: 'Failed to update daemon status', detail: error?.message }, { status: 500 });
    }
}
