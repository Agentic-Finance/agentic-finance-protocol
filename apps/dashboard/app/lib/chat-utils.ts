/**
 * Chat Utilities — Server-side helpers for auto-creating channels and posting messages.
 * Used by marketplace routes to integrate agent jobs with the chat system.
 */

import prisma from './prisma';

interface CreateAgentChannelParams {
    jobId: string;
    agentId: string;
    agentName: string;
    clientWallet: string;
    agentWallet?: string;      // Agent's owner wallet (for real agents)
}

/**
 * Auto-create a chat channel when a job is created in the marketplace.
 * Returns the channel ID, or null if creation fails.
 * Skips silently if a channel already exists for this job.
 */
export async function createAgentChatChannel({
    jobId,
    agentId,
    agentName,
    clientWallet,
    agentWallet,
}: CreateAgentChannelParams): Promise<string | null> {
    try {
        // Check if channel already exists for this job
        const existing = await prisma.chatChannel.findFirst({
            where: { jobId, type: 'agent', isArchived: false },
        });
        if (existing) return existing.id;

        const normalizedClient = clientWallet.toLowerCase();
        const agentSender = `agent:${agentId}`;

        // Build participant list
        const participants: { wallet: string; displayName: string | null; role: string }[] = [
            { wallet: normalizedClient, displayName: null, role: 'owner' },
            { wallet: agentSender, displayName: agentName, role: 'agent' },
        ];

        // If agent has an owner wallet, add them as observer
        if (agentWallet && agentWallet.toLowerCase() !== normalizedClient) {
            participants.push({
                wallet: agentWallet.toLowerCase(),
                displayName: `${agentName} Owner`,
                role: 'observer',
            });
        }

        const channel = await prisma.chatChannel.create({
            data: {
                type: 'agent',
                name: agentName,
                agentId,
                jobId,
                createdBy: normalizedClient,
                participants: {
                    create: participants.map(p => ({
                        wallet: p.wallet,
                        displayName: p.displayName,
                        role: p.role,
                    })),
                },
            },
        });

        // Send a welcome system message
        await postChatMessage({
            channelId: channel.id,
            senderWallet: agentSender,
            senderName: agentName,
            content: `Hi! I'm ${agentName}. I've been assigned to your task. I'll post updates here as I work on it.`,
            messageType: 'system',
        });

        console.log(`[Chat] Auto-created agent channel ${channel.id} for job ${jobId.slice(0, 8)}`);
        return channel.id;
    } catch (error) {
        console.error('[Chat] Failed to auto-create agent channel:', error);
        return null;
    }
}

interface PostMessageParams {
    channelId: string;
    senderWallet: string;
    senderName?: string | null;
    content: string;
    messageType?: string;
    metadata?: Record<string, any>;
}

/**
 * Post a message to a chat channel (server-side).
 * Used by agents and system to post status updates.
 */
export async function postChatMessage({
    channelId,
    senderWallet,
    senderName,
    content,
    messageType = 'text',
    metadata,
}: PostMessageParams): Promise<string | null> {
    try {
        const [message] = await prisma.$transaction([
            prisma.chatMessage.create({
                data: {
                    channelId,
                    senderWallet: senderWallet.toLowerCase(),
                    senderName: senderName || null,
                    content: content.trim(),
                    messageType,
                    metadata: metadata || undefined,
                },
            }),
            prisma.chatChannel.update({
                where: { id: channelId },
                data: { lastMessageAt: new Date() },
            }),
        ]);
        return message.id;
    } catch (error) {
        console.error('[Chat] Failed to post message:', error);
        return null;
    }
}

/**
 * Post a job status update to the agent's chat channel.
 * Finds the channel by jobId and posts a system/agent_result message.
 */
export async function postJobUpdate({
    jobId,
    agentId,
    agentName,
    content,
    messageType = 'system',
    metadata,
}: {
    jobId: string;
    agentId: string;
    agentName: string;
    content: string;
    messageType?: string;
    metadata?: Record<string, any>;
}): Promise<void> {
    try {
        const channel = await prisma.chatChannel.findFirst({
            where: { jobId, type: 'agent', isArchived: false },
        });
        if (!channel) return;

        await postChatMessage({
            channelId: channel.id,
            senderWallet: `agent:${agentId}`,
            senderName: agentName,
            content,
            messageType,
            metadata,
        });
    } catch (error) {
        console.error('[Chat] Failed to post job update:', error);
    }
}

/**
 * Post a transaction card to a chat channel.
 * Creates a rich tx_link message with metadata for rendering.
 */
export async function postTransactionCard({
    channelId,
    senderWallet,
    senderName,
    amount,
    token,
    recipientWallet,
    txHash,
    status,
    note,
}: {
    channelId: string;
    senderWallet: string;
    senderName?: string;
    amount: number;
    token: string;
    recipientWallet: string;
    txHash?: string;
    status: 'pending' | 'confirmed' | 'failed';
    note?: string;
}): Promise<string | null> {
    return postChatMessage({
        channelId,
        senderWallet,
        senderName,
        content: `Sent ${amount} ${token} to ${recipientWallet.slice(0, 6)}...${recipientWallet.slice(-4)}`,
        messageType: 'tx_link',
        metadata: {
            amount,
            token,
            recipientWallet,
            senderWallet,
            txHash: txHash || null,
            status,
            note: note || null,
        },
    });
}
