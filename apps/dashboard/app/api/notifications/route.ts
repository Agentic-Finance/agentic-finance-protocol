import { NextResponse } from 'next/server';
import { getNotifications, markAsRead } from '../../lib/notify';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications — Fetch notifications for a wallet
 *
 * Query: ?wallet=0x...&unreadOnly=true&limit=50&offset=0
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet')?.trim();
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!wallet) {
            return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
        }

        const result = await getNotifications(wallet, { unreadOnly, limit, offset });
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error('[api/notifications] GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/notifications — Mark notifications as read
 *
 * Body: { wallet: string, ids?: string[], markAllRead?: boolean }
 */
export async function PUT(req: Request) {
    try {
        const { wallet, ids, markAllRead } = await req.json();

        if (!wallet) {
            return NextResponse.json({ error: 'Missing wallet' }, { status: 400 });
        }

        const count = await markAsRead(wallet, markAllRead ? undefined : ids);
        return NextResponse.json({ success: true, markedRead: count });
    } catch (error: any) {
        console.error('[api/notifications] PUT error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
