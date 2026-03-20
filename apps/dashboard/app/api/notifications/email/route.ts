import { NextResponse } from 'next/server';
import { sendNotificationEmail, type NotificationType } from '@/app/lib/resend';

export const dynamic = 'force-dynamic';

/** POST: Send email notification */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { to, type, workspaceName, data } = body;

        if (!to || !type) {
            return NextResponse.json({ error: 'Missing to or type' }, { status: 400 });
        }

        const result = await sendNotificationEmail(to, {
            type: type as NotificationType,
            workspaceName: workspaceName || 'Agentic Finance',
            data: data || {},
        });

        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/** GET: Test endpoint */
export async function GET() {
    return NextResponse.json({
        success: true,
        configured: !!process.env.RESEND_API_KEY,
        supportedTypes: ['payout_completed', 'payout_failed', 'low_balance', 'workspace_created', 'employee_added', 'daemon_status'],
    });
}
