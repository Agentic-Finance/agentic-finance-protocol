/**
 * Notification Service — Multi-Channel Notification Dispatch
 *
 * Fires on every stream event:
 *   1. Save to PostgreSQL (Notification model)
 *   2. Push via SSE event bus (POST to orchestrator)
 *   3. Webhook callback (if agent has webhookUrl)
 *
 * Usage:
 *   await notify({ wallet, type, title, message, streamJobId?, milestoneId? });
 */

import prisma from './prisma';

// ── Types ────────────────────────────────────────────────────

export type NotificationType =
  | 'stream:created'
  | 'stream:milestone_submitted'
  | 'stream:milestone_approved'
  | 'stream:milestone_rejected'
  | 'stream:completed'
  | 'stream:cancelled'
  | 'stream:timeout';

export interface NotifyPayload {
  wallet: string;
  type: NotificationType;
  title: string;
  message: string;
  streamJobId?: string;
  milestoneId?: string;
}

// ── SSE Push Config ──────────────────────────────────────────

const SSE_NOTIFY_URL = process.env.SSE_NOTIFY_URL || 'http://localhost:4200/api/notify';

// ── Core Function ────────────────────────────────────────────

/**
 * Dispatch a notification to all channels.
 * Non-blocking — errors are logged but don't throw.
 */
export async function notify(payload: NotifyPayload): Promise<string | null> {
  const { wallet, type, title, message, streamJobId, milestoneId } = payload;

  try {
    // 1. Persist to database
    const notification = await prisma.notification.create({
      data: {
        wallet: wallet.toLowerCase(),
        type,
        title,
        message,
        streamJobId: streamJobId || null,
        milestoneId: milestoneId || null,
      },
    });

    // 2. Push to SSE event bus (fire-and-forget)
    pushToSSE(payload).catch((err) =>
      console.warn('[notify] SSE push failed:', err.message)
    );

    // 3. Webhook callback (fire-and-forget)
    if (streamJobId) {
      fireWebhook(payload).catch((err) =>
        console.warn('[notify] Webhook failed:', err.message)
      );
    }

    console.log(`[notify] 🔔 ${type} → ${wallet.slice(0, 8)}... "${title}"`);
    return notification.id;
  } catch (error: any) {
    console.error('[notify] Failed to create notification:', error.message);
    return null;
  }
}

/**
 * Send notification to both parties (client + agent).
 */
export async function notifyBoth(
  clientWallet: string,
  agentWallet: string,
  payload: Omit<NotifyPayload, 'wallet'>,
): Promise<void> {
  await Promise.all([
    notify({ ...payload, wallet: clientWallet }),
    notify({ ...payload, wallet: agentWallet }),
  ]);
}

// ── SSE Push ─────────────────────────────────────────────────

async function pushToSSE(payload: NotifyPayload): Promise<void> {
  try {
    await fetch(SSE_NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: payload.type,
        data: {
          wallet: payload.wallet,
          title: payload.title,
          message: payload.message,
          streamJobId: payload.streamJobId,
          milestoneId: payload.milestoneId,
        },
      }),
    });
  } catch {
    // SSE server might not be running — that's OK
  }
}

// ── Webhook Callback ─────────────────────────────────────────

async function fireWebhook(payload: NotifyPayload): Promise<void> {
  if (!payload.streamJobId) return;

  try {
    // Look up the stream to find the agent, then check if agent has a webhook
    const stream = await prisma.streamJob.findUnique({
      where: { id: payload.streamJobId },
    });
    if (!stream) return;

    // Look up agent in marketplace to get webhookUrl
    const agent = await prisma.marketplaceAgent.findFirst({
      where: { ownerWallet: { equals: stream.agentWallet, mode: 'insensitive' } },
    });
    if (!agent?.webhookUrl) return;

    await fetch(agent.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: payload.type,
        title: payload.title,
        message: payload.message,
        streamJobId: payload.streamJobId,
        milestoneId: payload.milestoneId,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Webhook might be down — non-critical
  }
}

// ── Query Helpers ────────────────────────────────────────────

/**
 * Get notifications for a wallet.
 */
export async function getNotifications(
  wallet: string,
  options: { unreadOnly?: boolean; limit?: number; offset?: number } = {},
) {
  const { unreadOnly = false, limit = 50, offset = 0 } = options;

  const where: any = { wallet: wallet.toLowerCase() };
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { wallet: wallet.toLowerCase(), isRead: false },
    }),
  ]);

  return { notifications, total, unreadCount };
}

/**
 * Mark notifications as read.
 */
export async function markAsRead(
  wallet: string,
  ids?: string[],
): Promise<number> {
  if (ids && ids.length > 0) {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        wallet: wallet.toLowerCase(),
      },
      data: { isRead: true },
    });
    return result.count;
  }

  // Mark all as read
  const result = await prisma.notification.updateMany({
    where: { wallet: wallet.toLowerCase(), isRead: false },
    data: { isRead: true },
  });
  return result.count;
}
