import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// SSE endpoint: GET /api/chat/messages/stream?wallet=0x...
// Streams new messages across all user's channels
export async function GET(req: NextRequest) {
    const wallet = req.nextUrl.searchParams.get('wallet');
    if (!wallet) {
        return new Response('wallet required', { status: 400 });
    }

    const normalizedWallet = wallet.toLowerCase();
    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                if (isClosed) return;
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch { isClosed = true; }
            };

            // Track last seen message timestamp per channel
            const lastSeen = new Map<string, Date>();

            // Initialize: get user's channels
            const participations = await prisma.chatParticipant.findMany({
                where: { wallet: normalizedWallet },
                select: { channelId: true },
            });
            const channelIds = participations.map(p => p.channelId);

            // Send initial connection confirmation
            send({ type: 'connected', channels: channelIds.length, timestamp: new Date().toISOString() });

            // Initialize last seen from existing latest messages
            for (const chId of channelIds) {
                const latest = await prisma.chatMessage.findFirst({
                    where: { channelId: chId },
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true },
                });
                if (latest) lastSeen.set(chId, latest.createdAt);
                else lastSeen.set(chId, new Date());
            }

            // Poll for new messages every 2 seconds
            let heartbeatCounter = 0;
            const interval = setInterval(async () => {
                if (isClosed) { clearInterval(interval); return; }

                try {
                    // Check for new channels (e.g., someone started a DM with us)
                    const currentParticipations = await prisma.chatParticipant.findMany({
                        where: { wallet: normalizedWallet },
                        select: { channelId: true },
                    });
                    const currentChannelIds = currentParticipations.map(p => p.channelId);

                    // Detect new channels
                    for (const chId of currentChannelIds) {
                        if (!channelIds.includes(chId)) {
                            channelIds.push(chId);
                            lastSeen.set(chId, new Date());

                            // Fetch and send the new channel details
                            const newChannel = await prisma.chatChannel.findUnique({
                                where: { id: chId },
                                include: { participants: true },
                            });
                            if (newChannel) {
                                send({ type: 'new_channel', channel: newChannel });
                            }
                        }
                    }

                    // Check for new messages in all channels
                    for (const chId of channelIds) {
                        const since = lastSeen.get(chId) || new Date(0);
                        const newMessages = await prisma.chatMessage.findMany({
                            where: {
                                channelId: chId,
                                createdAt: { gt: since },
                            },
                            orderBy: { createdAt: 'asc' },
                            take: 20,
                        });

                        for (const msg of newMessages) {
                            send({
                                type: 'new_message',
                                channelId: chId,
                                message: msg,
                            });
                            lastSeen.set(chId, msg.createdAt);
                        }
                    }

                    // Heartbeat every 15 seconds (every 7-8 polls)
                    heartbeatCounter++;
                    if (heartbeatCounter >= 7) {
                        heartbeatCounter = 0;
                        send({ type: 'heartbeat', timestamp: new Date().toISOString() });
                    }
                } catch (error) {
                    console.error('[Chat SSE] Poll error:', error);
                }
            }, 2000);

            // Cleanup on disconnect
            req.signal.addEventListener('abort', () => {
                isClosed = true;
                clearInterval(interval);
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
