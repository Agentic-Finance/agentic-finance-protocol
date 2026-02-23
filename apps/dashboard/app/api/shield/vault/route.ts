// apps/dashboard/paypol-frontend/app/api/shield/vault/route.ts
import { NextResponse } from 'next/server';
import prisma from "@/app/lib/prisma";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        let workspaceId = url.searchParams.get("workspaceId");

        // ⚡️ BUG FIX: Catch "default" sent by the frontend before workspace is fully loaded.
        // If the ID is missing or invalid, fallback to the first available workspace in DB.
        if (!workspaceId || workspaceId === "undefined" || workspaceId === "ws_boardroom_01" || workspaceId === "default") {
            const ws = await prisma.workspace.findFirst();
            if (ws) {
                workspaceId = ws.id;
            }
        }

        // If DB is completely empty, return empty array safely
        if (!workspaceId) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Fetch ALL Escrow payloads (both Vaulted and Settled)
        const vaults = await prisma.timeVaultPayload.findMany({
            where: { workspaceId: workspaceId },
            orderBy: { createdAt: 'desc' } // Sort by newest first
        });

        return NextResponse.json({ success: true, data: vaults });
    } catch (error: any) {
        console.error("❌ FETCH VAULT ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}