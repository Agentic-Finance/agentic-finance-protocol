import { NextRequest } from 'next/server';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return new Response('Missing wallet parameter', { status: 400 });
  }

  const walletLower = wallet.toLowerCase();
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(': heartbeat\n\n'));

      const poll = async () => {
        if (closed) return;
        try {
          const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
              where: { wallet: walletLower, isRead: false },
              orderBy: { createdAt: 'desc' },
              take: 10,
            }),
            prisma.notification.count({
              where: { wallet: walletLower, isRead: false },
            }),
          ]);

          if (!closed) {
            const data = JSON.stringify({ notifications, unreadCount });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (err) {
          console.error('[SSE notifications] poll error:', err);
        }

        if (!closed) {
          setTimeout(poll, 5000);
        }
      };

      poll();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
