import { NextResponse } from 'next/server';
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

        return NextResponse.json({
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
        console.error('Wallets error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
