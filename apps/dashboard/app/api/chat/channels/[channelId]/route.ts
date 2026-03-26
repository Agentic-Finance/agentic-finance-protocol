import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// GET /api/chat/channels/[channelId] — Get channel details
export async function GET(req: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
    const { channelId } = await params;

    try {
        const channel = await prisma.chatChannel.findUnique({
            where: { id: channelId },
            include: {
                participants: true,
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });

        if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
        return NextResponse.json({ channel });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to get channel' }, { status: 500 });
    }
}

// PUT /api/chat/channels/[channelId] — Update channel (name, avatar, description)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
    const { channelId } = await params;

    try {
        const body = await req.json();
        const { name, avatarUrl, description, wallet, action } = body;

        // Verify caller is participant
        const participant = await prisma.chatParticipant.findFirst({
            where: { channelId, wallet: wallet?.toLowerCase() },
        });

        if (!participant) {
            return NextResponse.json({ error: 'Not a member of this channel' }, { status: 403 });
        }

        // Action: invite member
        if (action === 'invite' && body.inviteWallet) {
            const existing = await prisma.chatParticipant.findFirst({
                where: { channelId, wallet: body.inviteWallet.toLowerCase() },
            });
            if (existing) {
                return NextResponse.json({ error: 'Already a member' }, { status: 400 });
            }

            await prisma.chatParticipant.create({
                data: {
                    channelId,
                    wallet: body.inviteWallet.toLowerCase(),
                    displayName: body.inviteDisplayName || null,
                    role: 'member',
                },
            });

            // System message
            await prisma.chatMessage.create({
                data: {
                    channelId,
                    senderWallet: 'system',
                    senderName: 'System',
                    content: `${body.inviteDisplayName || body.inviteWallet.slice(0, 8) + '...'} was invited to the group`,
                    messageType: 'system',
                },
            });

            return NextResponse.json({ success: true, action: 'invited' });
        }

        // Action: kick member
        if (action === 'kick' && body.kickWallet) {
            if (participant.role !== 'owner') {
                return NextResponse.json({ error: 'Only owner can kick members' }, { status: 403 });
            }

            await prisma.chatParticipant.deleteMany({
                where: { channelId, wallet: body.kickWallet.toLowerCase() },
            });

            await prisma.chatMessage.create({
                data: {
                    channelId,
                    senderWallet: 'system',
                    senderName: 'System',
                    content: `${body.kickWallet.slice(0, 8)}... was removed from the group`,
                    messageType: 'system',
                },
            });

            return NextResponse.json({ success: true, action: 'kicked' });
        }

        // Action: leave
        if (action === 'leave') {
            await prisma.chatParticipant.deleteMany({
                where: { channelId, wallet: wallet.toLowerCase() },
            });

            await prisma.chatMessage.create({
                data: {
                    channelId,
                    senderWallet: 'system',
                    senderName: 'System',
                    content: `${wallet.slice(0, 8)}... left the group`,
                    messageType: 'system',
                },
            });

            return NextResponse.json({ success: true, action: 'left' });
        }

        // Update channel settings
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (description !== undefined) updateData.description = description;

        if (Object.keys(updateData).length > 0) {
            await prisma.chatChannel.update({
                where: { id: channelId },
                data: updateData,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Chat] Channel update error:', error);
        return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
    }
}

// DELETE /api/chat/channels/[channelId] — Delete/archive channel
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
    const { channelId } = await params;
    const wallet = req.nextUrl.searchParams.get('wallet');

    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });

    try {
        const participant = await prisma.chatParticipant.findFirst({
            where: { channelId, wallet: wallet.toLowerCase(), role: 'owner' },
        });

        if (!participant) {
            return NextResponse.json({ error: 'Only owner can delete channel' }, { status: 403 });
        }

        await prisma.chatChannel.update({
            where: { id: channelId },
            data: { isArchived: true },
        });

        return NextResponse.json({ success: true, action: 'archived' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
    }
}
