import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment-request — Create payment request
 * GET  /api/payment-request?wallet=0x... — Get requests for/from a wallet
 * PUT  /api/payment-request — Update request status (pay/decline)
 */
export async function POST(req: Request) {
    try {
        const { fromWallet, toWallet, amount, token, note, expiresInDays } = await req.json();

        if (!fromWallet || !toWallet || !amount) {
            return NextResponse.json({ error: 'fromWallet, toWallet, and amount required' }, { status: 400 });
        }

        if (!/^0x[a-fA-F0-9]{40}$/i.test(toWallet)) {
            return NextResponse.json({ error: 'Invalid toWallet address' }, { status: 400 });
        }

        const request = await prisma.paymentRequest.create({
            data: {
                fromWallet,
                toWallet,
                amount: parseFloat(amount),
                token: token || 'AlphaUSD',
                note: note || null,
                expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
            },
        });

        // Send notification to the payer
        try {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: toWallet,
                    type: 'payment_request',
                    title: 'Payment Request',
                    message: `${fromWallet.slice(0, 8)}... requested ${amount} ${token || 'AlphaUSD'}${note ? ': ' + note : ''}`,
                    data: { requestId: request.id },
                }),
            });
        } catch {} // Notification failure shouldn't block request creation

        console.log(`📩 [PaymentRequest] ${fromWallet.slice(0, 8)} → ${toWallet.slice(0, 8)}: ${amount} ${token || 'AlphaUSD'}`);

        return NextResponse.json({ success: true, request });
    } catch (error: any) {
        console.error('[PaymentRequest] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet');
        const direction = searchParams.get('direction') || 'all'; // 'incoming', 'outgoing', 'all'

        if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });

        const where: any = {};
        if (direction === 'incoming') {
            where.toWallet = { equals: wallet, mode: 'insensitive' };
        } else if (direction === 'outgoing') {
            where.fromWallet = { equals: wallet, mode: 'insensitive' };
        } else {
            where.OR = [
                { toWallet: { equals: wallet, mode: 'insensitive' } },
                { fromWallet: { equals: wallet, mode: 'insensitive' } },
            ];
        }

        const requests = await prisma.paymentRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return NextResponse.json({ success: true, requests });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { id, action, txHash } = await req.json();

        if (!id || !action) {
            return NextResponse.json({ error: 'id and action required' }, { status: 400 });
        }

        if (action === 'pay') {
            await prisma.paymentRequest.update({
                where: { id },
                data: { status: 'paid', paidAt: new Date(), paidTxHash: txHash || null },
            });
            return NextResponse.json({ success: true, message: 'Payment request marked as paid' });
        }

        if (action === 'decline') {
            await prisma.paymentRequest.update({
                where: { id },
                data: { status: 'declined' },
            });
            return NextResponse.json({ success: true, message: 'Payment request declined' });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
