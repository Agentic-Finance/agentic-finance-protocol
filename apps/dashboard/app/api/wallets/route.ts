import { apiSuccess, logAndReturn } from "@/app/lib/api-response";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/wallets
 * Returns all embedded wallets + summary stats
 */
export async function GET() {
    try {
        const wallets = await prisma.embeddedWallet.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                label: true,
                ownerType: true,
                ownerId: true,
                address: true,
                balance: true,
                isActive: true,
                createdAt: true,
                lastUsedAt: true,
                // Exclude encryptedKey, iv, authTag for security
            },
        });

        const agentWallets = wallets.filter((w) => w.ownerType === 'agent');
        const employeeWallets = wallets.filter((w) => w.ownerType === 'employee');
        const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

        return apiSuccess({
            wallets,
            summary: {
                totalWallets: wallets.length,
                agentWallets: agentWallets.length,
                employeeWallets: employeeWallets.length,
                totalBalance: Math.round(totalBalance * 100) / 100,
                activeWallets: wallets.filter((w) => w.isActive).length,
            },
        });
    } catch (error: any) {
        return logAndReturn("WALLETS_GET", error, "Failed to fetch wallets");
    }
}
