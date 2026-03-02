// apps/dashboard/app/api/shield/vault/route.ts
import { apiSuccess, apiError } from "@/app/lib/api-response";
import prisma from "@/app/lib/prisma";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const vaultId = url.searchParams.get("id");

        // ─── Single vault lookup by ID (used by Shield page polling) ───
        if (vaultId) {
            const vault = await prisma.timeVaultPayload.findUnique({
                where: { id: vaultId },
            });
            if (!vault) {
                return apiError("Vault entry not found", 404);
            }
            return apiSuccess({ vault });
        }

        // ─── List all vaults for workspace ───
        let workspaceId = url.searchParams.get("workspaceId");

        if (!workspaceId || workspaceId === "undefined" || workspaceId === "ws_boardroom_01" || workspaceId === "default") {
            const ws = await prisma.workspace.findFirst();
            if (ws) {
                workspaceId = ws.id;
            }
        }

        if (!workspaceId) {
            return apiSuccess({ data: [] });
        }

        const vaults = await prisma.timeVaultPayload.findMany({
            where: { workspaceId: workspaceId },
            orderBy: { createdAt: 'desc' }
        });

        return apiSuccess({ data: vaults });
    } catch (error: any) {
        console.error("❌ FETCH VAULT ERROR:", error);
        return apiError("Failed to fetch vault data", 500);
    }
}