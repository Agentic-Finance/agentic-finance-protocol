/**
 * SSE (Server-Sent Events) endpoint for real-time daemon status.
 * Replaces 15s polling with instant push notifications.
 *
 * Usage: const eventSource = new EventSource('/api/daemon-status/stream?wallet=0x...');
 *        eventSource.onmessage = (e) => { const data = JSON.parse(e.data); ... };
 */

import { NextRequest } from 'next/server';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const wallet = req.nextUrl.searchParams.get('wallet');

    if (!wallet) {
        return new Response('Missing wallet parameter', { status: 400 });
    }

    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch {
                    closed = true;
                }
            };

            // Send initial state
            try {
                const workspace = await prisma.workspace.findFirst({
                    where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
                    select: { daemonStatus: true, daemonLastSeen: true },
                });
                send({
                    type: 'status',
                    daemonStatus: workspace?.daemonStatus || 'OFFLINE',
                    daemonLastSeen: workspace?.daemonLastSeen,
                    timestamp: new Date().toISOString(),
                });
            } catch {
                send({ type: 'error', message: 'Failed to fetch initial status' });
            }

            // Poll DB every 5s and push changes (much better than client polling)
            let lastStatus = '';
            const interval = setInterval(async () => {
                if (closed) {
                    clearInterval(interval);
                    return;
                }
                try {
                    const workspace = await prisma.workspace.findFirst({
                        where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
                        select: { daemonStatus: true, daemonLastSeen: true },
                    });
                    const currentStatus = workspace?.daemonStatus || 'OFFLINE';
                    if (currentStatus !== lastStatus) {
                        lastStatus = currentStatus;
                        send({
                            type: 'status',
                            daemonStatus: currentStatus,
                            daemonLastSeen: workspace?.daemonLastSeen,
                            timestamp: new Date().toISOString(),
                        });
                    }
                    // Send heartbeat every poll to keep connection alive
                    send({ type: 'heartbeat', timestamp: new Date().toISOString() });
                } catch {
                    // Silently continue on transient DB errors
                }
            }, 5000);

            // Cleanup on close
            req.signal.addEventListener('abort', () => {
                closed = true;
                clearInterval(interval);
                try { controller.close(); } catch { /* already closed */ }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}
