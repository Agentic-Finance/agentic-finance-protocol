import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { generateWallet } from '../../../lib/wallet-crypto';
import { notify } from '../../../lib/notify';
import { requireWalletAuth } from '../../../lib/api-auth';
import { keyLimiter, getClientId } from '../../../lib/rate-limit';

/**
 * POST /api/wallets/generate
 * Generates a new embedded wallet with AES-256-GCM encrypted private key
 * Body: { label: string, ownerType: "agent" | "employee", ownerId?: string }
 */
export async function POST(request: Request) {
    const auth = requireWalletAuth(request);
    if (!auth.valid) return auth.response!;
    const rateCheck = keyLimiter.check(getClientId(request));
    if (!rateCheck.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

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

        // Notify about new wallet
        notify({
            wallet: address,
            type: 'wallet:generated',
            title: 'Wallet Generated',
            message: `New embedded wallet: ${address.slice(0, 10)}... \u2014 Label: ${label}`,
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            wallet,
        });
    } catch (error: any) {
        console.error('Generate wallet error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
