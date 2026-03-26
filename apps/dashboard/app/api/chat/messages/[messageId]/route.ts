import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// PUT /api/chat/messages/[messageId] — Message actions (react, pin, delete, edit)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
    const { messageId } = await params;

    try {
        const body = await req.json();
        const { action, wallet, emoji, content } = body;

        const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

        // React
        if (action === 'react') {
            const currentMeta = (message.metadata as any) || {};
            const reactions = currentMeta.reactions || {};
            const emojiReactors = reactions[emoji] || [];

            if (emojiReactors.includes(wallet?.toLowerCase())) {
                // Remove reaction
                reactions[emoji] = emojiReactors.filter((w: string) => w !== wallet?.toLowerCase());
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                // Add reaction
                reactions[emoji] = [...emojiReactors, wallet?.toLowerCase()];
            }

            await prisma.chatMessage.update({
                where: { id: messageId },
                data: { metadata: { ...currentMeta, reactions } },
            });

            return NextResponse.json({ success: true, reactions });
        }

        // Pin/Unpin
        if (action === 'pin' || action === 'unpin') {
            const currentMeta = (message.metadata as any) || {};
            await prisma.chatMessage.update({
                where: { id: messageId },
                data: { metadata: { ...currentMeta, pinned: action === 'pin', pinnedBy: wallet, pinnedAt: new Date().toISOString() } },
            });

            // System message
            await prisma.chatMessage.create({
                data: {
                    channelId: message.channelId,
                    senderWallet: 'system',
                    senderName: 'System',
                    content: action === 'pin' ? `Message pinned` : `Message unpinned`,
                    messageType: 'system',
                },
            });

            return NextResponse.json({ success: true, action });
        }

        // Delete (soft)
        if (action === 'delete') {
            if (message.senderWallet.toLowerCase() !== wallet?.toLowerCase()) {
                return NextResponse.json({ error: 'Can only delete own messages' }, { status: 403 });
            }

            await prisma.chatMessage.update({
                where: { id: messageId },
                data: { isDeleted: true, content: 'This message was deleted' },
            });

            return NextResponse.json({ success: true, action: 'deleted' });
        }

        // Edit
        if (action === 'edit' && content) {
            if (message.senderWallet.toLowerCase() !== wallet?.toLowerCase()) {
                return NextResponse.json({ error: 'Can only edit own messages' }, { status: 403 });
            }

            await prisma.chatMessage.update({
                where: { id: messageId },
                data: { content, isEdited: true, editedAt: new Date() },
            });

            return NextResponse.json({ success: true, action: 'edited' });
        }

        // Forward
        if (action === 'forward' && body.targetChannelId) {
            await prisma.chatMessage.create({
                data: {
                    channelId: body.targetChannelId,
                    senderWallet: wallet?.toLowerCase() || '',
                    senderName: body.senderName || null,
                    content: `Forwarded: ${message.content}`,
                    messageType: 'text',
                    metadata: { forwarded: true, originalMessageId: messageId, originalChannelId: message.channelId },
                },
            });

            return NextResponse.json({ success: true, action: 'forwarded' });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('[Chat] Message action error:', error);
        return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
    }
}
