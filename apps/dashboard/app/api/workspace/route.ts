import { apiSuccess, apiError, logAndReturn } from "@/app/lib/api-response";
import prisma from '../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet')?.trim();
        const all = searchParams.get('all');

        // Admin mode: return all workspaces
        if (all === 'true') {
            const workspaces = await prisma.workspace.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
            return apiSuccess({
                workspaces: workspaces.map(ws => ({
                    id: ws.id,
                    admin_wallet: ws.adminWallet,
                    name: ws.name,
                    type: ws.type,
                    created_at: ws.createdAt,
                    daemonStatus: ws.daemonStatus || 'OFFLINE',
                })),
            });
        }

        if (!wallet) return apiError("Missing wallet parameter", 400);

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
            daemonStatus: workspace.daemonStatus || 'OFFLINE',
        } : null;

        return apiSuccess({ workspace: mapped });
    } catch (error: any) {
        return logAndReturn("WORKSPACE_GET", error, "Failed to fetch workspace");
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
            return apiError("This wallet is already bound to a workspace.", 403);
        }

        // 2. Check unique name
        const existingName = await prisma.workspace.findFirst({
            where: { name: { equals: cleanName, mode: 'insensitive' } },
        });
        if (existingName) {
            return apiError("Workspace name is already taken! Please choose a different name.", 403);
        }

        // 3. Create workspace
        const workspace = await prisma.workspace.create({
            data: {
                adminWallet: cleanWallet,
                name: cleanName,
                type: type || null,
            },
        });

        return apiSuccess({
            workspace: {
                admin_wallet: workspace.adminWallet,
                name: workspace.name,
                type: workspace.type,
            },
        });
    } catch (error: any) {
        return logAndReturn("WORKSPACE_POST", error, "Failed to create workspace");
    }
}
