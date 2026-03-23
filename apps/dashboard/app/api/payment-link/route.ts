import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment-link — Create a new payment link
 * GET  /api/payment-link?id=xxx — Get link details by shortId
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { creatorWallet, amount, token, note, recipientWallet, recipientName, maxUses, expiresInDays } = body;

        if (!creatorWallet || !recipientWallet) {
            return NextResponse.json({ error: 'creatorWallet and recipientWallet required' }, { status: 400 });
        }

        const shortId = crypto.randomUUID().slice(0, 8);

        const link = await prisma.paymentLink.create({
            data: {
                shortId,
                creatorWallet,
                amount: amount ? parseFloat(amount) : null,
                token: token || 'AlphaUSD',
                note: note || null,
                recipientWallet,
                recipientName: recipientName || null,
                maxUses: maxUses || 0,
                expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
            },
        });

        return NextResponse.json({
            success: true,
            link,
            url: `/pay/${shortId}`,
        });
    } catch (error: any) {
        console.error('[PaymentLink] Create error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const wallet = searchParams.get('wallet');

        if (id) {
            const link = await prisma.paymentLink.findUnique({ where: { shortId: id } });
            if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
            return NextResponse.json({ success: true, link });
        }

        if (wallet) {
            const links = await prisma.paymentLink.findMany({
                where: { creatorWallet: { equals: wallet, mode: 'insensitive' } },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
            return NextResponse.json({ success: true, links });
        }

        return NextResponse.json({ error: 'id or wallet param required' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
