import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/chat/channels?wallet=0x...
export async function GET(req: NextRequest) {
    const wallet = req.nextUrl.searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });

    try {
        const channels = await prisma.chatChannel.findMany({
            where: {
                isArchived: false,
                participants: { some: { wallet: wallet.toLowerCase() } },
            },
            include: {
                participants: true,
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: { lastMessageAt: 'desc' },
        });

        // Compute unread counts per channel
        const result = channels.map(ch => {
            const myParticipant = ch.participants.find(p => p.wallet === wallet.toLowerCase());
            const lastRead = myParticipant?.lastReadAt || new Date(0);
            const lastMsg = ch.messages[0] || null;

            // For DMs, use the other participant's name
            let displayName = ch.name;
            let displayAvatar = ch.avatarUrl;
            if (ch.type === 'dm') {
                const other = ch.participants.find(p => p.wallet !== wallet.toLowerCase());
                displayName = other?.displayName || `${other?.wallet.slice(0, 6)}...${other?.wallet.slice(-4)}`;
            }

            return {
                id: ch.id,
                type: ch.type,
                name: displayName,
                avatarUrl: displayAvatar,
                agentId: ch.agentId,
                jobId: ch.jobId,
                participants: ch.participants.map(p => ({
                    wallet: p.wallet,
                    displayName: p.displayName,
                    role: p.role,
                })),
                lastMessage: lastMsg ? {
                    content: lastMsg.isDeleted ? 'Message deleted' : lastMsg.content,
                    senderWallet: lastMsg.senderWallet,
                    senderName: lastMsg.senderName,
                    createdAt: lastMsg.createdAt,
                    messageType: lastMsg.messageType,
                } : null,
                unreadCount: lastMsg && lastMsg.createdAt > lastRead && lastMsg.senderWallet !== wallet.toLowerCase() ? 1 : 0,
                isMuted: myParticipant?.isMuted || false,
                createdAt: ch.createdAt,
                lastMessageAt: ch.lastMessageAt,
            };
        });

        return NextResponse.json({ channels: result });
    } catch (error) {
        console.error('[Chat] Failed to fetch channels:', error);
        return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
    }
}

// POST /api/chat/channels — Create a new channel
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, name, createdBy, participants, agentId, jobId } = body;

        if (!createdBy || !participants || !Array.isArray(participants) || participants.length === 0) {
            return NextResponse.json({ error: 'createdBy and participants required' }, { status: 400 });
        }

        const normalizedCreator = createdBy.toLowerCase();
        const normalizedParticipants = participants.map((p: any) => ({
            wallet: (p.wallet || p).toLowerCase(),
            displayName: p.displayName || null,
            role: p.role || 'member',
        }));

        // Ensure creator is in participants
        if (!normalizedParticipants.some((p: any) => p.wallet === normalizedCreator)) {
            normalizedParticipants.unshift({ wallet: normalizedCreator, displayName: null, role: 'owner' });
        }

        // For DMs, check if channel already exists between these two users
        if (type === 'dm' && normalizedParticipants.length === 2) {
            const existingChannel = await prisma.chatChannel.findFirst({
                where: {
                    type: 'dm',
                    isArchived: false,
                    AND: normalizedParticipants.map((p: any) => ({
                        participants: { some: { wallet: p.wallet } },
                    })),
                },
                include: {
                    participants: true,
                    messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
            });

            if (existingChannel) {
                return NextResponse.json({ channel: existingChannel, existing: true });
            }
        }

        const channel = await prisma.chatChannel.create({
            data: {
                type: type || 'dm',
                name: name || null,
                agentId: agentId || null,
                jobId: jobId || null,
                createdBy: normalizedCreator,
                participants: {
                    create: normalizedParticipants.map((p: any) => ({
                        wallet: p.wallet,
                        displayName: p.displayName,
                        role: p.wallet === normalizedCreator ? 'owner' : (p.role || 'member'),
                    })),
                },
            },
            include: { participants: true },
        });

        return NextResponse.json({ channel }, { status: 201 });
    } catch (error) {
        console.error('[Chat] Failed to create channel:', error);
        return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
    }
}
