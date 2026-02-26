import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateWallet } from '../../../lib/wallet-crypto';

const prisma = new PrismaClient();

/**
 * POST /api/wallets/generate
 * Generates a new embedded wallet with AES-256-GCM encrypted private key
 * Body: { label: string, ownerType: "agent" | "employee", ownerId?: string }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { label, ownerType, ownerId } = body;

        if (!label || !ownerType) {
            return NextResponse.json(
                { error: 'label and ownerType are required' },
                { status: 400 }
            );
        }

        if (!['agent', 'employee'].includes(ownerType)) {
            return NextResponse.json(
                { error: 'ownerType must be "agent" or "employee"' },
                { status: 400 }
            );
        }

        // Generate wallet with encrypted private key
        const { address, encryptedKey, iv, authTag } = await generateWallet();

        // Store in database
        const wallet = await prisma.embeddedWallet.create({
            data: {
                label,
                ownerType,
                ownerId: ownerId || null,
                address,
                encryptedKey,
                iv,
                authTag,
                balance: 0,
                isActive: true,
            },
            select: {
                id: true,
                label: true,
                ownerType: true,
                address: true,
                balance: true,
                isActive: true,
                createdAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            wallet,
        });
    } catch (error: any) {
        console.error('Generate wallet error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
