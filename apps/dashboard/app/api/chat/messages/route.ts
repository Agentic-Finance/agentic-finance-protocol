import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/chat/messages?channelId=X&wallet=0x...&cursor=Y&limit=Z
export async function GET(req: NextRequest) {
    const channelId = req.nextUrl.searchParams.get('channelId');
    const wallet = req.nextUrl.searchParams.get('wallet');
    const cursor = req.nextUrl.searchParams.get('cursor');
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);

    if (!channelId || !wallet) {
        return NextResponse.json({ error: 'channelId and wallet required' }, { status: 400 });
    }

    try {
        // Verify user is a participant
        const participant = await prisma.chatParticipant.findUnique({
            where: { channelId_wallet: { channelId, wallet: wallet.toLowerCase() } },
        });
        if (!participant) {
            return NextResponse.json({ error: 'Not a participant of this channel' }, { status: 403 });
        }

        const messages = await prisma.chatMessage.findMany({
            where: { channelId },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = messages.length > limit;
        if (hasMore) messages.pop();

        // Mark as read
        await prisma.chatParticipant.update({
            where: { channelId_wallet: { channelId, wallet: wallet.toLowerCase() } },
            data: { lastReadAt: new Date() },
        });

        return NextResponse.json({
            messages: messages.reverse(), // Return chronological order
            hasMore,
            nextCursor: hasMore ? messages[0]?.id : null,
        });
    } catch (error) {
        console.error('[Chat] Failed to fetch messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// POST /api/chat/messages — Send a message
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { channelId, senderWallet, senderName, content, messageType, metadata, replyToId } = body;

        if (!channelId || !senderWallet || !content) {
            return NextResponse.json({ error: 'channelId, senderWallet, and content required' }, { status: 400 });
        }

        if (content.length > 5000) {
            return NextResponse.json({ error: 'Message too long (max 5000 chars)' }, { status: 413 });
        }

        const normalizedSender = senderWallet.toLowerCase();

        // Verify sender is a participant (skip for agent senders)
        if (!normalizedSender.startsWith('agent:')) {
            const participant = await prisma.chatParticipant.findUnique({
                where: { channelId_wallet: { channelId, wallet: normalizedSender } },
            });
            if (!participant) {
                return NextResponse.json({ error: 'Not a participant of this channel' }, { status: 403 });
            }
        }

        const [message] = await prisma.$transaction([
            prisma.chatMessage.create({
                data: {
                    channelId,
                    senderWallet: normalizedSender,
                    senderName: senderName || null,
                    content: content.trim(),
                    messageType: messageType || 'text',
                    metadata: metadata || undefined,
                    replyToId: replyToId || null,
                },
            }),
            prisma.chatChannel.update({
                where: { id: channelId },
                data: { lastMessageAt: new Date() },
            }),
            // Mark sender as having read up to now
            prisma.chatParticipant.updateMany({
                where: { channelId, wallet: normalizedSender },
                data: { lastReadAt: new Date() },
            }),
        ]);

        return NextResponse.json({ message }, { status: 201 });
    } catch (error) {
        console.error('[Chat] Failed to send message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

// PUT /api/chat/messages — Edit or delete a message
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { messageId, senderWallet, action, content } = body;

        if (!messageId || !senderWallet) {
            return NextResponse.json({ error: 'messageId and senderWallet required' }, { status: 400 });
        }

        const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        if (message.senderWallet !== senderWallet.toLowerCase()) {
            return NextResponse.json({ error: 'Cannot modify other user\'s message' }, { status: 403 });
        }

        if (action === 'delete') {
            const updated = await prisma.chatMessage.update({
                where: { id: messageId },
                data: { isDeleted: true, content: '' },
            });
            return NextResponse.json({ message: updated });
        }

        if (action === 'edit' && content) {
            const updated = await prisma.chatMessage.update({
                where: { id: messageId },
                data: { content: content.trim(), isEdited: true, editedAt: new Date() },
            });
            return NextResponse.json({ message: updated });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('[Chat] Failed to update message:', error);
        return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }
}
