import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet')?.trim();
        if (!wallet) return NextResponse.json({ error: "Missing wallet parameter" }, { status: 400 });

        const workspace = await prisma.workspace.findFirst({
            where: {
                adminWallet: { equals: wallet, mode: 'insensitive' },
            },
        });

        // Map to legacy format for frontend compatibility
        const mapped = workspace ? {
            admin_wallet: workspace.adminWallet,
            name: workspace.name,
            type: workspace.type,
            created_at: workspace.createdAt,
        } : null;

        return NextResponse.json({ workspace: mapped });
    } catch (error: any) {
        return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { adminWallet, name, type } = await req.json();
        const cleanWallet = adminWallet.trim().toLowerCase();
        const cleanName = name.trim();

        // 1. Check if wallet already owns a workspace
        const existingWallet = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: cleanWallet, mode: 'insensitive' } },
        });
        if (existingWallet) {
            return NextResponse.json({ error: "This wallet is already bound to a workspace." }, { status: 403 });
        }

        // 2. Check unique name
        const existingName = await prisma.workspace.findFirst({
            where: { name: { equals: cleanName, mode: 'insensitive' } },
        });
        if (existingName) {
            return NextResponse.json({ error: "Workspace name is already taken! Please use the 'Join Workspace' option." }, { status: 403 });
        }

        // 3. Create workspace
        const workspace = await prisma.workspace.create({
            data: {
                adminWallet: cleanWallet,
                name: cleanName,
                type: type || null,
            },
        });

        return NextResponse.json({
            success: true,
            workspace: {
                admin_wallet: workspace.adminWallet,
                name: workspace.name,
                type: workspace.type,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
